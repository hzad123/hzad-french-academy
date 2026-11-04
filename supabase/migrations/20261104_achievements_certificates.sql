-- Additive, review before applying. Requires academy, placement and tracker migrations.
begin;
create schema academy_achievements;
revoke all on schema academy_achievements from public,anon,authenticated;
create table academy_achievements.config(id boolean primary key default true check(id),enabled_at timestamptz not null default now());
insert into academy_achievements.config default values;
create table academy_achievements.profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 timezone text not null default 'Etc/UTC',timezone_changed_at timestamptz not null default now(),
 certificate_name text not null default '',title text not null default 'French learner'
);
create table academy_achievements.xp(
 user_id uuid not null references auth.users(id) on delete cascade,event_key text not null,
 kind text not null check(kind in ('lesson','revision','certificate')),points integer not null check(points between 1 and 200),
 awarded_at timestamptz not null default now(),primary key(user_id,event_key)
);
create table academy_achievements.days(user_id uuid not null references auth.users(id) on delete cascade,study_date date not null,primary key(user_id,study_date));
create table academy_achievements.badges(user_id uuid not null references auth.users(id) on delete cascade,code text not null,awarded_at timestamptz not null default now(),primary key(user_id,code));
create table academy_achievements.questions(
 version text not null,level text not null check(level in ('A0','A1','A2','B1','B2','C1','C2')),
 position integer not null check(position between 1 and 12),id text not null,skill text not null check(skill in ('grammar','vocabulary','reading','listening')),
 prompt text not null,options jsonb not null check(jsonb_array_length(options)=4),answer integer not null check(answer between 0 and 3),audio_text text,
 primary key(version,level,position),unique(version,id)
);
create table academy_achievements.attempts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 level text not null check(level in ('A0','A1','A2','B1','B2','C1','C2')),version text not null default 'hzad-final-2026-11-v1',
 started_at timestamptz not null default now(),completed_at timestamptz,status text not null default 'active' check(status in ('active','completed','expired')),
 required_units jsonb not null,holder text not null,text_support boolean not null default false,
 next_position integer not null default 1 check(next_position between 1 and 13),answers jsonb not null default '{}',result jsonb
);
create unique index one_active_level_final on academy_achievements.attempts(user_id,level) where status='active';
create index final_attempt_history on academy_achievements.attempts(user_id,started_at desc);
create table academy_achievements.certificates(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 level text not null,version text not null,holder text not null,attempt_id uuid not null references academy_achievements.attempts(id),
 issued_at timestamptz not null default now(),scope text not null,lesson_count integer not null,score integer not null,
 revoked_at timestamptz,unique(user_id,level,version)
);
do $$declare t text;begin
 foreach t in array array['config','profiles','xp','days','badges','questions','attempts','certificates'] loop
  execute format('alter table academy_achievements.%I enable row level security',t);
 end loop;
end;$$;
revoke all on all tables in schema academy_achievements from public,anon,authenticated;

create function academy_achievements.identity() returns uuid language plpgsql stable security definer set search_path=''
as $$declare u uuid:=auth.uid();begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 return u;
end;$$;
create function academy_achievements.access() returns uuid language plpgsql stable security definer set search_path=''
as $$declare u uuid:=academy_achievements.identity();begin
 if not public.academy_has_access() then raise exception 'Active academy access required' using errcode='42501';end if;return u;
end;$$;
create function academy_achievements.award(p_user uuid,p_key text,p_kind text,p_points integer,p_activity boolean default false,p_at timestamptz default now()) returns void
language plpgsql security definer set search_path='' as $$declare tz text;begin
 insert into academy_achievements.profiles(user_id) values(p_user) on conflict do nothing;
 insert into academy_achievements.xp(user_id,event_key,kind,points) values(p_user,p_key,p_kind,p_points) on conflict do nothing;
 if p_activity then
  select timezone into tz from academy_achievements.profiles where user_id=p_user;
  insert into academy_achievements.days(user_id,study_date) values(p_user,(p_at at time zone tz)::date) on conflict do nothing;
 end if;
end;$$;
-- Additive triggers consume authoritative saved activity; no browser XP claims.
create function academy_achievements.on_lesson() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.completed and auth.uid()=new.user_id and exists(select 1 from auth.users where id=new.user_id and email_confirmed_at is not null) and public.academy_has_access() then
  perform academy_achievements.award(new.user_id,'lesson:'||new.unit_id,'lesson',50,true);
 end if;return new;
exception when others then
 -- Optional motivation must never prevent a normal lesson from saving.
 raise log 'Academy lesson reward recording failed: %',sqlstate;return new;
end;$$;
create trigger academy_lesson_reward after insert or update on public.academy_learning_progress for each row execute function academy_achievements.on_lesson();
create function academy_achievements.on_revision() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='UPDATE' and new.last_correct and new.wrong_count>0 and (not old.last_correct or old.due_at<=now()) and auth.uid()=new.user_id and public.academy_has_access() then
  perform academy_achievements.award(new.user_id,'revision:'||new.unit_id||':'||new.question_id,'revision',10,true);
 end if;return new;
exception when others then raise log 'Academy revision reward recording failed: %',sqlstate;return new;
end;$$;
create trigger academy_revision_reward after update on academy_tracker.evidence for each row execute function academy_achievements.on_revision();

create function academy_achievements.rewards(p_timezone text default null) returns jsonb language plpgsql security definer set search_path=''
as $$declare
 u uuid:=academy_achievements.access();profile academy_achievements.profiles;row record;
 xp integer;lessons integer;revisions integer;certs integer;today date;last_day date;streak integer:=0;longest integer:=0;
 definitions jsonb;item jsonb;badges jsonb:='[]';eligible boolean;
