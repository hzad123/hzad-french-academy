-- Review and test in staging first. Depends on the academy and placement migrations.
-- No historical scores, progress, purchases or placement attempts are modified.
begin;
create schema academy_tracker;
revoke all on schema academy_tracker from public,anon,authenticated;
create table academy_tracker.preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 minutes integer not null default 20 check(minutes in (10,20,30)),
 level text check(level in ('A0','A1','A2','B1','B2','C1','C2')),
 updated_at timestamptz not null default now()
);
create table academy_tracker.evidence (
 user_id uuid not null references auth.users(id) on delete cascade,
 unit_id text not null references public.academy_units(id) on delete cascade,
 question_id text not null,
 skill text not null check(skill in ('grammar','vocabulary','reading','listening','general')),
 last_choice integer not null,
 last_correct boolean not null,
 wrong_count integer not null default 0,
 review_streak integer not null default 0,
 last_checked_at timestamptz not null default now(),
 first_missed_at timestamptz,
 due_at timestamptz,
 chosen_answer text,
 correct_answer text,
 explanation text,
 primary key(user_id,unit_id,question_id)
);
alter table academy_tracker.preferences enable row level security;
alter table academy_tracker.evidence enable row level security;
revoke all on all tables in schema academy_tracker from public,anon,authenticated;
create index tracker_due on academy_tracker.evidence(user_id,due_at) where wrong_count>0;

create function academy_tracker.require_access() returns uuid
language plpgsql stable security definer set search_path=''
as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) or not public.academy_has_access() then
  raise exception 'Verified email and active academy access required' using errcode='42501';
 end if;
 return u;
end;
$$;

-- Preserve the installed authoritative grader verbatim rather than duplicating
-- grading keys/logic. The public signature and response remain unchanged.
alter function public.academy_check_answer(text,text,integer) rename to grade_answer;
alter function public.grade_answer(text,text,integer) set schema academy_tracker;
revoke all on function academy_tracker.grade_answer(text,text,integer) from public,anon,authenticated;

create function academy_tracker.check_answer(p_unit_id text,p_question_id text,p_answer integer) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 u uuid:=academy_tracker.require_access(); feedback jsonb; q jsonb; content jsonb; sk text; correct boolean;
begin
 feedback:=academy_tracker.grade_answer(p_unit_id,p_question_id,p_answer);
 select item.value,unit.content into q,content from public.academy_units unit
 cross join lateral jsonb_array_elements(unit.quiz) item(value)
 where unit.id=p_unit_id and unit.published and item.value->>'id'=p_question_id limit 1;
 if q is null or jsonb_typeof(feedback->'correct')<>'boolean' then raise exception 'Invalid grading response'; end if;
 correct:=(feedback->>'correct')::boolean;
 select lower(d->>'domain') into sk from jsonb_array_elements(case when jsonb_typeof(content->'assessment_domains')='array' then content->'assessment_domains' else '[]' end) d where d->>'questionId'=p_question_id limit 1;
 if exists(select 1 from jsonb_array_elements(case when jsonb_typeof(content->'listening_checks')='array' then content->'listening_checks' else '[]' end) d where d->>'questionId'=p_question_id) then sk:='listening'; end if;
 sk:=coalesce(sk,lower(q->>'skill'),lower(q->>'type'),'general');
 if sk not in ('grammar','vocabulary','reading','listening') then sk:='general'; end if;
 insert into academy_tracker.evidence(user_id,unit_id,question_id,skill,last_choice,last_correct,wrong_count,first_missed_at,due_at,chosen_answer,correct_answer,explanation)
 values(u,p_unit_id,p_question_id,sk,p_answer,correct,case when correct then 0 else 1 end,
  case when not correct then now() end,case when not correct then now() end,q->'options'->>p_answer,feedback->>'answer',feedback->>'explanation')
 on conflict(user_id,unit_id,question_id) do update set
  skill=excluded.skill,last_choice=excluded.last_choice,last_correct=excluded.last_correct,
  wrong_count=academy_tracker.evidence.wrong_count+case when excluded.last_correct then 0 else 1 end,
  review_streak=case when excluded.last_correct then least(academy_tracker.evidence.review_streak+1,4) else 0 end,
  last_checked_at=now(),first_missed_at=coalesce(academy_tracker.evidence.first_missed_at,excluded.first_missed_at),
  due_at=case when not excluded.last_correct then now()
    when academy_tracker.evidence.wrong_count>0 then now()+make_interval(days=>case academy_tracker.evidence.review_streak when 0 then 1 when 1 then 3 when 2 then 7 else 14 end)
    else null end,
  chosen_answer=case when not excluded.last_correct then excluded.chosen_answer else academy_tracker.evidence.chosen_answer end,correct_answer=excluded.correct_answer,explanation=excluded.explanation
 -- Identical retries within 12 hours do not inflate evidence or review spacing.
 where academy_tracker.evidence.last_choice<>excluded.last_choice or academy_tracker.evidence.last_correct<>excluded.last_correct
   or academy_tracker.evidence.last_checked_at<now()-interval '12 hours';
 return feedback;
end;
$$;
create function public.academy_check_answer(p_unit_id text,p_question_id text,p_answer integer) returns jsonb
language sql security invoker set search_path='' as $$select academy_tracker.check_answer(p_unit_id,p_question_id,p_answer)$$;

