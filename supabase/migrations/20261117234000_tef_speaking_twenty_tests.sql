-- Dedicated TEF Canada speaking practice. TCF tables, attempts and audio are untouched.
begin;
alter table academy_ai.activities drop constraint activities_kind_check;
alter table academy_ai.activities add constraint activities_kind_check
 check (kind in('pronunciation','conversation','writing','tcf-writing','tcf-speaking-turn','tcf-speaking-feedback','tef-writing','tef-speaking-turn','tef-speaking-feedback'));
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens)
select 'tef-speaking-turn',enabled,credits,ceiling_microcad,model,max_output_tokens
from academy_ai.activities where kind='tcf-speaking-turn' on conflict (kind) do nothing;
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens)
select 'tef-speaking-feedback',enabled,credits,ceiling_microcad,model,max_output_tokens
from academy_ai.activities where kind='tcf-speaking-feedback' on conflict (kind) do nothing;

create schema academy_tef_speaking;
revoke all on schema academy_tef_speaking from public,anon,authenticated,service_role;
create table academy_tef_speaking.attempts(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 test_id text not null check(test_id ~ '^tef-speaking-(0[1-9]|1[0-9]|20)$'),
 version text not null check(version='tef-speaking-2026-11-v1'),
 phase smallint not null default 0 check(phase between 0 and 3),
 deadline timestamptz not null default now()+interval '300 seconds',
 pending uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index tef_speaking_history on academy_tef_speaking.attempts(user_id,created_at desc);
create table academy_tef_speaking.calls(
 id uuid primary key,
 attempt_id uuid not null references academy_tef_speaking.attempts(id) on delete cascade,
 phase smallint not null check(phase in(0,1,2,3)),
 kind text not null check(kind in('turn','feedback_a','feedback_b')),
 hash text not null check(hash ~ '^[0-9a-f]{64}$'),
 started_at timestamptz not null default now()
);
create index tef_speaking_calls_by_attempt on academy_tef_speaking.calls(attempt_id,started_at,id);
alter table academy_tef_speaking.attempts enable row level security;
alter table academy_tef_speaking.calls enable row level security;
revoke all on all tables in schema academy_tef_speaking from public,anon,authenticated,service_role;

-- Private objects. No anon/authenticated read/write policies; verified Edge Function
-- acts as a narrowly scoped broker after checking the attempt owner.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-tef-speaking','academy-tef-speaking',false,1100000,array['audio/wav'])
on conflict(id) do nothing;

create function public.academy_tef_speaking_command(
 p_user uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a academy_tef_speaking.attempts;c academy_tef_speaking.calls;
 r academy_ai.requests; history jsonb; test_id text; ver text; step text;
begin
 perform academy_ai.require_access(p_user);
 if p_action='list' then
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]'::jsonb) from (
   select id,test_id as "testId",version,phase,created_at as "createdAt" from academy_tef_speaking.attempts
   where user_id=p_user order by created_at desc,id desc limit 60
  )h);
 end if;
 if p_id is null then raise exception 'Invalid TEF speaking attempt';end if;
 perform 1 from auth.users where id=p_user for update;
 select * into a from academy_tef_speaking.attempts where id=p_id for update;
 if found and a.user_id is distinct from p_user then
  raise exception 'Speaking attempt not found' using errcode='42501';
 end if;
 if p_action='start' then
  test_id=p_payload->>'testId';ver=p_payload->>'version';
  if test_id is null or test_id !~ '^tef-speaking-(0[1-9]|1[0-9]|20)$' or ver<>'tef-speaking-2026-11-v1' then
   raise exception 'Invalid TEF speaking paper';
  end if;
  if a.id is null then
   if (select count(*) from academy_tef_speaking.attempts where user_id=p_user and created_at>now()-interval '24 hours')>=12 then
    raise exception 'Speaking attempt limit reached today';
   end if;
   insert into academy_tef_speaking.attempts(id,user_id,test_id,version)
   values(p_id,p_user,test_id,ver) returning * into a;
  elsif a.test_id is distinct from test_id or a.version is distinct from ver then
   raise exception 'Speaking attempt already belongs to another paper';
  end if;
 elsif a.id is null then raise exception 'Speaking attempt not found' using errcode='42501';
 end if;
 -- A pending request retains ownership and cannot be issued twice.
 -- Pause timed speaking only while one real AI transaction is processing, with
 -- a bounded 75-second extension on reconciliation, never on repeated reads.
 if a.pending is not null then
  select * into r from academy_ai.requests where id=a.pending and user_id=p_user;
  if r.status in('completed','failed') then
   select * into c from academy_tef_speaking.calls where id=a.pending and attempt_id=a.id;
   update academy_tef_speaking.attempts
   set deadline=case when phase in(0,2) then deadline+least(greatest(now()-c.started_at,interval '0 seconds'),interval '75 seconds') else deadline end,
    pending=null,updated_at=now() where id=a.id returning * into a;
  end if;
 end if;
 if p_action='advance' then
  if a.pending is not null then raise exception 'Finish the pending examiner reply first';end if;
  if a.phase=0 then
   if now()<a.deadline then raise exception 'La section A dure cinq minutes';end if;
   update academy_tef_speaking.attempts set phase=1,deadline=now(),updated_at=now() where id=a.id returning * into a;
  elsif a.phase=2 then
   if now()<a.deadline then raise exception 'La section B dure dix minutes';end if;
   update academy_tef_speaking.attempts set phase=3,deadline=now(),updated_at=now() where id=a.id returning * into a;
  else raise exception 'This section cannot be advanced';end if;
 elsif p_action='begin_b' then
  if a.phase<>1 or a.pending is not null then raise exception 'Finish Section A first';end if;
  update academy_tef_speaking.attempts set phase=2,deadline=now()+interval '600 seconds',updated_at=now()
  where id=a.id returning * into a;
 elsif p_action='lock' then
  if p_payload->>'kind' not in('turn','feedback_a','feedback_b') then raise exception 'Invalid speaking request kind';end if;
  select * into c from academy_tef_speaking.calls where id=(p_payload->>'callId')::uuid;
  if found then
   if c.attempt_id<>a.id or c.hash is distinct from p_payload->>'hash'
     or c.kind<>p_payload->>'kind' then raise exception 'Speaking call already used';end if;
  else
   if a.pending is not null then raise exception 'Finish the pending examiner reply first';end if;
   step=p_payload->>'kind';
   if step='turn' and (a.phase not in(0,2) or now()>a.deadline+interval '45 seconds') then
    raise exception 'Speaking time ended; finish this section';
   end if;
   if step='feedback_a' and a.phase<1 then raise exception 'Complete Section A before feedback';end if;
   if step='feedback_b' and a.phase<>3 then raise exception 'Complete Section B before final feedback';end if;
   if step='feedback_a' and exists(select 1 from academy_tef_speaking.calls sc join academy_ai.requests ar
    on ar.id=sc.id and ar.status='completed' where sc.attempt_id=a.id and sc.kind='feedback_a') then
    raise exception 'Section A feedback is already saved';
   end if;
   if step='feedback_b' and exists(select 1 from academy_tef_speaking.calls sc join academy_ai.requests ar
    on ar.id=sc.id and ar.status='completed' where sc.attempt_id=a.id and sc.kind='feedback_b') then
    raise exception 'Overall speaking feedback is already saved';
   end if;
   if step='turn' and (select count(*) from academy_tef_speaking.calls where attempt_id=a.id and kind='turn')>=50 then
    raise exception 'Speaking turn limit reached';
   end if;
   insert into academy_tef_speaking.calls(id,attempt_id,phase,kind,hash)
   values((p_payload->>'callId')::uuid,a.id,a.phase,step,p_payload->>'hash');
   update academy_tef_speaking.attempts set pending=(p_payload->>'callId')::uuid,updated_at=now()
   where id=a.id returning * into a;
  end if;
 elsif p_action='unlock' then
  if a.pending=(p_payload->>'callId')::uuid
   and not exists(select 1 from academy_ai.requests where id=a.pending and status in('reserved','dispatched'))
  then update academy_tef_speaking.attempts set pending=null,updated_at=now() where id=a.id returning * into a;end if;
 elsif p_action not in('start','read') then raise exception 'Invalid TEF speaking action';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',sc.id,'phase',sc.phase,'kind',sc.kind,'status',ar.status,
  'result',ar.result,'startedAt',sc.started_at) order by sc.started_at,sc.id),'[]'::jsonb)
 into history from academy_tef_speaking.calls sc left join academy_ai.requests ar
  on ar.id=sc.id and ar.user_id=p_user where sc.attempt_id=a.id;
 return to_jsonb(a)-'user_id'||jsonb_build_object('calls',history,'serverNow',now());
end;$$;
revoke all on function public.academy_tef_speaking_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_tef_speaking_command(uuid,text,uuid,jsonb) to service_role;

-- Immutable paper identities defend old attempts against future catalog changes.
create function academy_tef_speaking.prevent_paper_change() returns trigger
language plpgsql set search_path='' as $$begin
 if new.test_id is distinct from old.test_id or new.version is distinct from old.version or new.user_id is distinct from old.user_id
 then raise exception 'TEF speaking paper identity cannot change';end if;return new;
end;$$;
revoke all on function academy_tef_speaking.prevent_paper_change() from public,anon,authenticated,service_role;
create trigger tef_speaking_paper_immutable before update on academy_tef_speaking.attempts
for each row execute function academy_tef_speaking.prevent_paper_change();
commit;