begin
 if p_timezone is not null and not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Unknown time zone';end if;
 insert into academy_achievements.profiles(user_id,timezone,certificate_name)
 select u,coalesce(p_timezone,'Etc/UTC'),left(btrim(coalesce(raw_user_meta_data->>'display_name','')),80) from auth.users where id=u on conflict do nothing;
 select * into profile from academy_achievements.profiles where user_id=u;
 -- Legacy completions earn XP without inventing historical learning days.
 for row in select p.unit_id,p.updated_at from public.academy_learning_progress p join public.academy_units a on a.id=p.unit_id and a.published where p.user_id=u and p.completed loop
  perform academy_achievements.award(u,'lesson:'||row.unit_id,'lesson',50,false);
  if row.updated_at>=(select enabled_at from academy_achievements.config) then
   insert into academy_achievements.days(user_id,study_date) values(u,(row.updated_at at time zone profile.timezone)::date) on conflict do nothing;
  end if;
 end loop;
 select coalesce(sum(points),0),count(*) filter(where kind='lesson'),count(*) filter(where kind='revision') into xp,lessons,revisions from academy_achievements.xp where user_id=u;
 select count(distinct level) into certs from academy_achievements.certificates where user_id=u and revoked_at is null;
 today:=(now() at time zone profile.timezone)::date;
 select max(study_date) into last_day from academy_achievements.days where user_id=u and study_date<=today;
 if last_day>=today-1 then
  while exists(select 1 from academy_achievements.days where user_id=u and study_date=last_day-streak) loop streak:=streak+1;end loop;
 end if;
 select coalesce(max(n),0) into longest from (select count(*) n from (select study_date-row_number() over(order by study_date)::integer as island from academy_achievements.days where user_id=u) d group by island) groups;
 definitions:=jsonb_build_array(
  jsonb_build_object('code','first-lesson','name','First steps','progress',lessons,'target',1),
  jsonb_build_object('code','five-lessons','name','Finding your rhythm','progress',lessons,'target',5),
  jsonb_build_object('code','twenty-five-lessons','name','Course explorer','progress',lessons,'target',25),
  jsonb_build_object('code','three-day-streak','name','Three-day spark','progress',longest,'target',3),
  jsonb_build_object('code','seven-day-streak','name','Weekly dedication','progress',longest,'target',7),
  jsonb_build_object('code','thirty-day-streak','name','Thirty-day momentum','progress',longest,'target',30),
  jsonb_build_object('code','first-revision','name','Learning from mistakes','progress',revisions,'target',1),
  jsonb_build_object('code','ten-revisions','name','Revision champion','progress',revisions,'target',10),
  jsonb_build_object('code','first-certificate','name','Level finisher','progress',certs,'target',1),
  jsonb_build_object('code','seven-certificates','name','Academy journey','progress',certs,'target',7));
 for item in select value from jsonb_array_elements(definitions) loop
  eligible:=(item->>'progress')::integer>=(item->>'target')::integer;
  if eligible then insert into academy_achievements.badges(user_id,code) values(u,item->>'code') on conflict do nothing;end if;
  badges:=badges||jsonb_build_array(item||jsonb_build_object('earned',exists(select 1 from academy_achievements.badges where user_id=u and code=item->>'code')));
 end loop;
 return jsonb_build_object('xp',xp,'rank',xp/250+1,'rankProgress',xp%250,'streak',streak,'longestStreak',longest,'studiedToday',last_day=today,
  'profile',jsonb_build_object('timezone',profile.timezone,'certificateName',profile.certificate_name,'title',profile.title),'badges',badges,
  'rewards',jsonb_build_array(jsonb_build_object('name','French learner','requiredXp',0),jsonb_build_object('name','Dedicated learner','requiredXp',250),jsonb_build_object('name','French explorer','requiredXp',1000),jsonb_build_object('name','Learning champion','requiredXp',2500)));
end;$$;
create function academy_achievements.preferences(p_timezone text,p_name text,p_title text) returns jsonb language plpgsql security definer set search_path=''
as $$declare u uuid:=academy_achievements.access();p academy_achievements.profiles;xp integer;threshold integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,41801));
 perform academy_achievements.rewards(p_timezone);
 select * into p from academy_achievements.profiles where user_id=u for update;
 if p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Unknown time zone';end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 80 or p_name~'[[:cntrl:]<>]' then raise exception 'Certificate name must contain 2–80 printable characters';end if;
 if p.timezone<>p_timezone and p.timezone_changed_at>now()-interval '30 days' and exists(select 1 from academy_achievements.days where user_id=u) then raise exception 'Time zone changes are limited to once every 30 days after study activity';end if;
 threshold:=case p_title when 'French learner' then 0 when 'Dedicated learner' then 250 when 'French explorer' then 1000 when 'Learning champion' then 2500 else null end;
 select coalesce(sum(points),0) into xp from academy_achievements.xp where user_id=u;
 if threshold is null or xp<threshold then raise exception 'This cosmetic title has not been unlocked';end if;
 update academy_achievements.profiles set timezone=p_timezone,certificate_name=btrim(p_name),title=p_title,
  timezone_changed_at=case when timezone<>p_timezone then now() else timezone_changed_at end where user_id=u;
 return academy_achievements.rewards();
end;$$;