create function academy_tracker.snapshot(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_tracker.require_access(); units jsonb; evidence jsonb; notebook jsonb; placement jsonb; preferences jsonb;
begin
 if p_offset is null or p_offset<0 or p_offset>100000000 then raise exception 'Invalid notebook offset'; end if;
 select jsonb_build_object('minutes',p.minutes,'level',p.level) into preferences from academy_tracker.preferences p where user_id=u;
 select jsonb_build_object('recommendedLevel',a.result->>'recommendedLevel','skills',a.result->'skills','provisional',a.result->'provisional','startedAt',a.started_at)
 into placement from academy_placement.attempts a where a.user_id=u and a.status='completed' and a.result is not null order by a.completed_at desc,a.started_at desc limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'level',a.level,'position',a.position,'title',a.title,'minutes',a.minutes,
   'completed',coalesce(p.completed,false),'best',p.best_percent,'attempts',coalesce(p.attempts,0),'updatedAt',p.updated_at,
   'skills',(select coalesce(jsonb_agg(distinct e.skill),'[]') from academy_tracker.evidence e where e.user_id=u and e.unit_id=a.id and e.skill<>'general'))
   order by a.level,a.position),'[]') into units
 from public.academy_units a left join public.academy_learning_progress p on p.unit_id=a.id and p.user_id=u where a.published;
 select coalesce(jsonb_agg(jsonb_build_object('skill',s.skill,'total',s.total,'correct',s.correct)),'[]') into evidence from (
   select e.skill,count(*) as total,count(*) filter(where e.last_correct) as correct
   from academy_tracker.evidence e join public.academy_units a on a.id=e.unit_id and a.published where e.user_id=u group by e.skill
 ) s;
 select coalesce(jsonb_agg(jsonb_build_object('unitId',n.unit_id,'questionId',n.question_id,'level',n.level,'title',n.title,'skill',n.skill,
  'prompt',n.question->>'prompt','options',n.question->'options','chosenAnswer',n.chosen_answer,'correctAnswer',n.correct_answer,'explanation',n.explanation,
  'lastCorrect',n.last_correct,'wrongCount',n.wrong_count,'dueAt',n.due_at,'lastCheckedAt',n.last_checked_at)
  order by n.due_at,n.unit_id,n.question_id),'[]') into notebook from (
   select e.*,a.level,a.title,q.value as question from academy_tracker.evidence e
   join public.academy_units a on a.id=e.unit_id and a.published
   cross join lateral jsonb_array_elements(a.quiz) q(value)
   where e.user_id=u and e.wrong_count>0 and q.value->>'id'=e.question_id
   order by e.due_at,e.unit_id,e.question_id limit 200 offset p_offset
 ) n;
 return jsonb_build_object('generatedAt',now(),'notebookOffset',p_offset,'preferences',coalesce(preferences,'{"minutes":20,"level":null}'),
  'placement',placement,'units',units,'skills',evidence,'notebook',notebook,
  'notebookTotal',(select count(*) from academy_tracker.evidence e join public.academy_units a on a.id=e.unit_id and a.published
   where e.user_id=u and e.wrong_count>0 and exists(select 1 from jsonb_array_elements(a.quiz) q where q->>'id'=e.question_id)));
end;
$$;
create function academy_tracker.save_preferences(p_minutes integer,p_level text default null) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_tracker.require_access();
begin
 if p_minutes is null or p_minutes not in (10,20,30) or (p_level is not null and p_level not in ('A0','A1','A2','B1','B2','C1','C2')) then raise exception 'Invalid study preference'; end if;
 insert into academy_tracker.preferences(user_id,minutes,level) values(u,p_minutes,p_level)
 on conflict(user_id) do update set minutes=excluded.minutes,level=excluded.level,updated_at=now();
 return academy_tracker.snapshot();
end;
$$;
create function academy_tracker.revise(p_unit_id text,p_question_id text,p_answer integer) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare u uuid:=academy_tracker.require_access(); feedback jsonb;
begin
 if not exists(select 1 from academy_tracker.evidence where user_id=u and unit_id=p_unit_id and question_id=p_question_id and wrong_count>0) then
  raise exception 'Notebook item not found' using errcode='42501';
 end if;
 feedback:=academy_tracker.check_answer(p_unit_id,p_question_id,p_answer);
 return jsonb_build_object('feedback',feedback,'snapshot',academy_tracker.snapshot());
end;
$$;
create function public.academy_tracker_snapshot(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select academy_tracker.snapshot(p_offset)$$;
create function public.academy_tracker_preferences(p_minutes integer,p_level text default null) returns jsonb language sql security invoker set search_path='' as $$select academy_tracker.save_preferences(p_minutes,p_level)$$;
create function public.academy_tracker_revise(p_unit_id text,p_question_id text,p_answer integer) returns jsonb language sql security invoker set search_path='' as $$select academy_tracker.revise(p_unit_id,p_question_id,p_answer)$$;
revoke all on all functions in schema academy_tracker from public,anon,authenticated;
grant usage on schema academy_tracker to authenticated;
grant execute on function academy_tracker.snapshot(integer),academy_tracker.save_preferences(integer,text),academy_tracker.revise(text,text,integer),academy_tracker.check_answer(text,text,integer) to authenticated;
revoke all on function public.academy_tracker_snapshot(integer),public.academy_tracker_preferences(integer,text),public.academy_tracker_revise(text,text,integer),public.academy_check_answer(text,text,integer) from public,anon;
grant execute on function public.academy_tracker_snapshot(integer),public.academy_tracker_preferences(integer,text),public.academy_tracker_revise(text,text,integer),public.academy_check_answer(text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
