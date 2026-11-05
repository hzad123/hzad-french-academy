-- Additive exam storage and prepaid access. No production activation or prices.
-- Reconcile the already-live nullable global cap before sharing its wallet.
begin;
alter table academy_ai.policy alter column global_cap_microcad drop not null;
alter table academy_ai.policy alter column global_cap_microcad set default null;
update academy_ai.policy set global_cap_microcad=null where id;
do $$declare definition text;begin
 select pg_get_functiondef('academy_ai.reserve(uuid,uuid,text,text,text,integer,uuid,text)'::regprocedure) into definition;
 definition:=replace(definition,'or cfg.spent_microcad+cfg.reserved_microcad+a.ceiling_microcad>cfg.global_cap_microcad then',
 'or (cfg.global_cap_microcad is not null and cfg.spent_microcad+cfg.reserved_microcad+a.ceiling_microcad>cfg.global_cap_microcad) then');
 execute definition;
 select pg_get_functiondef('academy_ai.state()'::regprocedure) into definition;
 definition:=replace(definition,'and cfg.global_cap_microcad>cfg.spent_microcad+cfg.reserved_microcad,',
 'and (cfg.global_cap_microcad is null or cfg.global_cap_microcad>cfg.spent_microcad+cfg.reserved_microcad),');
 execute definition;
end$$;
-- No site-wide spending gate is introduced by exams. Each reservation uses the
-- learner's existing CAD 10 included ceiling (or verified purchased budget).
create schema academy_exams;
revoke all on schema academy_exams from public,anon,authenticated,service_role;
create table academy_exams.catalog(
 exam text primary key check(exam in ('tef-canada','tcf-canada')),
 version text not null,
 enabled boolean not null default false,
 audio_reviewed boolean not null default false,
 editorial_reviewed boolean not null default false,
 credits integer check(credits between 1 and 10000),
 budget_microcad bigint check(budget_microcad between 1 and 10000000),
 call_microcad bigint check(call_microcad between 1 and 1000000),
 max_calls integer not null default 64 check(max_calls between 1 and 80),
 text_model text not null default 'gpt-4o-mini',
 audio_model text not null default 'gpt-audio-mini',
 check(not enabled or (audio_reviewed and editorial_reviewed and credits is not null and budget_microcad is not null and call_microcad is not null and budget_microcad>=call_microcad*max_calls))
);
insert into academy_exams.catalog(exam,version) values
 ('tef-canada','tef-canada-hzad-01-20261105'),('tcf-canada','tcf-canada-hzad-01-20261105');
create table academy_exams.attempts(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 exam text not null references academy_exams.catalog(exam),
 version text not null,
 credits integer not null,
 budget_remaining bigint not null check(budget_remaining>=0),
 settings jsonb not null,
 state jsonb not null,
 revision integer not null default 0,
 created_at timestamptz not null default now(),
 closed_at timestamptz
);
create unique index exam_one_open_attempt on academy_exams.attempts(user_id) where closed_at is null;
create index exam_owned_history on academy_exams.attempts(user_id,created_at desc);
create table academy_exams.calls(
 id uuid primary key,
 attempt_id uuid not null references academy_exams.attempts(id),
 input_hash text not null,
 purpose text not null,
 status text not null default 'dispatched' check(status in ('dispatched','completed','failed')),
 result jsonb,
 usage jsonb,
 created_at timestamptz not null default now()
);
create table academy_exams.ledger(
 id bigint generated always as identity primary key,
 attempt_id uuid not null references academy_exams.attempts(id),
 call_id uuid references academy_exams.calls(id),
 event text not null check(event in ('access','provider','release')),
 credits_delta integer not null default 0,
 microcad bigint not null check(microcad>=0),
 created_at timestamptz not null default now()
);
alter table academy_exams.catalog enable row level security;
alter table academy_exams.attempts enable row level security;
alter table academy_exams.calls enable row level security;
alter table academy_exams.ledger enable row level security;
revoke all on all tables in schema academy_exams from public,anon,authenticated,service_role;
revoke all on all sequences in schema academy_exams from public,anon,authenticated,service_role;

