-- Multi-paper private publication registry; original Test01 stays published.
begin;
create table academy_tcf_listening.published(
 test_id text not null,version text not null,
 primary key(test_id),
 foreign key(test_id,version) references academy_tcf_listening.papers(id,version),
 check(test_id ~ '^tcf-listening-(0[1-9]|1[0-9]|20)$')
);
alter table academy_tcf_listening.published enable row level security;
revoke all on academy_tcf_listening.published from public,anon,authenticated,service_role;
insert into academy_tcf_listening.published(test_id,version) values('tcf-listening-01','tcf-listening-2026-11-v1');
create or replace function public.academy_tcf_listening_command(p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();a academy_tcf_listening.attempts;paper jsonb;history jsonb;
 question_no text;choice text;current_no integer;slot_start numeric;slot_end numeric;
 elapsed numeric;skipped numeric;question_start timestamptz;question_end timestamptz;
begin
 perform academy_ai.require_access(u);
 if p_action is null or p_action not in ('catalog','start','restart','read','answer','next','submit') or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1000 then raise exception 'Invalid listening action';end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where not (k=any(case p_action when 'start' then array['testId','version'] when 'restart' then array['testId','version'] when 'answer' then array['number','choice','revision'] when 'next' then array['number','revision'] when 'submit' then array['revision'] else array[]::text[] end))) then raise exception 'Invalid listening request';end if;
 if p_action='catalog' then
  select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]') into history from (
   select id,test_id "testId",version,status,started_at "startedAt",deadline from academy_tcf_listening.attempts where user_id=u order by started_at desc limit 50) h;
  return jsonb_build_object('tests',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'title',p.content->>'title','questions',39,'seconds',2100) order by p.id),'[]'::jsonb)
    from academy_tcf_listening.papers p join academy_tcf_listening.published v on v.test_id=p.id and v.version=p.version),'history',history,'serverNow',now());
 end if;
 if p_id is null then raise exception 'Invalid listening attempt';end if;
 if p_action in ('start','restart') then perform 1 from auth.users where id=u for update;end if;
 select * into a from academy_tcf_listening.attempts where id=p_id for update;
 if found and a.user_id<>u then raise exception 'Listening attempt not found' using errcode='42501';end if;
 if p_action in ('start','restart') then
  if not exists(select 1 from academy_tcf_listening.published v
     where v.test_id=p_payload->>'testId' and v.version=p_payload->>'version'
       and v.test_id ~ '^tcf-listening-(0[1-9]|1[0-9]|20)$')
    then raise exception 'Listening paper changed or is not available. Refresh before starting';end if;
  if a.id is not null and (a.test_id<>p_payload->>'testId' or a.version<>p_payload->>'version') then raise exception 'Listening attempt already used';end if;
  if a.id is null then
   update academy_tcf_listening.attempts t set status='completed',submitted_at=t.deadline,result=academy_tcf_listening.grade(p.content,t.answers),revision=t.revision+1
    from academy_tcf_listening.papers p where t.user_id=u and t.status='active' and now()>=t.deadline and p.id=t.test_id and p.version=t.version;
   -- A new-start request has a fresh UUID: preserve the earlier attempt by
   -- grading its saved answers before opening a new 35-minute attempt.
   -- Existing UUIDs remain idempotent and never reset their clocks.
   if p_action='restart' then
    update academy_tcf_listening.attempts t
     set status='completed',submitted_at=now(),result=academy_tcf_listening.grade(p.content,t.answers),revision=t.revision+1
     from academy_tcf_listening.papers p
     where t.user_id=u and t.status='active' and t.test_id=p_payload->>'testId'
       and t.version=p_payload->>'version' and p.id=t.test_id and p.version=t.version;
   end if;
   select * into a from academy_tcf_listening.attempts where user_id=u and status='active' and test_id=p_payload->>'testId' and version=p_payload->>'version' for update;
   if a.id is null then insert into academy_tcf_listening.attempts(id,user_id,test_id,version) values(p_id,u,p_payload->>'testId',p_payload->>'version') returning * into a;end if;
  end if;
 end if;
 if a.id is null then raise exception 'Listening attempt not found' using errcode='42501';end if;
 select content into paper from academy_tcf_listening.papers where id=a.test_id and version=a.version;
 if a.status='active' and now()>=a.deadline then
  update academy_tcf_listening.attempts set status='completed',submitted_at=deadline,result=academy_tcf_listening.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
 end if;
 if a.status='active' then
  select coalesce((select n.skipped_seconds from academy_tcf_listening.navigation n where n.attempt_id=a.id),0) into skipped;
  elapsed:=greatest(0,extract(epoch from now()-a.started_at))+skipped;
  select s.number,s.finish-s.duration,s.finish into current_no,slot_start,slot_end from (
   select (q->>'number')::int number,(q->>'slotSeconds')::numeric duration,
    sum((q->>'slotSeconds')::numeric) over(order by (q->>'number')::int) finish
   from jsonb_array_elements(paper->'questions') q) s where elapsed>=s.finish-s.duration and (elapsed<s.finish or s.number=39) order by s.number limit 1;
  if current_no is null then raise exception 'Listening timing unavailable. Reload your saved test';end if;
  question_start:=a.started_at+(slot_start-skipped)*interval '1 second';
  question_end:=case when current_no=39 then a.deadline else least(a.deadline,a.started_at+(slot_end-skipped)*interval '1 second') end;
 end if;
 if a.status='active' and p_action in ('answer','next','submit') then
  if p_payload->'revision' is distinct from to_jsonb(a.revision) then raise exception 'Listening answers changed in another tab. Reload saved answers';end if;
  if p_action='answer' then
   if jsonb_typeof(p_payload->'number') is distinct from 'number' or p_payload->>'number' !~ '^([1-9]|[12][0-9]|3[0-9])$' or not (p_payload ? 'choice') or (p_payload->'choice'<>'null'::jsonb and (jsonb_typeof(p_payload->'choice')<>'string' or p_payload->>'choice' not in ('A','B','C','D'))) then raise exception 'Invalid listening choice';end if;
   if (p_payload->>'number')::int<>current_no then raise exception 'This listening question has ended. Continue with the current question';end if;
   question_no:=p_payload->>'number';choice:=p_payload->>'choice';
   update academy_tcf_listening.attempts set answers=case when choice is null then answers-question_no else jsonb_set(answers,array[question_no],to_jsonb(choice)) end,revision=revision+1 where id=a.id returning * into a;
  elsif p_action='next' then
   if jsonb_typeof(p_payload->'number') is distinct from 'number' or p_payload->>'number' !~ '^([1-9]|[12][0-9]|3[0-9])$' then raise exception 'Invalid listening question';end if;
   if (p_payload->>'number')::int<>current_no then raise exception 'This listening question has ended. Continue with the current question';end if;
   if current_no=39 then raise exception 'This is the final listening question. Submit your test';end if;
   -- Only the server advances the offset; original starts/deadlines stay frozen.
   skipped:=skipped+slot_end-elapsed;
   insert into academy_tcf_listening.navigation(attempt_id,skipped_seconds) values(a.id,skipped)
    on conflict(attempt_id) do update set skipped_seconds=excluded.skipped_seconds;
   update academy_tcf_listening.attempts set revision=revision+1 where id=a.id returning * into a;
   current_no:=current_no+1;slot_start:=slot_end;
   slot_end:=slot_start+(paper->'questions'->(current_no-1)->>'slotSeconds')::numeric;
   question_start:=a.started_at+(slot_start-skipped)*interval '1 second';
   question_end:=case when current_no=39 then a.deadline else least(a.deadline,a.started_at+(slot_end-skipped)*interval '1 second') end;
  else
   if current_no<>39 then raise exception 'Continue to the final listening question before submitting';end if;
   update academy_tcf_listening.attempts set status='completed',submitted_at=now(),result=academy_tcf_listening.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
  end if;
 end if;
 if a.status='completed' then current_no:=null;question_start:=null;question_end:=null;end if;
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'status',a.status,'answers',a.answers,'revision',a.revision,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'currentQuestion',current_no,'questionStartedAt',question_start,'questionEndsAt',question_end,
 'paper',jsonb_build_object('id',a.test_id,'version',a.version,'title',paper->>'title','seconds',paper->'seconds','questions',(
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('number',q->'number','kind',q->'kind','question',q->'question','options',q->'options','image',q->'image','audio',q->'audio','audioSeconds',q->'audioSeconds','slotSeconds',q->'slotSeconds')) order by (q->>'number')::int)
  from jsonb_array_elements(paper->'questions') q)),
 'result',a.result);
end;$$;
revoke all on all functions in schema academy_tcf_listening from public,anon,authenticated,service_role;
revoke all on function public.academy_tcf_listening_command(text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.academy_tcf_listening_command(text,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