create function academy_achievements.certificate_data(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=''
as $$declare u uuid:=academy_achievements.identity();c academy_achievements.certificates;begin
 select * into c from academy_achievements.certificates where id=p_id and user_id=u;
 if not found then raise exception 'Certificate not found' using errcode='42501';end if;
 return jsonb_build_object('id',c.id,'level',c.level,'holder',c.holder,'issuedAt',c.issued_at,'scope',c.scope,'lessonCount',c.lesson_count,'score',c.score,'version',c.version,'revoked',c.revoked_at is not null,'issuer','HZad Education');
end;$$;
create function academy_achievements.certificates() returns jsonb language plpgsql security definer set search_path=''
as $$declare u uuid:=academy_achievements.access();levels jsonb;certs jsonb;begin
 select jsonb_agg(jsonb_build_object('level',l.level,'total',l.total,'ready',l.ready,'eligible',l.total>0 and l.total=l.ready,'nextUnit',l.next_unit) order by l.level) into levels from (
  select names.level,count(a.id) as total,count(a.id) filter(where p.completed and p.best_percent>=70) as ready,
   (array_agg(a.id order by a.position) filter(where not coalesce(p.completed and p.best_percent>=70,false)))[1] as next_unit
  from unnest(array['A0','A1','A2','B1','B2','C1','C2']) names(level) left join public.academy_units a on a.level=names.level and a.published
  left join public.academy_learning_progress p on p.unit_id=a.id and p.user_id=u group by names.level
 ) l;
 select coalesce(jsonb_agg(academy_achievements.certificate_data(id) order by issued_at desc),'[]') into certs from academy_achievements.certificates where user_id=u;
 return jsonb_build_object('levels',levels,'certificates',certs,'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'level',h.level,'status',h.status,'startedAt',h.started_at) order by h.started_at desc),'[]') from (select id,level,status,started_at from academy_achievements.attempts where user_id=u order by started_at desc limit 20) h),'name',coalesce((select certificate_name from academy_achievements.profiles where user_id=u),''));
end;$$;

create function academy_achievements.exam_state(p_attempt uuid) returns jsonb language plpgsql security definer set search_path=''
as $$declare u uuid:=academy_achievements.access();a academy_achievements.attempts;q academy_achievements.questions;begin
 select * into a from academy_achievements.attempts where id=p_attempt and user_id=u;
 if not found then raise exception 'Assessment not found' using errcode='42501';end if;
 if a.status='active' and a.started_at<now()-interval '7 days' then update academy_achievements.attempts set status='expired' where id=a.id;a.status:='expired';end if;
 if a.status='active' then select * into strict q from academy_achievements.questions where version=a.version and level=a.level and position=a.next_position;end if;
 return jsonb_build_object('id',a.id,'level',a.level,'version',a.version,'status',a.status,'answered',a.next_position-1,'total',12,'textSupport',a.text_support,'result',a.result,
  'question',case when q.id is null then null else jsonb_build_object('id',q.id,'skill',q.skill,'prompt',q.prompt,'options',q.options,'audioText',q.audio_text) end);
end;$$;
create function academy_achievements.exam_start(p_level text,p_text_support boolean default false) returns jsonb language plpgsql security definer set search_path=''
as $$declare u uuid:=academy_achievements.access();required jsonb;holder text;a uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,41802));
 if p_level is null or p_level not in ('A0','A1','A2','B1','B2','C1','C2') or p_text_support is null then raise exception 'Invalid assessment selection';end if;
 update academy_achievements.attempts set status='expired' where user_id=u and status='active' and started_at<now()-interval '7 days';
 select id into a from academy_achievements.attempts where user_id=u and level=p_level and status='active';
 if a is not null then return academy_achievements.exam_state(a);end if;
 if (select count(*) from academy_achievements.attempts where user_id=u and started_at>now()-interval '24 hours')>=3 then raise exception 'Three new final assessments per 24 hours. Resume a saved attempt or return later.';end if;
 select certificate_name into holder from academy_achievements.profiles where user_id=u;
 if holder is null or length(btrim(holder))<2 or holder~'[[:cntrl:]<>]' then raise exception 'Save your certificate name in Achievements settings first';end if;
 select jsonb_agg(a.id order by a.position) into required from public.academy_units a where a.level=p_level and a.published;
 if required is null or exists(select 1 from jsonb_array_elements_text(required) ids(id) left join public.academy_learning_progress p on p.unit_id=ids.id and p.user_id=u where p.unit_id is null or not p.completed or p.best_percent<70) then raise exception 'Complete every published lesson at this level with a quiz score of at least 70%%';end if;
 if (select count(*) from academy_achievements.questions where version='hzad-final-2026-11-v1' and level=p_level)<>12 then raise exception 'Assessment bank is unavailable';end if;
 insert into academy_achievements.attempts(user_id,level,required_units,holder,text_support) values(u,p_level,required,holder,p_text_support) returning id into a;
 return academy_achievements.exam_state(a);
end;$$;
create function academy_achievements.exam_answer(p_attempt uuid,p_question text,p_choice integer,p_transcript boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare
 u uuid:=academy_achievements.access();a academy_achievements.attempts;q academy_achievements.questions;
 v_answers jsonb;v_skill text;n integer;c integer;total integer:=0;passed boolean:=true;scores jsonb:='{}';percent integer;cert uuid;scope text;
begin
 select * into a from academy_achievements.attempts where id=p_attempt and user_id=u for update;
 if not found then raise exception 'Assessment not found' using errcode='42501';end if;
 if p_choice is null or p_choice not between 0 and 3 or p_transcript is null then raise exception 'Invalid assessment answer';end if;
 if a.answers ? p_question then
  if (a.answers->p_question->>'choice')::integer=p_choice and (a.answers->p_question->>'transcript')::boolean=p_transcript then return academy_achievements.exam_state(a.id);end if;
  raise exception 'This answer has already been recorded';
 end if;
 if a.status<>'active' or a.started_at<now()-interval '7 days' then raise exception 'Assessment is not active';end if;
 select * into q from academy_achievements.questions where version=a.version and level=a.level and position=a.next_position and id=p_question;
 if not found then raise exception 'Question is not eligible';end if;
 if p_transcript and q.skill<>'listening' then raise exception 'Transcript applies only to listening items';end if;
 a.text_support:=a.text_support or p_transcript;
 v_answers:=a.answers||jsonb_build_object(p_question,jsonb_build_object('choice',p_choice,'transcript',p_transcript));
 if a.next_position=12 then
  foreach v_skill in array array['grammar','vocabulary','reading','listening'] loop
   if v_skill='listening' and a.text_support then continue;end if;
   select count(*),count(*) filter(where (v_answers->bank.id->>'choice')::integer=bank.answer) into n,c
    from academy_achievements.questions bank where bank.version=a.version and bank.level=a.level
    and (bank.skill=v_skill or (a.text_support and v_skill='reading' and bank.skill='listening')) and v_answers ? bank.id;
   passed:=passed and n>=3 and c*3>=n*2;total:=total+c;
   scores:=scores||jsonb_build_object(v_skill,jsonb_build_object('correct',c,'total',n));
  end loop;
  percent:=round(100.0*total/12);passed:=passed and percent>=80;
  if exists(select 1 from jsonb_array_elements_text(a.required_units) ids(id) left join public.academy_learning_progress p on p.unit_id=ids.id and p.user_id=u where p.unit_id is null or not p.completed or p.best_percent<70) then raise exception 'Course completion requirements changed; review your lessons before finishing';end if;
  scope:=case when a.text_support then 'Grammar, vocabulary and reading (text-supported assessment)' else 'Grammar, vocabulary, reading and listening (device speech synthesis)' end;
  if passed then
   insert into academy_achievements.certificates(user_id,level,version,holder,attempt_id,scope,lesson_count,score)
    values(u,a.level,a.version,a.holder,a.id,scope,jsonb_array_length(a.required_units),percent) on conflict(user_id,level,version) do nothing;
   select id into cert from academy_achievements.certificates where user_id=u and level=a.level and version=a.version and revoked_at is null;
   if cert is not null then perform academy_achievements.award(u,'certificate:'||a.level||':'||a.version,'certificate',200,true);end if;
  else
   insert into academy_achievements.days(user_id,study_date) select u,(now() at time zone timezone)::date from academy_achievements.profiles where user_id=u on conflict do nothing;
  end if;
  a.status:='completed';
 end if;
 update academy_achievements.attempts set answers=v_answers,text_support=a.text_support,next_position=a.next_position+1,status=a.status,
  completed_at=case when a.status='completed' then now() end,
  result=case when a.status='completed' then jsonb_build_object('passed',passed,'percent',percent,'skills',scores,'scope',scope,'certificateId',cert) else null end where id=a.id;
 return academy_achievements.exam_state(a.id);
end;$$;
create function academy_achievements.verify(p_id uuid,p_holder text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('valid',true,'level',level,'issuedAt',issued_at,'scope',scope,'score',score,'lessonCount',lesson_count,'version',version,'issuer','HZad Education','notice','HZad course completion, not official CEFR certification')
  from academy_achievements.certificates where id=p_id and revoked_at is null and lower(holder)=lower(btrim(p_holder))),' {"valid":false}'::jsonb);
