-- Explicit, quoted re-assessment of completed saved writing; no automatic charge.
begin;
create or replace function public.academy_tcf_writing_command(p_user uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_tcf_writing.attempts; r academy_ai.requests; answers jsonb; total integer; requested_version text;
begin
 perform academy_ai.require_access(p_user);
 if p_action='list' then
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]') from (
   select t.id,t.version,t.test_id as "testId",t.started_at as "startedAt",t.status,t.deadline,history_request.status as "reviewStatus"
   from academy_tcf_writing.attempts t left join academy_ai.requests history_request on history_request.id=coalesce(t.review_id,t.id) and history_request.user_id=t.user_id
   where t.user_id=p_user order by t.started_at desc,t.id desc limit 50)h);
 end if;
 if p_id is null then raise exception 'Invalid writing attempt';end if;
 -- Serialize starts/saves for this learner, including request-ID replays.
 perform 1 from auth.users where id=p_user for update;
 select * into a from academy_tcf_writing.attempts where id=p_id for update;
 if found and a.user_id is distinct from p_user then raise exception 'Writing attempt not found' using errcode='42501';end if;
 if p_action='start' then
  requested_version=coalesce(p_payload->>'version','tcf-writing-2026-11-v1');
  if requested_version not in ('tcf-writing-2026-11-v1','tcf-writing-2026-11-v2') then raise exception 'Invalid writing version';end if;
  if a.id is not null then
   if a.test_id is distinct from p_payload->>'testId' then raise exception 'Writing attempt ID already used';end if;
  else
   -- The per-user lock above serializes concurrent starts. Reopening a test
   -- resumes its active draft without resetting time or consuming start quota.
   -- Prefer a legacy draft with writing over an empty duplicate; keep both.
   select * into a from academy_tcf_writing.attempts
    where user_id=p_user and test_id=p_payload->>'testId' and version=requested_version and status='draft' and deadline>now()
    order by (responses<>'["","",""]'::jsonb) desc,started_at desc,id desc limit 1;
   if a.id is null then
    if (select count(*) from academy_tcf_writing.attempts where user_id=p_user and started_at>now()-interval '1 day')>=50 then raise exception 'Daily writing attempt limit reached. Resume a saved test';end if;
    insert into academy_tcf_writing.attempts(id,user_id,test_id,version)
     values(p_id,p_user,p_payload->>'testId',requested_version) returning * into a;
   end if;
  end if;
 elsif a.id is null then raise exception 'Writing attempt not found' using errcode='42501';
 elsif p_action='save' then
  if a.status<>'draft' then raise exception 'Submitted writing is locked';end if;
  if now()>=a.deadline then raise exception 'Writing time has ended. Submit your saved responses';end if;
  if (p_payload->>'revision')::integer is distinct from a.revision then raise exception 'Writing changed in another tab. Reopen the saved attempt';end if;
  answers=p_payload->'responses';
  if answers is null or jsonb_typeof(answers)<>'array' or jsonb_array_length(answers)<>3 then raise exception 'Invalid writing responses';end if;
  if exists(select 1 from jsonb_array_elements(answers) e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>3500) then raise exception 'Writing response too long';end if;
  select sum(length(e#>>'{}')) into total from jsonb_array_elements(answers)e;
  if total>6500 then raise exception 'Writing responses too long';end if;
  update academy_tcf_writing.attempts set responses=answers,revision=revision+1 where id=p_id returning * into a;
 elsif p_action='reassess-review' then
  if a.status<>'submitted' then raise exception 'Complete a writing assessment before requesting updated feedback';end if;
  if p_payload->>'reviewId' is null or p_payload->>'reviewId' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'Invalid writing review reference';end if;
  -- The caller quotes the completed review being replaced. A replay of that
  -- source reference reuses the latest review even after it has completed.
  -- Existing request/result rows remain intact and are never overwritten.
  if coalesce(a.review_id,a.id)=(p_payload->>'reviewId')::uuid then
   select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tcf-writing';
   if r.status is distinct from 'completed' then raise exception 'Complete the current writing assessment before requesting updated feedback';end if;
   update academy_tcf_writing.attempts set review_id=gen_random_uuid() where id=p_id returning * into a;
  end if;
 elsif p_action='retry-review' then
  select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tcf-writing';
  if a.status<>'submitted' then raise exception 'Submit writing before requesting a retry';end if;
  if r.status='failed' then
   update academy_tcf_writing.attempts set review_id=gen_random_uuid() where id=p_id returning * into a;
  end if;
 elsif p_action='submit' then
  if a.status='draft' then update academy_tcf_writing.attempts set status='submitted',submitted_at=now(),revision=revision+1 where id=p_id returning * into a;end if;
 elsif p_action<>'read' then raise exception 'Invalid writing action';end if;
 select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tcf-writing';
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'responses',a.responses,'revision',a.revision,
 'status',a.status,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'reviewId',coalesce(a.review_id,a.id),'reviewStatus',r.status,'failure',r.usage->'failure','result',r.result,'credits',r.credits);
end;$$;
commit;