create function public.academy_exam_catalog() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();wallet jsonb; exams jsonb; history jsonb;
begin
 perform academy_ai.require_access(u);
 wallet:=academy_ai.state();
 select jsonb_agg(jsonb_build_object('exam',exam,'version',version,'enabled',enabled,'credits',credits) order by exam) into exams from academy_exams.catalog;
 select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]') into history from (
 select id,exam,state->>'status' status,created_at "createdAt",closed_at "closedAt" from academy_exams.attempts
 where user_id=u order by created_at desc limit 20)h;
 return jsonb_build_object('exams',exams,'wallet',wallet->'wallet','topUpUrl',wallet->'topUpUrl','history',history);
end;$$;

-- Only the authenticated Edge service can execute this RPC. It validates the
-- caller with Supabase Auth first; browser requests cannot supply p_user/state.
create function public.academy_exam_command(p_user uuid,p_action text,p_id uuid,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_exams.attempts;cfg academy_exams.catalog;w academy_ai.wallets;c academy_exams.calls;
 n integer; cost bigint;callid uuid;
begin
 perform academy_ai.require_access(p_user);
 -- Common lock order with existing AI wallet functions; totals are accounting,
 -- not a shared cap. User wallets still independently enforce their ceiling.
 perform 1 from academy_ai.policy where id for update;
 select * into a from academy_exams.attempts where id=p_id for update;
 if found and a.user_id<>p_user then raise exception 'Exam attempt not found' using errcode='42501';end if;
 if p_action='start' then
  if a.id is not null then
   if a.exam is distinct from p_payload->>'exam' then raise exception 'Attempt ID already used';end if;
   return to_jsonb(a);
  end if;
  select * into cfg from academy_exams.catalog where exam=p_payload->>'exam';
  if not found or not cfg.enabled then raise exception 'This mock exam is being prepared';end if;
  if cfg.credits is distinct from (p_payload->>'credits')::integer or cfg.version is distinct from p_payload->>'version' then raise exception 'Exam price or version changed. Refresh before starting';end if;
  if not exists(select 1 from academy_ai.policy where id and enabled and (allowed_users is null or p_user=any(allowed_users))) then raise exception 'AI Learning is paused';end if;
  perform academy_ai.ensure_wallet(p_user);
  select * into w from academy_ai.wallets where user_id=p_user for update;
  if not found or w.expires_at<=now() or w.available<cfg.credits then raise exception 'Not enough AI credits. A paid top-up is required';end if;
  if w.spent_microcad+w.reserved_microcad+cfg.budget_microcad>w.cap_microcad then raise exception 'Your AI allowance cannot cover this exam. A paid top-up is required';end if;
  if exists(select 1 from academy_exams.attempts where user_id=p_user and closed_at is null) then raise exception 'Resume or close your current mock exam first';end if;
  if (select count(*) from academy_exams.attempts where user_id=p_user and created_at>now()-interval '24 hours')>=3 then raise exception 'Daily mock exam limit reached';end if;
  if p_payload->'state'->>'userId' is distinct from p_user::text or p_payload->'state'->>'id' is distinct from p_id::text then raise exception 'Invalid exam state';end if;
  insert into academy_exams.attempts(id,user_id,exam,version,credits,budget_remaining,settings,state)
  values(p_id,p_user,cfg.exam,cfg.version,cfg.credits,cfg.budget_microcad,to_jsonb(cfg),p_payload->'state') returning * into a;
  update academy_ai.wallets set available=available-cfg.credits,reserved=reserved+cfg.credits,reserved_microcad=reserved_microcad+cfg.budget_microcad where user_id=p_user;
  update academy_ai.policy set reserved_microcad=reserved_microcad+cfg.budget_microcad where id;
  insert into academy_exams.ledger(attempt_id,event,credits_delta,microcad) values(p_id,'access',-cfg.credits,cfg.budget_microcad);
  return to_jsonb(a);
 end if;
 if a.id is null then raise exception 'Exam attempt not found' using errcode='42501';end if;
 if p_action='read' then return to_jsonb(a)||jsonb_build_object('callResults',(select coalesce(jsonb_agg(result order by created_at),'[]') from academy_exams.calls where attempt_id=p_id and status='completed'));end if;
 if p_action='call-result' then
  select * into c from academy_exams.calls where id=(p_payload->>'callId')::uuid and attempt_id=p_id;
  if not found then raise exception 'Exam activity not found';end if;
  return to_jsonb(c);
 end if;
 if p_action='save' then
  if (p_payload->>'revision')::integer is distinct from a.revision then raise exception 'Exam changed. Reload your saved attempt';end if;
  if p_payload->'state'->>'userId' is distinct from p_user::text or p_payload->'state'->>'id' is distinct from p_id::text or p_payload->'state'->>'version' is distinct from a.version
  or p_payload->'state'->>'status' not in ('active','completed','cancelled') or octet_length((p_payload->'state')::text)>1000000 then raise exception 'Invalid exam state';end if;
  update academy_exams.attempts set state=p_payload->'state',revision=revision+1 where id=p_id returning * into a;
  return to_jsonb(a);
 end if;
 if p_action='claim-call' then
  callid:=(p_payload->>'callId')::uuid;
  select * into c from academy_exams.calls where id=callid;
  if found then
   if c.attempt_id<>p_id or c.input_hash is distinct from p_payload->>'hash' then raise exception 'Activity ID already used';end if;
   return to_jsonb(c)||jsonb_build_object('claimed',false);
  end if;
  if a.closed_at is not null then raise exception 'Exam AI feedback is closed';end if;
  if p_payload->>'hash' is null or p_payload->>'hash' !~ '^[0-9a-f]{64}$' or p_payload->>'purpose' is null or p_payload->>'purpose' not in ('turn','assessment') then raise exception 'Invalid exam activity';end if;
  if exists(select 1 from academy_exams.calls where attempt_id=p_id and status='dispatched' and created_at>now()-interval '2 minutes') then raise exception 'An exam activity is already processing';end if;
  if not exists(select 1 from academy_ai.policy where id and enabled and (allowed_users is null or p_user=any(allowed_users))) then raise exception 'AI Learning is paused';end if;
  select count(*) into n from academy_exams.calls where attempt_id=p_id;
  cost:=(a.settings->>'call_microcad')::bigint;
  if n>=(a.settings->>'max_calls')::integer or cost>a.budget_remaining then raise exception 'Included exam feedback allowance reached';end if;
  insert into academy_exams.calls(id,attempt_id,input_hash,purpose) values(callid,p_id,p_payload->>'hash',p_payload->>'purpose') returning * into c;
  -- Charge the full reviewed ceiling BEFORE provider dispatch. Timeouts never
  -- free provider budget or retry automatically; usage remains auditable.
  update academy_exams.attempts set budget_remaining=budget_remaining-cost where id=p_id;
  update academy_ai.wallets set reserved_microcad=reserved_microcad-cost,spent_microcad=spent_microcad+cost where user_id=p_user;
  update academy_ai.policy set reserved_microcad=reserved_microcad-cost,spent_microcad=spent_microcad+cost where id;
  insert into academy_exams.ledger(attempt_id,call_id,event,microcad) values(p_id,callid,'provider',cost);
  return to_jsonb(c)||jsonb_build_object('claimed',true);
 end if;
 if p_action='finish-call' then
  if octet_length(p_payload::text)>100000 then raise exception 'Exam feedback too large';end if;
  update academy_exams.calls set status=case when p_payload->'result' is null or p_payload->'result'='null' then 'failed' else 'completed' end,result=p_payload->'result',usage=p_payload->'usage'
  where id=(p_payload->>'callId')::uuid and attempt_id=p_id and status='dispatched' returning * into c;
  if not found then raise exception 'Exam activity already settled';end if;
  return to_jsonb(c);
 end if;
 if p_action='close' then
  if a.closed_at is null then
   if exists(select 1 from academy_exams.calls where attempt_id=p_id and status='dispatched' and created_at>now()-interval '2 minutes') then raise exception 'Wait for the current exam activity before closing';end if;
   update academy_ai.wallets set reserved=reserved-a.credits,reserved_microcad=reserved_microcad-a.budget_remaining where user_id=p_user;
   update academy_ai.policy set reserved_microcad=reserved_microcad-a.budget_remaining where id;
   insert into academy_exams.ledger(attempt_id,event,microcad) values(p_id,'release',a.budget_remaining);
   update academy_exams.attempts set closed_at=now(),budget_remaining=0 where id=p_id returning * into a;
  end if;
  return to_jsonb(a);
 end if;
 raise exception 'Unknown exam operation';
end;$$;
revoke all on function public.academy_exam_catalog(),public.academy_exam_command(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.academy_exam_catalog() to authenticated;
grant execute on function public.academy_exam_command(uuid,text,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
