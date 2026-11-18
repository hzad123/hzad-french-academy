-- Isolated TEF Canada writing: 20 papers, two timed sections, protected attempts.
-- Do not change TCF attempts, curriculum, student access or existing wallets.
begin;
alter table academy_ai.activities drop constraint activities_kind_check;
alter table academy_ai.activities add constraint activities_kind_check
 check(kind in ('pronunciation','conversation','writing','tcf-writing','tcf-speaking-turn','tcf-speaking-feedback','tef-writing'));
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens)
select 'tef-writing',enabled,credits,ceiling_microcad,model,max_output_tokens
from academy_ai.activities where kind='tcf-writing'
on conflict(kind) do nothing;
create schema academy_tef_writing;
revoke all on schema academy_tef_writing from public,anon,authenticated,service_role;
create table academy_tef_writing.attempts(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 test_id text not null check(test_id ~ '^tef-writing-(0[1-9]|1[0-9]|20)$'),
 version text not null check(version='tef-writing-2026-11-v1'),
 responses jsonb not null default '["",""]'::jsonb check(jsonb_typeof(responses)='array' and jsonb_array_length(responses)=2),
 revision integer not null default 0,
 status text not null default 'draft' check(status in ('draft','submitted')),
 started_at timestamptz not null default now(),
 deadline timestamptz not null default now()+interval '60 minutes',
 submitted_at timestamptz,
 review_id uuid
);
create index tef_writing_user_history on academy_tef_writing.attempts(user_id,started_at desc);
alter table academy_tef_writing.attempts enable row level security;
revoke all on all tables in schema academy_tef_writing from public,anon,authenticated,service_role;

create function public.academy_tef_writing_command(p_user uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_tef_writing.attempts; r academy_ai.requests; answers jsonb; requested_version text;
begin
 perform academy_ai.require_access(p_user);
 if p_action='list' then
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]'::jsonb) from (
   select t.id,t.version,t.test_id as "testId",t.started_at as "startedAt",t.status,t.deadline,
   history_request.status as "reviewStatus" from academy_tef_writing.attempts t
   left join academy_ai.requests history_request on history_request.id=coalesce(t.review_id,t.id) and history_request.user_id=t.user_id and history_request.kind='tef-writing'
   where t.user_id=p_user order by t.started_at desc,t.id desc limit 60)h);
 end if;
 if p_id is null then raise exception 'Invalid TEF writing attempt';end if;
 perform 1 from auth.users where id=p_user for update;
 select * into a from academy_tef_writing.attempts where id=p_id for update;
 if found and a.user_id is distinct from p_user then raise exception 'Writing attempt not found' using errcode='42501';end if;
 if p_action='start' then
  requested_version=coalesce(p_payload->>'version','');
  if requested_version<>'tef-writing-2026-11-v1' then raise exception 'Refresh the TEF writing papers';end if;
  if a.id is not null then
   if a.test_id is distinct from p_payload->>'testId' or a.version<>requested_version then raise exception 'Writing attempt ID already used';end if;
  else
   select * into a from academy_tef_writing.attempts
   where user_id=p_user and test_id=p_payload->>'testId' and version=requested_version and status='draft' and deadline>now()
   order by (responses<>'["",""]'::jsonb) desc,started_at desc,id desc limit 1;
   if a.id is null then
    insert into academy_tef_writing.attempts(id,user_id,test_id,version)
    values(p_id,p_user,p_payload->>'testId',requested_version) returning * into a;
   end if;
  end if;
 elsif a.id is null then raise exception 'Writing attempt not found' using errcode='42501';
 elsif p_action='save' then
  if a.status<>'draft' then raise exception 'Submitted writing is locked';end if;
  if now()>=a.deadline then raise exception 'Writing time has ended. Submit your saved answers';end if;
  if (p_payload->>'revision')::integer is distinct from a.revision then raise exception 'Writing changed in another tab. Reopen your saved attempt';end if;
  answers=p_payload->'responses';
  if answers is null or jsonb_typeof(answers)<>'array' or jsonb_array_length(answers)<>2 then raise exception 'Invalid two-section responses';end if;
  if exists(select 1 from jsonb_array_elements(answers) e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>5000) then raise exception 'Writing response too long';end if;
  if length(answers->>0)+length(answers->>1)>8500 then raise exception 'Writing responses too long';end if;
  -- Section A locks at minute 25, Section B cannot begin before then.
  if now()>=a.started_at+interval '25 minutes' and answers->>0 is distinct from a.responses->>0 then raise exception 'Section A is closed';end if;
  if now()<a.started_at+interval '25 minutes' and answers->>1 is distinct from a.responses->>1 then raise exception 'Section B has not started';end if;
  update academy_tef_writing.attempts set responses=answers,revision=revision+1 where id=a.id returning * into a;
 elsif p_action='submit' then
  if now()<a.started_at+interval '25 minutes' then raise exception 'Section B has not started';end if;
  if a.status='draft' then update academy_tef_writing.attempts set status='submitted',submitted_at=now(),revision=revision+1 where id=a.id returning * into a;end if;
 elsif p_action='retry-review' then
  select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tef-writing';
  if a.status<>'submitted' or r.status is distinct from 'failed' then raise exception 'Only failed writing feedback can be retried';end if;
  update academy_tef_writing.attempts set review_id=gen_random_uuid() where id=a.id returning * into a;
 elsif p_action='reassess-review' then
  if a.status<>'submitted' then raise exception 'Submit writing before reassessing';end if;
  if coalesce(a.review_id,a.id)::text is distinct from p_payload->>'reviewId' then raise exception 'Reopen your latest feedback before reassessing';end if;
  select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tef-writing';
  if r.status is distinct from 'completed' then raise exception 'Finish the current assessment first';end if;
  update academy_tef_writing.attempts set review_id=gen_random_uuid() where id=a.id returning * into a;
 elsif p_action<>'read' then raise exception 'Invalid writing action';end if;
 select * into r from academy_ai.requests where id=coalesce(a.review_id,a.id) and user_id=p_user and kind='tef-writing';
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'responses',a.responses,'revision',a.revision,
 'status',a.status,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'reviewId',coalesce(a.review_id,a.id),'reviewStatus',r.status,'result',r.result,'credits',r.credits);
end;$$;
revoke all on function public.academy_tef_writing_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_tef_writing_command(uuid,text,uuid,jsonb) to service_role;
commit;