$$;

create function public.academy_rewards_state(p_timezone text default null) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.rewards(p_timezone)$$;
create function public.academy_rewards_preferences(p_timezone text,p_name text,p_title text) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.preferences(p_timezone,p_name,p_title)$$;
create function public.academy_certificates_state() returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.certificates()$$;
create function public.academy_certificate_get(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.certificate_data(p_id)$$;
create function public.academy_final_state(p_attempt uuid) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.exam_state(p_attempt)$$;
create function public.academy_final_start(p_level text,p_text_support boolean default false) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.exam_start(p_level,p_text_support)$$;
create function public.academy_final_answer(p_attempt uuid,p_question text,p_choice integer,p_transcript boolean default false) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.exam_answer(p_attempt,p_question,p_choice,p_transcript)$$;
create function public.academy_certificate_verify(p_id uuid,p_holder text) returns jsonb language sql security invoker set search_path='' as $$select academy_achievements.verify(p_id,p_holder)$$;
revoke all on all functions in schema academy_achievements from public,anon,authenticated;
grant usage on schema academy_achievements to authenticated,anon;
grant execute on function academy_achievements.rewards(text),academy_achievements.preferences(text,text,text),academy_achievements.certificates(),academy_achievements.certificate_data(uuid),academy_achievements.exam_state(uuid),academy_achievements.exam_start(text,boolean),academy_achievements.exam_answer(uuid,text,integer,boolean) to authenticated;
grant execute on function academy_achievements.verify(uuid,text) to authenticated,anon;
revoke all on function public.academy_rewards_state(text),public.academy_rewards_preferences(text,text,text),public.academy_certificates_state(),public.academy_certificate_get(uuid),public.academy_final_state(uuid),public.academy_final_start(text,boolean),public.academy_final_answer(uuid,text,integer,boolean),public.academy_certificate_verify(uuid,text) from public,anon,authenticated;
grant execute on function public.academy_rewards_state(text),public.academy_rewards_preferences(text,text,text),public.academy_certificates_state(),public.academy_certificate_get(uuid),public.academy_final_state(uuid),public.academy_final_start(text,boolean),public.academy_final_answer(uuid,text,integer,boolean) to authenticated;
grant execute on function public.academy_certificate_verify(uuid,text) to anon,authenticated;

-- BEGIN VERSIONED FINAL BANK (generated; never bundled for the browser)
insert into academy_achievements.questions(version,level,position,id,skill,prompt,options,answer,audio_text) values
('hzad-final-2026-11-v1','A0','1','final-v1-A0-1','grammar','Elle ___ professeur.','["sont","est","sommes","êtes"]','1',null),
('hzad-final-2026-11-v1','A0','2','final-v1-A0-2','grammar','J’ai ___ sœur.','["un","des","une","le"]','2',null),
('hzad-final-2026-11-v1','A0','3','final-v1-A0-3','grammar','Tu ___ un stylo ?','["as","a","avons","ont"]','0',null),
('hzad-final-2026-11-v1','A0','4','final-v1-A0-4','vocabulary','Which word means ‘water’?','["Le feu","Le vent","Le sol","L’eau"]','3',null),
('hzad-final-2026-11-v1','A0','5','final-v1-A0-5','vocabulary','Which word names a family member?','["Chaise","Frère","Rue","Fenêtre"]','1',null),
('hzad-final-2026-11-v1','A0','6','final-v1-A0-6','vocabulary','‘À demain’ means…','["See you tomorrow","Good night","Thank you","Welcome"]','0',null),
('hzad-final-2026-11-v1','A0','7','final-v1-A0-7','reading','« Je suis Nora. J’ai un chat blanc. » Quel animal a Nora ?','["Un chien","Un oiseau","Un chat","Un cheval"]','2',null),
('hzad-final-2026-11-v1','A0','8','final-v1-A0-8','reading','« Paul : un thé. Ana : un jus. » Que boit Ana ?','["Du lait","Du café","De l’eau","Un jus"]','3',null),
('hzad-final-2026-11-v1','A0','9','final-v1-A0-9','reading','« Boutique fermée dimanche. » Quel jour est indiqué ?','["Dimanche","Mardi","Jeudi","Vendredi"]','0',null),
('hzad-final-2026-11-v1','A0','10','final-v1-A0-10','listening','Quelle couleur entendez-vous ?','["Rouge","Vert","Noir","Jaune"]','1','Mon sac est vert.'),
('hzad-final-2026-11-v1','A0','11','final-v1-A0-11','listening','Quel âge a la personne ?','["Dix ans","Douze ans","Vingt ans","Trente ans"]','2','Bonjour, j’ai vingt ans.'),
('hzad-final-2026-11-v1','A0','12','final-v1-A0-12','listening','Quel aliment est demandé ?','["Du pain","Du riz","Du fromage","Une pomme"]','0','Une baguette de pain, s’il vous plaît.'),
('hzad-final-2026-11-v1','A1','1','final-v1-A1-1','grammar','Vous ___ français à l’école.','["parle","parlons","parlent","parlez"]','3',null),
('hzad-final-2026-11-v1','A1','2','final-v1-A1-2','grammar','Il va ___ cinéma le samedi.','["à la","au","aux","à les"]','1',null),
('hzad-final-2026-11-v1','A1','3','final-v1-A1-3','grammar','Ces fleurs sont ___ belles.','["très","beaucoup","bien de","trop de"]','0',null),
('hzad-final-2026-11-v1','A1','4','final-v1-A1-4','vocabulary','Pour se laver les mains, on utilise…','["un billet","une enveloppe","du savon","un cahier"]','2',null),
('hzad-final-2026-11-v1','A1','5','final-v1-A1-5','vocabulary','Quel mot désigne un moyen de transport ?','["L’assiette","Le vélo","Le manteau","La tasse"]','1',null),
('hzad-final-2026-11-v1','A1','6','final-v1-A1-6','vocabulary','Le repas pris le matin est…','["le dîner","le goûter","le dessert","le petit-déjeuner"]','3',null),
('hzad-final-2026-11-v1','A1','7','final-v1-A1-7','reading','« La pharmacie est en face de la poste, à côté du cinéma. » Qu’y a-t-il en face de la pharmacie ?','["La gare","L’école","La poste","Le parc"]','2',null),
('hzad-final-2026-11-v1','A1','8','final-v1-A1-8','reading','« Salut Sami, le pique-nique est samedi à midi. Apporte une bouteille d’eau. — Elsa » Que doit apporter Sami ?','["De l’eau","Un ballon","Une couverture","Du café"]','0',null),
('hzad-final-2026-11-v1','A1','9','final-v1-A1-9','reading','« Deux entrées adultes : 16 €. Les enfants ne paient pas. » Combien paie un adulte accompagné d’un enfant ?','["16 €","24 €","0 €","8 €"]','3',null),
('hzad-final-2026-11-v1','A1','10','final-v1-A1-10','listening','À quelle heure ouvre le magasin ?','["Huit heures","Dix heures","Midi","Quatorze heures"]','1','Le magasin ouvre à dix heures et ferme à dix-huit heures.'),
('hzad-final-2026-11-v1','A1','11','final-v1-A1-11','listening','Où travaille la personne ?','["À l’hôpital","À la gare","À l’hôtel","À la banque"]','2','Je travaille dans un hôtel. Je prépare les chambres.'),
('hzad-final-2026-11-v1','A1','12','final-v1-A1-12','listening','Quel est le temps annoncé ?','["Il neige","Il pleut","Il fait très chaud","Il y a du soleil"]','1','Prends ton parapluie : il pleut ce matin.'),
('hzad-final-2026-11-v1','A2','1','final-v1-A2-1','grammar','Elle ___ ses devoirs avant de sortir hier.','["a fini","est fini","finir","as fini"]','0',null),
('hzad-final-2026-11-v1','A2','2','final-v1-A2-2','grammar','Nous avons acheté des pommes. Nous ___ mangeons deux.','["y","les","en","leur"]','2',null),
('hzad-final-2026-11-v1','A2','3','final-v1-A2-3','grammar','Quand il faisait beau, nous ___ souvent dehors.','["avons jouer","jouions","jouerons hier","sommes joué"]','1',null),
('hzad-final-2026-11-v1','A2','4','final-v1-A2-4','vocabulary','Une chambre ‘disponible’ peut être…','["réparée uniquement","visitée seulement le soir","déjà occupée","réservée maintenant"]','3',null),
('hzad-final-2026-11-v1','A2','5','final-v1-A2-5','vocabulary','Une ‘ordonnance’ est un document donné par…','["un médecin","un boulanger","un chauffeur","un libraire"]','0',null),
('hzad-final-2026-11-v1','A2','6','final-v1-A2-6','vocabulary','‘Emprunter un livre’ signifie…','["le vendre","le garder définitivement","le prendre pour le rendre ensuite","l’écrire"]','2',null),
('hzad-final-2026-11-v1','A2','7','final-v1-A2-7','reading','« Pour économiser l’eau, la piscine sera fermée le lundi pendant tout le mois d’août. Les autres jours restent inchangés. » Quand peut-on y aller selon l’horaire habituel ?','["Tous les lundis","Le mardi","Uniquement en septembre","Aucun jour"]','1',null),
('hzad-final-2026-11-v1','A2','8','final-v1-A2-8','reading','« J’ai oublié mon écharpe dans le train de 15 h. Elle est rouge et porte mes initiales, ML. » Que décrit le message ?','["Un achat prévu","Un changement d’horaire","Un billet perdu","Un objet perdu"]','3',null),
('hzad-final-2026-11-v1','A2','9','final-v1-A2-9','reading','« Le stage commence le 3 juin. Envoyez votre dossier au plus tard dix jours avant cette date. » Le dossier doit arriver…','["avant le début du stage","le dernier jour du stage","après le 3 juin","seulement en juillet"]','0',null),
('hzad-final-2026-11-v1','A2','10','final-v1-A2-10','listening','Quel service la voisine propose-t-elle ?','["Promener le chien","Faire les courses","Arroser les plantes","Réparer une porte"]','2','Pendant tes vacances, je peux passer chez toi pour arroser les plantes. Laisse-moi simplement tes clés.'),
('hzad-final-2026-11-v1','A2','11','final-v1-A2-11','listening','Pourquoi la personne appelle-t-elle ?','["Pour annuler le voyage","Pour modifier une réservation","Pour commander un taxi","Pour signaler un bagage perdu"]','1','J’ai réservé une table pour quatre vendredi, mais nous serons finalement six. Pouvez-vous changer la réservation ?'),
('hzad-final-2026-11-v1','A2','12','final-v1-A2-12','listening','Que faut-il faire avant la visite ?','["Téléphoner au guide","Acheter un repas","Envoyer une photo","Réserver sa place en ligne"]','3','La visite est gratuite, mais le nombre de places est limité. Il faut donc réserver sur notre site avant de venir.'),
('hzad-final-2026-11-v1','B1','1','final-v1-B1-1','grammar','Il faut que vous ___ votre demande avant vendredi.','["envoyez","enverrez","enverriez","envoyiez"]','3',null),
('hzad-final-2026-11-v1','B1','2','final-v1-B1-2','grammar','Lorsque nous sommes arrivés, le film ___ déjà commencé.','["est","avait","aura","serait"]','1',null),
('hzad-final-2026-11-v1','B1','3','final-v1-B1-3','grammar','Elle cherche un appartement ___ le loyer soit raisonnable.','["dont","que","où il","qui le"]','0',null),
('hzad-final-2026-11-v1','B1','4','final-v1-B1-4','vocabulary','‘Faire face à une difficulté’, c’est…','["l’oublier volontairement","la transmettre sans agir","l’affronter","la prévoir exactement"]','2',null),
('hzad-final-2026-11-v1','B1','5','final-v1-B1-5','vocabulary','Une dépense ‘imprévue’ est une dépense…','["interdite par la loi","qui n’était pas anticipée","payée deux fois","toujours inutile"]','1',null),
('hzad-final-2026-11-v1','B1','6','final-v1-B1-6','vocabulary','‘Se mettre d’accord’ signifie…','["éviter toute discussion","changer de lieu","rester sans avis","trouver une décision commune"]','3',null),
('hzad-final-2026-11-v1','B1','7','final-v1-B1-7','reading','« Pour limiter le bruit, la résidence autorise les travaux de 9 h à 17 h en semaine. Le samedi, seuls les travaux silencieux sont permis. » Que peut-on faire le samedi ?','["Utiliser une perceuse toute la journée","Commencer des travaux bruyants à 8 h","Effectuer un travail qui ne fait pas de bruit","Organiser un chantier nocturne"]','2',null),
('hzad-final-2026-11-v1','B1','8','final-v1-B1-8','reading','« Fatima aime son nouveau poste, mais les horaires changent chaque semaine. Elle demande à recevoir le planning quinze jours à l’avance afin d’organiser la garde de son fils. » Quel est son objectif ?','["Mieux prévoir son organisation familiale","Quitter immédiatement son poste","Travailler uniquement la nuit","Réduire le nombre de clients"]','0',null),
('hzad-final-2026-11-v1','B1','9','final-v1-B1-9','reading','« L’atelier est gratuit pour les adhérents. Les autres participants paient 12 €. Une inscription est obligatoire pour tous. » Quelle règle s’applique aux adhérents ?','["Ils doivent payer 12 €","Ils ne peuvent pas participer","Ils peuvent venir sans prévenir","Ils doivent s’inscrire même sans payer"]','3',null),
('hzad-final-2026-11-v1','B1','10','final-v1-B1-10','listening','Que décide le groupe ?','["Renoncer à tout déplacement","Prendre le train plus tôt","Louer deux voitures","Reporter au mois suivant"]','1','Le train de neuf heures est complet. Celui de huit heures a encore des places. Cela nous fera partir plus tôt, mais nous garderons notre journée sur place. Prenons-le.'),
('hzad-final-2026-11-v1','B1','11','final-v1-B1-11','listening','Quelle aide est demandée ?','["Une relecture du rapport","Un nouveau budget","Une salle plus grande","Une formation technique"]','0','J’ai terminé le rapport, mais je ne suis pas sûr que la conclusion soit assez claire. Pourrais-tu la relire avant que je l’envoie ?'),
('hzad-final-2026-11-v1','B1','12','final-v1-B1-12','listening','Pourquoi l’intervenante hésite-t-elle ?','["Elle n’aime pas le quartier","Le projet est déjà abandonné","Elle veut connaître le coût réel","Elle refuse toute consultation"]','2','Le jardin partagé serait une bonne idée pour le quartier. Avant de voter, j’aimerais pourtant savoir qui paiera l’entretien et combien cela coûtera chaque année.'),
('hzad-final-2026-11-v1','B2','1','final-v1-B2-1','grammar','À moins que le client ne ___ d’avis, nous signerons demain.','["changera","change","changerait","a changé"]','1',null),
('hzad-final-2026-11-v1','B2','2','final-v1-B2-2','grammar','Elle a posé ces questions pour que chacun ___ s’exprimer.','["peut","pourra","pouvait","puisse"]','3',null),
('hzad-final-2026-11-v1','B2','3','final-v1-B2-3','grammar','Les lettres que nous nous sommes ___ restent précieuses.','["écrites","écrit","écrire","écrivant"]','0',null),
('hzad-final-2026-11-v1','B2','4','final-v1-B2-4','vocabulary','Une ‘marge de manœuvre’ désigne…','["un bord de page","un défaut de construction","une possibilité d’action ou d’adaptation","une obligation sans choix"]','2',null),
('hzad-final-2026-11-v1','B2','5','final-v1-B2-5','vocabulary','‘Remettre en cause une hypothèse’ consiste à…','["la publier à nouveau","en contester la validité","la considérer comme certaine","en cacher l’existence"]','1',null),
('hzad-final-2026-11-v1','B2','6','final-v1-B2-6','vocabulary','Une mesure ‘pérenne’ vise un effet…','["immédiat et unique","strictement symbolique","impossible à constater","durable"]','3',null),
('hzad-final-2026-11-v1','B2','7','final-v1-B2-7','reading','« L’installation de caméras peut faciliter certaines enquêtes. En déduire qu’elle prévient nécessairement les délits serait toutefois confondre l’identification après les faits et la prévention. L’évaluation doit distinguer ces objectifs. » Quelle confusion est critiquée ?','["L’amalgame entre élucidation et dissuasion","L’opposition entre deux quartiers","Le manque de caméras anciennes","La distinction entre plusieurs objectifs"]','0',null),
('hzad-final-2026-11-v1','B2','8','final-v1-B2-8','reading','« La fréquentation de la médiathèque a augmenté après l’ouverture dominicale. Cependant, le nombre de visites par personne a aussi progressé : on ne sait donc pas encore si de nouveaux publics ont été touchés. » Quelle donnée manque ?','["Le prix des livres","Le nombre de dimanches dans l’année","Le nombre de nouveaux usagers distincts","La couleur du bâtiment"]','2',null),
('hzad-final-2026-11-v1','B2','9','final-v1-B2-9','reading','« Une prime uniforme paraît simple et équitable. Elle peut néanmoins favoriser les équipes déjà bien équipées, dont les résultats sont plus faciles à atteindre. Une règle identique n’efface pas les inégalités de départ. » Quel principe est défendu ?','["Toute prime est inefficace","L’égalité des règles ne garantit pas l’équité des effets","Les équipements n’influencent jamais les résultats","Les règles devraient rester secrètes"]','1',null),
('hzad-final-2026-11-v1','B2','10','final-v1-B2-10','listening','Quel risque est souligné ?','["L’absence totale de candidats","Le coût des transports","Le nombre insuffisant de réunions","Le transfert de la charge sur les salariés"]','3','Réduire les délais de réponse est souhaitable. Mais si les effectifs restent identiques, cet engagement pourrait simplement déplacer la pression vers les salariés, au détriment de la qualité.'),
('hzad-final-2026-11-v1','B2','11','final-v1-B2-11','listening','Que propose l’intervenante pour juger la mesure ?','["Comparer plusieurs indicateurs et publics","Se fier uniquement aux avis positifs","Supprimer toute enquête","Compter seulement les inscriptions"]','0','Les inscriptions ont doublé, ce qui est encourageant. Vérifions aussi l’assiduité, les abandons et les profils des participants : ces indicateurs diront mieux si le dispositif atteint son public.'),
('hzad-final-2026-11-v1','B2','12','final-v1-B2-12','listening','Quelle position exprime l’orateur ?','["Une opposition à toute réglementation","Une certitude que le marché résoudra tout","Un soutien assorti d’une condition de contrôle","Une demande de suppression du projet"]','2','J’approuve le principe de cette aide, à condition que ses résultats soient publiés et contrôlés. Sans transparence, il sera difficile de distinguer les effets annoncés des effets réels.'),
('hzad-final-2026-11-v1','C1','1','final-v1-C1-1','grammar','Pour peu que l’on ___ les critères, la conclusion devient discutable.','["examine","examinera","examinait demain","a examiné"]','0',null),
('hzad-final-2026-11-v1','C1','2','final-v1-C1-2','grammar','Il est loin d’être acquis que cette solution ___ durable.','["est","sera certainement","soit","serait forcément"]','2',null),
('hzad-final-2026-11-v1','C1','3','final-v1-C1-3','grammar','La responsable s’est ___ compte des limites du dispositif.','["rendue","rendu","rendus","rendant"]','1',null),
('hzad-final-2026-11-v1','C1','4','final-v1-C1-4','vocabulary','‘Prêter le flanc à la critique’ signifie…','["refuser toute objection","changer publiquement de camp","renoncer à argumenter","s’exposer à des objections justifiées ou possibles"]','3',null),
('hzad-final-2026-11-v1','C1','5','final-v1-C1-5','vocabulary','Une interprétation ‘tendancieuse’ est…','["orientée de façon partiale","strictement littérale","forcément provisoire","dénuée de tout point de vue"]','0',null),
('hzad-final-2026-11-v1','C1','6','final-v1-C1-6','vocabulary','‘Circonscrire un problème’, c’est…','["le rendre insoluble","l’abandonner","en délimiter le champ","l’attribuer sans preuve"]','2',null),
('hzad-final-2026-11-v1','C1','7','final-v1-C1-7','reading','« On nous invite à célébrer l’abondance des informations disponibles. Encore faudrait-il distinguer l’accès matériel aux données de la capacité à les interpréter. Sans médiation, cette profusion risque moins de démocratiser le savoir que d’avantager ceux qui maîtrisent déjà ses codes. » Quelle condition manque à la promesse de démocratisation ?','["Une réduction de toute publication","Un accompagnement permettant l’interprétation","La suppression des données complexes","L’interdiction des outils numériques"]','1',null),
('hzad-final-2026-11-v1','C1','8','final-v1-C1-8','reading','« La concertation n’a rien d’un obstacle si elle intervient alors que plusieurs options demeurent réellement ouvertes. Organisée après les arbitrages décisifs, elle se réduit en revanche à demander aux citoyens d’approuver ce qu’ils ne peuvent plus infléchir. » Quel critère distingue une participation effective ?','["Le nombre de pages du compte rendu","La durée de la communication officielle","L’unanimité préalable des participants","La possibilité d’agir sur une décision encore ouverte"]','3',null),
('hzad-final-2026-11-v1','C1','9','final-v1-C1-9','reading','« L’auteur ne nie pas l’utilité des classements. Il leur reproche de transformer un instrument de comparaison en définition exhaustive de la qualité. Ce déplacement, discret mais décisif, conduit les institutions à optimiser leur rang plutôt que leur mission. » Quel mécanisme est décrit ?','["Un indicateur qui finit par remplacer la finalité qu’il devait servir","La disparition de toute compétition","Une amélioration automatique des missions","Un classement dépourvu de tout effet"]','0',null),
('hzad-final-2026-11-v1','C1','10','final-v1-C1-10','listening','Quelle réserve porte sur le consensus annoncé ?','["Il interdit toute consultation future","Il manque de soutien médiatique","Il pourrait masquer des désaccords sur les moyens","Il porte seulement sur le calendrier"]','2','Tout le monde s’accorde à vouloir un service plus accessible. Ce consensus sur la finalité ne doit pourtant pas masquer les divergences sur le financement et la répartition des responsabilités.'),
('hzad-final-2026-11-v1','C1','11','final-v1-C1-11','listening','Que remet en question l’intervenante ?','["La nécessité de lire les textes","L’équivalence entre conformité administrative et qualité du service","L’existence des obligations légales","Le droit des usagers à être informés"]','1','Remplir chaque formulaire peut attester que la procédure a été suivie. Cela ne dit pas encore si l’usager a été compris ni si une réponse pertinente lui a été apportée.'),
('hzad-final-2026-11-v1','C1','12','final-v1-C1-12','listening','Comment comprendre la proposition finale ?','["Comme un refus de tout changement","Comme une invitation à imposer un modèle unique","Comme une préférence pour l’inaction","Comme une expérimentation évaluée et révisable"]','3','Nous n’avons pas besoin d’une nouvelle solution universelle. Donnons plutôt à quelques équipes les moyens d’essayer, rendons leurs résultats discutables publiquement et gardons la possibilité de corriger le dispositif.'),
('hzad-final-2026-11-v1','C2','1','final-v1-C2-1','grammar','Si convaincant que ___ ce plaidoyer, il laisse une objection entière.','["est","sera","soit","serait"]','2',null),
('hzad-final-2026-11-v1','C2','2','final-v1-C2-2','grammar','Ils se sont ___ leurs erreurs sans pour autant les oublier.','["pardonnées","pardonné","pardonnés","pardonnant"]','1',null),
('hzad-final-2026-11-v1','C2','3','final-v1-C2-3','grammar','À peine ___-il achevé son intervention que les objections fusèrent.','["eut","ait","aurait","eût"]','0',null),
('hzad-final-2026-11-v1','C2','4','final-v1-C2-4','vocabulary','Une formule ‘lapidaire’ se caractérise par…','["une hésitation constante","une longue digression","une absence de sens","sa brièveté frappante"]','3',null),
('hzad-final-2026-11-v1','C2','5','final-v1-C2-5','vocabulary','‘Faire litière d’un principe’ signifie…','["le présenter sous une forme élégante","le traiter avec mépris ou l’écarter","le préciser soigneusement","en démontrer l’origine historique"]','1',null),
('hzad-final-2026-11-v1','C2','6','final-v1-C2-6','vocabulary','Un argument ‘spécieux’ est…','["évidemment absurde dès sa formulation","nécessairement mathématique","séduisant en apparence mais trompeur","universellement admis à juste titre"]','2',null),
('hzad-final-2026-11-v1','C2','7','final-v1-C2-7','reading','« Le bilan promet une transparence totale : chaque opération est détaillée dans une annexe dont la technicité décourage toute lecture profane. L’opacité n’a pas disparu ; elle a seulement quitté le secret pour trouver refuge dans l’exhaustivité. » Quelle critique la dernière phrase condense-t-elle ?','["L’accumulation d’informations peut rendre le contrôle effectif impossible","Tout détail technique devrait être supprimé","La transparence implique nécessairement le secret","Les annexes ne contiennent jamais d’informations utiles"]','0',null),
('hzad-final-2026-11-v1','C2','8','final-v1-C2-8','reading','« On lui sait gré d’avoir renoncé à l’infaillibilité, moins toutefois par modestie que pour soustraire ses prévisions à l’épreuve des faits : puisqu’elles ne prétendent plus être certaines, aucune erreur ne saurait désormais les atteindre. » Quelle stratégie est mise en cause ?','["Une recherche honnête de falsification","Une reconnaissance précise des erreurs passées","Une défense fondée sur de nouvelles données","L’usage de l’incertitude comme immunité contre la réfutation"]','3',null),
('hzad-final-2026-11-v1','C2','9','final-v1-C2-9','reading','« La fidélité à une tradition ne se mesure peut-être pas au nombre de ses formes que l’on reproduit, mais à l’exigence que l’on maintient lorsqu’on en invente de nouvelles. L’imitation scrupuleuse peut alors devenir la plus commode des infidélités. » Comment comprendre cette dernière proposition ?','["Toute innovation trahit par définition le passé","Reproduire les apparences peut dispenser de respecter l’esprit d’une tradition","La forme et l’exigence sont toujours identiques","La tradition interdit toute interprétation"]','1',null),
('hzad-final-2026-11-v1','C2','10','final-v1-C2-10','listening','Quel effet produit la remarque finale ?','["Une confirmation littérale du succès","Une explication chronologique neutre","Un renversement ironique de l’éloge initial","Une demande de précision statistique"]','2','L’administration se félicite d’avoir simplifié les démarches. Il faut désormais trois attestations pour prouver que l’on est dispensé d’en fournir une. On conviendra que le progrès est considérable.'),
('hzad-final-2026-11-v1','C2','11','final-v1-C2-11','listening','Quelle distinction structure le raisonnement ?','["L’accord obtenu et les conditions dans lesquelles il peut être contesté","Le passé et le futur grammatical","La parole spontanée et la lecture à voix haute","Le calcul exact et l’approximation numérique"]','0','Un accord n’acquiert pas sa légitimité du seul fait qu’il rassemble. Il faut encore que ceux qu’il engage puissent en examiner les raisons et en discuter les termes sans que leur désaccord les disqualifie d’avance.'),
('hzad-final-2026-11-v1','C2','12','final-v1-C2-12','listening','Quelle est la cible implicite de la critique ?','["L’exigence d’une décision collective","La possibilité de reconnaître ses limites","Le refus de toute explication technique","Une nécessité prétendument technique qui masque des choix politiques"]','3','On présente cette orientation comme la simple conséquence des chiffres. Les chiffres, pourtant, ne choisissent ni les critères que l’on retient ni les renoncements que l’on accepte. Déclarer qu’il n’y a pas d’alternative revient ici à soustraire un arbitrage au débat.');
notify pgrst,'reload schema';
commit;
