-- Additive TCF writing practice. No existing lesson/progress/credit rows change.
-- New assessment activity is disabled/unpriced until a measured cost review.
begin;
alter table academy_ai.activities drop constraint activities_kind_check;
alter table academy_ai.activities add constraint activities_kind_check
 check(kind in ('pronunciation','conversation','writing','tcf-writing'));
insert into academy_ai.activities(kind,max_output_tokens) values('tcf-writing',2000);
create schema academy_tcf_writing;
revoke all on schema academy_tcf_writing from public,anon,authenticated,service_role;
create table academy_tcf_writing.attempts(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 test_id text not null check(test_id ~ '^tcf-writing-(0[1-9]|1[0-9]|20)$'),
 version text not null check(version='tcf-writing-2026-11-v1'),
 responses jsonb not null default '["","",""]' check(jsonb_typeof(responses)='array' and jsonb_array_length(responses)=3),
 revision integer not null default 0,
 status text not null default 'draft' check(status in ('draft','submitted')),
 started_at timestamptz not null default now(),
 deadline timestamptz not null default now()+interval '60 minutes',
 submitted_at timestamptz
);
create index tcf_writing_history on academy_tcf_writing.attempts(user_id,started_at desc);
alter table academy_tcf_writing.attempts enable row level security;
revoke all on all tables in schema academy_tcf_writing from public,anon,authenticated,service_role;
create function public.academy_tcf_writing_command(p_user uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_tcf_writing.attempts; r academy_ai.requests; answers jsonb; total integer;
begin
 perform academy_ai.require_access(p_user);
 if p_action='list' then
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]') from (
   select t.id,t.test_id as "testId",t.started_at as "startedAt",t.status,t.deadline,r.status as "reviewStatus"
   from academy_tcf_writing.attempts t left join academy_ai.requests r on r.id=t.id and r.user_id=t.user_id
   where t.user_id=p_user order by t.started_at desc,t.id desc limit 50)h);
 end if;
 if p_id is null then raise exception 'Invalid writing attempt';end if;
 -- Serialize starts/saves for this learner, including request-ID replays.
 perform 1 from auth.users where id=p_user for update;
 select * into a from academy_tcf_writing.attempts where id=p_id for update;
 if found and a.user_id is distinct from p_user then raise exception 'Writing attempt not found' using errcode='42501';end if;
 if p_action='start' then
  if a.id is not null then
   if a.test_id is distinct from p_payload->>'testId' then raise exception 'Writing attempt ID already used';end if;
  else
   if (select count(*) from academy_tcf_writing.attempts where user_id=p_user and started_at>now()-interval '1 day')>=50 then raise exception 'Daily writing attempt limit reached';end if;
   if (select count(*) from academy_tcf_writing.attempts where user_id=p_user and status='draft' and deadline>now())>=3 then raise exception 'Finish an open writing test before starting another';end if;
   insert into academy_tcf_writing.attempts(id,user_id,test_id,version)
    values(p_id,p_user,p_payload->>'testId','tcf-writing-2026-11-v1') returning * into a;
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
 elsif p_action='submit' then
  if a.status='draft' then update academy_tcf_writing.attempts set status='submitted',submitted_at=now(),revision=revision+1 where id=p_id returning * into a;end if;
 elsif p_action<>'read' then raise exception 'Invalid writing action';end if;
 select * into r from academy_ai.requests where id=a.id and user_id=p_user and kind='tcf-writing';
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'responses',a.responses,'revision',a.revision,
 'status',a.status,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'reviewStatus',r.status,'result',r.result,'credits',r.credits);
end;$$;
revoke all on function public.academy_tcf_writing_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_tcf_writing_command(uuid,text,uuid,jsonb) to service_role;
commit;
