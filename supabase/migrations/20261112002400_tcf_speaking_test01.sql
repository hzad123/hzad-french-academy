-- Standalone speaking pilot. Prices are copied for review, inference stays off.
begin;
alter table academy_ai.activities drop constraint activities_kind_check;
alter table academy_ai.activities add constraint activities_kind_check check(kind in('pronunciation','conversation','writing','tcf-writing','tcf-speaking-turn','tcf-speaking-feedback'));
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens)
select 'tcf-speaking-turn',false,credits,ceiling_microcad,model,max_output_tokens from academy_ai.activities where kind='conversation';
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens)
select 'tcf-speaking-feedback',false,credits,ceiling_microcad,model,max_output_tokens from academy_ai.activities where kind='tcf-writing';
create schema academy_tcf_speaking;
revoke all on schema academy_tcf_speaking from public,anon,authenticated,service_role;
create table academy_tcf_speaking.attempts(id uuid primary key,user_id uuid not null references auth.users(id),version text not null default 'tcf-speaking-2026-11-v1',phase integer not null default 0 check(phase between 0 and 4),deadline timestamptz not null default now()+interval '120 seconds',pending uuid,created_at timestamptz not null default now());
create table academy_tcf_speaking.calls(id uuid primary key,attempt_id uuid not null references academy_tcf_speaking.attempts(id),phase integer not null,kind text not null check(kind in ('turn','feedback')),hash text not null,started_at timestamptz not null default now());
alter table academy_tcf_speaking.attempts enable row level security;
alter table academy_tcf_speaking.calls enable row level security;
revoke all on all tables in schema academy_tcf_speaking from public,anon,authenticated,service_role;
create function public.academy_tcf_speaking_command(p_user uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_tcf_speaking.attempts;c academy_tcf_speaking.calls;r academy_ai.requests;history jsonb;outcome jsonb;
begin
 perform academy_ai.require_access(p_user);
 if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]') from(select id,phase,created_at "createdAt" from academy_tcf_speaking.attempts where user_id=p_user order by created_at desc limit 20)h);end if;
 perform 1 from auth.users where id=p_user for update;
 select * into a from academy_tcf_speaking.attempts where id=p_id for update;
 if found and a.user_id<>p_user then raise exception 'Speaking attempt not found' using errcode='42501';end if;
 if p_action='start' and a.id is null then
  if (select count(*) from academy_tcf_speaking.attempts where user_id=p_user and created_at>now()-interval '1 day')>=10 then raise exception 'Daily speaking attempt limit reached';end if;
  insert into academy_tcf_speaking.attempts(id,user_id) values(p_id,p_user) returning * into a;
 end if;
 if a.id is null then raise exception 'Speaking attempt not found' using errcode='42501';end if;
 -- Reconcile only persisted wallet outcomes. Reads never dispatch inference.
 if a.pending is not null then
  select * into r from academy_ai.requests where id=a.pending and user_id=p_user;
  if r.status in ('completed','failed') then
   select * into c from academy_tcf_speaking.calls where id=a.pending;
   update academy_tcf_speaking.attempts set deadline=deadline+least(now()-c.started_at,interval '90 seconds'),pending=null where id=a.id returning * into a;
  end if;
 end if;
 if p_action='advance' then
  if a.pending is not null then raise exception 'Check the pending examiner reply first';end if;
  if a.phase>=4 then raise exception 'This speaking test is complete';end if;
  if a.phase=1 and now()<a.deadline then raise exception 'Use the two-minute preparation time';end if;
  if a.phase<>1 and now()<a.deadline and not exists(select 1 from academy_tcf_speaking.calls sc join academy_ai.requests ar on ar.id=sc.id and ar.status='completed' where sc.attempt_id=a.id and sc.phase=a.phase and sc.kind='turn') then raise exception 'Record a response before finishing this task';end if;
  update academy_tcf_speaking.attempts set phase=phase+1,deadline=now()+make_interval(secs=>case a.phase when 0 then 120 when 1 then 210 when 2 then 270 else 0 end) where id=a.id returning * into a;
 elsif p_action='lock' then
  select * into c from academy_tcf_speaking.calls where id=(p_payload->>'callId')::uuid;
  if found then
   if c.attempt_id<>a.id or c.hash<>p_payload->>'hash' then raise exception 'Speaking call ID already used';end if;
  else
   if a.pending is not null then raise exception 'Check the pending examiner reply first';end if;
   if p_payload->>'kind'='turn' and (a.phase not in(0,2,3) or now()>=a.deadline) then raise exception 'Speaking time ended. Continue to the next task';end if;
   if p_payload->>'kind'='feedback' and a.phase<>4 then raise exception 'Finish all three tasks before feedback';end if;
   if p_payload->>'kind'='feedback' and exists(select 1 from academy_tcf_speaking.calls sc join academy_ai.requests ar on ar.id=sc.id and ar.status='completed' where sc.attempt_id=a.id and sc.kind='feedback') then raise exception 'Saved feedback is already available';end if;
   if (select count(*) from academy_tcf_speaking.calls where attempt_id=a.id and kind='turn')>=30 and p_payload->>'kind'='turn' then raise exception 'Speaking turn limit reached';end if;
   insert into academy_tcf_speaking.calls(id,attempt_id,phase,kind,hash) values((p_payload->>'callId')::uuid,a.id,a.phase,p_payload->>'kind',p_payload->>'hash');
   update academy_tcf_speaking.attempts set pending=(p_payload->>'callId')::uuid where id=a.id returning * into a;
  end if;
 elsif p_action='unlock' then
  -- Only failed/not-yet-reserved calls may be abandoned; never redispatch.
  if a.pending=(p_payload->>'callId')::uuid and not exists(select 1 from academy_ai.requests where id=a.pending and status in('reserved','dispatched')) then
   update academy_tcf_speaking.attempts set pending=null where id=a.id returning * into a;
  end if;
 elsif p_action not in('read','start') then raise exception 'Invalid speaking action';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',sc.id,'phase',sc.phase,'kind',sc.kind,'status',ar.status,'result',ar.result) order by sc.started_at,sc.id),'[]') into history from academy_tcf_speaking.calls sc left join academy_ai.requests ar on ar.id=sc.id and ar.user_id=p_user where sc.attempt_id=a.id;
 return to_jsonb(a)-'user_id'||jsonb_build_object('calls',history,'serverNow',now());
end;$$;
revoke all on function public.academy_tcf_speaking_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_tcf_speaking_command(uuid,text,uuid,jsonb) to service_role;
commit;
