-- Additive AI Learning foundation. Disabled until provider/budget review.
-- No existing lessons, scores, entitlements or student progress are updated.
begin;
create schema academy_ai;
revoke all on schema academy_ai from public,anon,authenticated;
create table academy_ai.policy(
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 -- Null allows all otherwise-entitled learners; deployment probes use an
 -- explicit disposable-user allowlist until release checks are complete.
 allowed_users uuid[],
 topup_url text check(topup_url is null or topup_url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]+(/|$)'),
 included_credits integer check(included_credits between 1 and 100000),
 student_cap_microcad bigint not null default 10000000 check(student_cap_microcad between 1 and 10000000),
 global_cap_microcad bigint not null default 0 check(global_cap_microcad>=0),
 spent_microcad bigint not null default 0 check(spent_microcad>=0),
 reserved_microcad bigint not null default 0 check(reserved_microcad>=0),
 daily_limit integer not null default 20 check(daily_limit between 1 and 100)
);
insert into academy_ai.policy(id) values(true);
create table academy_ai.activities(
 kind text primary key check(kind in ('pronunciation','conversation','writing')),
 enabled boolean not null default false,
 credits integer check(credits between 1 and 10000),
 -- Reviewed worst-case provider cost for bounded input/output, in micro-CAD.
 ceiling_microcad bigint check(ceiling_microcad between 1 and 10000000),
 model text check(length(model) between 1 and 100),
 max_output_tokens integer not null default 1200 check(max_output_tokens between 100 and 2000)
);
insert into academy_ai.activities(kind) values('pronunciation'),('conversation'),('writing');
create table academy_ai.wallets(
 user_id uuid primary key references auth.users(id) on delete cascade,
 initial_credits integer not null check(initial_credits>0),
 available integer not null check(available>=0),
 reserved integer not null default 0 check(reserved>=0),
 spent_microcad bigint not null default 0 check(spent_microcad>=0),
 reserved_microcad bigint not null default 0 check(reserved_microcad>=0),
 purchased_budget_microcad bigint not null default 0 check(purchased_budget_microcad>=0),
 cap_microcad bigint not null check(cap_microcad>0 and cap_microcad<=10000000+purchased_budget_microcad),
 starts_at timestamptz not null,
 expires_at timestamptz not null
);
create table academy_ai.conversations(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 level text not null check(level in ('A0','A1','A2','B1','B2','C1','C2')),
 scenario text not null check(scenario in ('cafe','travel','daily','work','interview','debate')),
 messages jsonb not null default '[]' check(jsonb_typeof(messages)='array' and jsonb_array_length(messages)<=24),
 busy_request uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table academy_ai.requests(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null references academy_ai.activities(kind),
 level text not null check(level in ('A0','A1','A2','B1','B2','C1','C2')),
 input_hash text not null check(input_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'reserved' check(status in ('reserved','dispatched','completed','failed')),
 credits integer not null check(credits>0),
 ceiling_microcad bigint not null check(ceiling_microcad>0),
 model text not null,
 max_output_tokens integer not null,
 conversation_id uuid references academy_ai.conversations(id),
 result jsonb,
 usage jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index ai_request_history on academy_ai.requests(user_id,created_at desc);
create table academy_ai.ledger(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null references academy_ai.requests(id),
 event text not null check(event in ('reserve','charge','refund')),
 credits_delta integer not null,
 microcad bigint not null check(microcad>=0),
 created_at timestamptz not null default now(),
 unique(request_id,event)
);
create table academy_ai.paid_topups(
 payment_reference text primary key check(length(payment_reference) between 8 and 200),
 user_id uuid not null references auth.users(id) on delete cascade,
 credits integer not null check(credits between 1 and 100000),
 budget_microcad bigint not null check(budget_microcad between 1 and 100000000),
 expired_credits integer not null check(expired_credits>=0),
 expires_at timestamptz not null,
 verified_at timestamptz not null default now()
);
alter table academy_ai.policy enable row level security;
alter table academy_ai.activities enable row level security;
alter table academy_ai.wallets enable row level security;
alter table academy_ai.conversations enable row level security;
alter table academy_ai.requests enable row level security;
alter table academy_ai.ledger enable row level security;
alter table academy_ai.paid_topups enable row level security;
revoke all on all tables in schema academy_ai from public,anon,authenticated,service_role;
revoke all on all sequences in schema academy_ai from public,anon,authenticated,service_role;

create function academy_ai.require_access(p_user uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)
 or not exists(select 1 from public.purchase_entitlements e where e.user_id=p_user and e.status='active'
  and e.verified_at is not null and e.access_starts_at<=now() and (e.access_ends_at is null or e.access_ends_at>now())
  and e.product_code in ('HZAD_FULL_ACADEMY','FULL_ACADEMY')) then
  raise exception 'Verified email and active academy access required' using errcode='42501';
 end if;
end;$$;

create function academy_ai.ensure_wallet(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare cfg academy_ai.policy; start_date timestamptz;
begin
 perform academy_ai.require_access(p_user);
 select * into cfg from academy_ai.policy where id;
 if not cfg.enabled or cfg.included_credits is null or (cfg.allowed_users is not null and not (p_user=any(cfg.allowed_users))) then return;end if;
 -- Entitlement date, not the first AI visit; subsequent visits never refill it.
 select min(e.access_starts_at) into start_date from public.purchase_entitlements e where e.user_id=p_user
 and e.status='active' and e.verified_at is not null and e.access_starts_at<=now()
 and (e.access_ends_at is null or e.access_ends_at>now()) and e.product_code in ('HZAD_FULL_ACADEMY','FULL_ACADEMY');
 insert into academy_ai.wallets(user_id,initial_credits,available,cap_microcad,starts_at,expires_at)
 values(p_user,cfg.included_credits,cfg.included_credits,cfg.student_cap_microcad,start_date,start_date+interval '6 months')
 on conflict(user_id) do nothing;
end;$$;

create function academy_ai.state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); cfg academy_ai.policy; w academy_ai.wallets; catalog jsonb; history jsonb;
begin
 perform academy_ai.require_access(u);perform academy_ai.ensure_wallet(u);
 select * into cfg from academy_ai.policy where id;select * into w from academy_ai.wallets where user_id=u;
 select jsonb_object_agg(kind,jsonb_build_object('enabled',enabled and credits is not null and ceiling_microcad is not null and model is not null,'credits',credits)) into catalog from academy_ai.activities;
 select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]') into history from (
  select id,kind,level,status,credits,conversation_id as "conversationId",created_at as "createdAt",result
  from academy_ai.requests where user_id=u and created_at>now()-interval '90 days' order by created_at desc,id desc limit 20
 )h;
 return jsonb_build_object('enabled',cfg.enabled and (cfg.allowed_users is null or u=any(cfg.allowed_users)) and cfg.included_credits is not null and cfg.global_cap_microcad>cfg.spent_microcad+cfg.reserved_microcad,
 'includedCad',cfg.student_cap_microcad/1000000.0,'topUpUrl',cfg.topup_url,
 'wallet',case when w.user_id is null then null else jsonb_build_object('available',case when w.expires_at>now() then w.available else 0 end,'reserved',w.reserved,'expiresAt',w.expires_at,'funding',case when w.purchased_budget_microcad>0 then 'paid' else 'included' end,
 'budgetAvailable',w.spent_microcad+w.reserved_microcad<w.cap_microcad) end,'activities',catalog,'history',history,
 'conversations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from (select id,level,scenario,updated_at as "updatedAt",jsonb_array_length(messages)/2 as turns from academy_ai.conversations where user_id=u and updated_at>now()-interval '90 days' order by updated_at desc limit 5)c));
end;$$;

create function academy_ai.conversation(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s academy_ai.conversations;
begin
 perform academy_ai.require_access(u);select * into s from academy_ai.conversations where id=p_id and user_id=u and updated_at>now()-interval '90 days';
 if not found then raise exception 'Conversation not found' using errcode='42501';end if;
 return jsonb_build_object('id',s.id,'level',s.level,'scenario',s.scenario,'messages',s.messages,'busy',s.busy_request is not null);
end;$$;

create function academy_ai.request_state(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r academy_ai.requests;
begin
 perform academy_ai.require_access(u);select * into r from academy_ai.requests where id=p_id and user_id=u;
 if not found then raise exception 'AI activity not found' using errcode='42501';end if;
 return jsonb_build_object('id',r.id,'kind',r.kind,'level',r.level,'status',r.status,'credits',r.credits,'conversationId',r.conversation_id,'result',r.result);
end;$$;

create function academy_ai.reserve(p_user uuid,p_id uuid,p_kind text,p_level text,p_hash text,p_expected_credits integer,p_session uuid default null,p_scenario text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg academy_ai.policy;a academy_ai.activities;w academy_ai.wallets;r academy_ai.requests;s academy_ai.conversations;
begin
 perform academy_ai.require_access(p_user);
 if p_id is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_level is null or p_level not in ('A0','A1','A2','B1','B2','C1','C2') then raise exception 'Invalid AI request';end if;
 -- One global lock serializes budget reservations across accounts and workers.
 select * into cfg from academy_ai.policy where id for update;
 select * into r from academy_ai.requests where id=p_id;
 if found then
  if r.user_id is distinct from p_user or r.input_hash is distinct from p_hash or r.kind is distinct from p_kind or r.level is distinct from p_level then raise exception 'Request ID already used for another activity' using errcode='42501';end if;
  return jsonb_build_object('id',r.id,'status',r.status,'result',r.result,'credits',r.credits,'conversationId',r.conversation_id);
 end if;
 select * into a from academy_ai.activities where kind=p_kind;
 if not found or not cfg.enabled or (cfg.allowed_users is not null and not (p_user=any(cfg.allowed_users))) or cfg.included_credits is null or not a.enabled or a.credits is null or a.ceiling_microcad is null or a.model is null then raise exception 'AI Learning is not available yet';end if;
 if p_expected_credits is null or p_expected_credits<>a.credits then raise exception 'AI credit price changed. Refresh before starting';end if;
 perform academy_ai.ensure_wallet(p_user);select * into w from academy_ai.wallets where user_id=p_user for update;
 if w.expires_at<=now() then raise exception 'Included AI learning period has ended. Purchase additional AI credits to continue';end if;
 if w.available<a.credits then raise exception 'Not enough AI credits for this activity. A paid top-up is required';end if;
 if w.spent_microcad+w.reserved_microcad+a.ceiling_microcad>w.cap_microcad
 or cfg.spent_microcad+cfg.reserved_microcad+a.ceiling_microcad>cfg.global_cap_microcad then raise exception 'AI study allowance reached. Please contact the academy for paid credit options';end if;
 if (select count(*) from academy_ai.requests where user_id=p_user and created_at>now()-interval '24 hours')>=cfg.daily_limit then raise exception 'Daily AI practice limit reached. Return tomorrow';end if;
 if exists(select 1 from academy_ai.requests where user_id=p_user and status in ('reserved','dispatched')) then raise exception 'An AI activity is already in progress. Check your saved activity';end if;
 if p_kind='conversation' then
  if p_session is null then
   if p_scenario is null or p_scenario not in ('cafe','travel','daily','work','interview','debate') then raise exception 'Choose a conversation scenario';end if;
   insert into academy_ai.conversations(user_id,level,scenario) values(p_user,p_level,p_scenario) returning * into s;
  else
   select * into s from academy_ai.conversations where id=p_session and user_id=p_user for update;
   if not found or s.level<>p_level or s.scenario is distinct from p_scenario then raise exception 'Conversation not found' using errcode='42501';end if;
  end if;
  if s.busy_request is not null then raise exception 'A conversation reply is already in progress';end if;
  if jsonb_array_length(s.messages)>=24 then raise exception 'Conversation complete. Start a new scenario';end if;
  update academy_ai.conversations set busy_request=p_id where id=s.id;
 elsif p_session is not null or p_scenario is not null then raise exception 'Invalid conversation context';end if;
 insert into academy_ai.requests(id,user_id,kind,level,input_hash,credits,ceiling_microcad,model,max_output_tokens,conversation_id)
 values(p_id,p_user,p_kind,p_level,p_hash,a.credits,a.ceiling_microcad,a.model,a.max_output_tokens,s.id);
 update academy_ai.wallets set available=available-a.credits,reserved=reserved+a.credits,reserved_microcad=reserved_microcad+a.ceiling_microcad where user_id=p_user;
 update academy_ai.policy set reserved_microcad=reserved_microcad+a.ceiling_microcad where id;
 insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad) values(p_user,p_id,'reserve',-a.credits,a.ceiling_microcad);
 return jsonb_build_object('id',p_id,'status','reserved','credits',a.credits,'conversationId',s.id);
end;$$;

create function academy_ai.claim(p_user uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r academy_ai.requests;a academy_ai.activities;s academy_ai.conversations;
begin
 perform academy_ai.require_access(p_user);
 select * into r from academy_ai.requests where id=p_id and user_id=p_user for update;
 if not found or r.status<>'reserved' then return jsonb_build_object('claimed',false);end if;
 if not exists(select 1 from academy_ai.policy where id and enabled and (allowed_users is null or p_user=any(allowed_users))) then raise exception 'AI Learning is paused';end if;
 select * into a from academy_ai.activities where kind=r.kind;
 if not a.enabled then raise exception 'This trainer is paused';end if;
 if r.conversation_id is not null then select * into s from academy_ai.conversations where id=r.conversation_id;end if;
 update academy_ai.requests set status='dispatched',updated_at=now() where id=p_id;
 return jsonb_build_object('claimed',true,'model',r.model,'maxOutputTokens',r.max_output_tokens,'messages',coalesce(s.messages,'[]'),'conversationId',r.conversation_id);
end;$$;

create function academy_ai.finish(p_user uuid,p_id uuid,p_result jsonb,p_usage jsonb,p_student_text text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r academy_ai.requests;
begin
 -- Budget lock order matches reserve/fail to prevent concurrent deadlocks.
 perform 1 from academy_ai.policy where id for update;
 select * into r from academy_ai.requests where id=p_id and user_id=p_user for update;
 if not found then raise exception 'AI activity not found';end if;
 if r.status='completed' then return jsonb_build_object('id',r.id,'status',r.status,'credits',r.credits,'conversationId',r.conversation_id,'result',r.result);end if;
 if r.status<>'dispatched' or p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>24000
 or p_usage is null or jsonb_typeof(p_usage)<>'object' or octet_length(p_usage::text)>2000 then raise exception 'Invalid AI completion';end if;
 if r.conversation_id is not null then
  if p_student_text is null or length(p_student_text)>2000 or length(coalesce(p_result->>'reply','')) not between 1 and 2000 then raise exception 'Invalid conversation reply';end if;
  update academy_ai.conversations set messages=messages||jsonb_build_array(jsonb_build_object('role','user','content',p_student_text),jsonb_build_object('role','assistant','content',p_result->>'reply')),
  busy_request=null,updated_at=now() where id=r.conversation_id and busy_request=p_id;
  if not found then raise exception 'Conversation reservation changed';end if;
 end if;
 update academy_ai.requests set status='completed',result=p_result,usage=p_usage,updated_at=now() where id=p_id;
 -- Conservatively consume the whole reviewed ceiling, never a browser estimate.
 update academy_ai.wallets set reserved=reserved-r.credits,reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+r.ceiling_microcad where user_id=p_user;
 update academy_ai.policy set reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+r.ceiling_microcad where id;
 insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad) values(p_user,p_id,'charge',0,r.ceiling_microcad);
 return jsonb_build_object('id',r.id,'status','completed','credits',r.credits,'conversationId',r.conversation_id,'result',p_result);
end;$$;

create function academy_ai.fail(p_user uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r academy_ai.requests;spent bigint;
begin
 perform 1 from academy_ai.policy where id for update;
 select * into r from academy_ai.requests where id=p_id and user_id=p_user for update;
 if not found or r.status not in ('reserved','dispatched') then return;end if;
 -- A timeout may still be billed. Refund the learner; retain that cost ceiling.
 spent:=case when r.status='dispatched' then r.ceiling_microcad else 0 end;
 update academy_ai.wallets set available=available+r.credits,reserved=reserved-r.credits,reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+spent where user_id=p_user;
 update academy_ai.policy set reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+spent where id;
 update academy_ai.requests set status='failed',updated_at=now() where id=p_id;
 update academy_ai.conversations set busy_request=null where id=r.conversation_id and busy_request=p_id;
 insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad) values(p_user,p_id,'refund',r.credits,spent);
end;$$;

create function public.academy_ai_state() returns jsonb language sql security invoker set search_path='' as $$select academy_ai.state()$$;
create function public.academy_ai_request(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select academy_ai.request_state(p_id)$$;
create function public.academy_ai_conversation(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select academy_ai.conversation(p_id)$$;
create function public.academy_ai_reserve(p_user uuid,p_id uuid,p_kind text,p_level text,p_hash text,p_expected_credits integer,p_session uuid default null,p_scenario text default null) returns jsonb language sql security invoker set search_path='' as $$select academy_ai.reserve(p_user,p_id,p_kind,p_level,p_hash,p_expected_credits,p_session,p_scenario)$$;
create function public.academy_ai_claim(p_user uuid,p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select academy_ai.claim(p_user,p_id)$$;
create function public.academy_ai_finish(p_user uuid,p_id uuid,p_result jsonb,p_usage jsonb,p_student_text text default null) returns jsonb language sql security invoker set search_path='' as $$select academy_ai.finish(p_user,p_id,p_result,p_usage,p_student_text)$$;
create function public.academy_ai_fail(p_user uuid,p_id uuid) returns void language sql security invoker set search_path='' as $$select academy_ai.fail(p_user,p_id)$$;
create function academy_ai.maintenance() returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;reconciled integer:=0;purged integer;
begin
 for r in select id,user_id from academy_ai.requests where status in ('reserved','dispatched') and updated_at<now()-interval '15 minutes' loop
  perform academy_ai.fail(r.user_id,r.id);reconciled:=reconciled+1;
 end loop;
 update academy_ai.requests set result=null where result is not null and created_at<now()-interval '90 days';get diagnostics purged=row_count;
 update academy_ai.conversations set messages='[]' where messages<>'[]' and updated_at<now()-interval '90 days';
 return jsonb_build_object('reconciled',reconciled,'feedbackPurged',purged);
end;$$;
create function public.academy_ai_maintenance() returns jsonb language sql security invoker set search_path='' as $$select academy_ai.maintenance()$$;
-- Administrative payment reconciliation only. The caller must independently
-- verify the receipt with the payment provider; learner claims never grant credit.
create function academy_ai.paid_topup(p_user uuid,p_payment_reference text,p_credits integer,p_budget_microcad bigint,p_expires_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w academy_ai.wallets;existing academy_ai.paid_topups;
begin
 perform academy_ai.require_access(p_user);
 if p_payment_reference is null or length(p_payment_reference) not between 8 and 200 or p_credits is null or p_credits not between 1 and 100000
 or p_budget_microcad is null or p_budget_microcad not between 1 and 100000000 or p_expires_at is null
 or p_expires_at<=now() or p_expires_at>now()+interval '1 year' then raise exception 'Invalid verified payment';end if;
 perform 1 from academy_ai.policy where id for update;
 select * into existing from academy_ai.paid_topups where payment_reference=p_payment_reference;
 if found then
  if existing.user_id is distinct from p_user or existing.credits<>p_credits or existing.budget_microcad<>p_budget_microcad or existing.expires_at<>p_expires_at then raise exception 'Payment reference already used';end if;
  return jsonb_build_object('credited',false,'alreadyRecorded',true);
 end if;
 select * into w from academy_ai.wallets where user_id=p_user for update;
 if not found then raise exception 'AI wallet not found';end if;
 if w.reserved>0 then raise exception 'Reconcile pending AI practice before applying a top-up';end if;
 if w.expires_at>now() and w.available>0 and w.spent_microcad<w.cap_microcad then raise exception 'Use the current AI allowance before adding a top-up';end if;
 insert into academy_ai.paid_topups(payment_reference,user_id,credits,budget_microcad,expired_credits,expires_at)
 values(p_payment_reference,p_user,p_credits,p_budget_microcad,w.available,p_expires_at);
 update academy_ai.wallets set available=p_credits,cap_microcad=spent_microcad+p_budget_microcad,
 purchased_budget_microcad=purchased_budget_microcad+p_budget_microcad,expires_at=p_expires_at where user_id=p_user;
 return jsonb_build_object('credited',true,'credits',p_credits);
end;$$;
create function public.academy_ai_paid_topup(p_user uuid,p_payment_reference text,p_credits integer,p_budget_microcad bigint,p_expires_at timestamptz) returns jsonb
language sql security invoker set search_path='' as $$select academy_ai.paid_topup(p_user,p_payment_reference,p_credits,p_budget_microcad,p_expires_at)$$;
revoke all on all functions in schema academy_ai from public,anon,authenticated,service_role;
grant usage on schema academy_ai to authenticated,service_role;
grant execute on function academy_ai.state(),academy_ai.request_state(uuid),academy_ai.conversation(uuid) to authenticated;
grant execute on function academy_ai.reserve(uuid,uuid,text,text,text,integer,uuid,text),academy_ai.claim(uuid,uuid),academy_ai.finish(uuid,uuid,jsonb,jsonb,text),academy_ai.fail(uuid,uuid),academy_ai.maintenance() to service_role;
grant execute on function academy_ai.paid_topup(uuid,text,integer,bigint,timestamptz) to service_role;
revoke all on function public.academy_ai_state(),public.academy_ai_request(uuid),public.academy_ai_conversation(uuid),public.academy_ai_reserve(uuid,uuid,text,text,text,integer,uuid,text),public.academy_ai_claim(uuid,uuid),public.academy_ai_finish(uuid,uuid,jsonb,jsonb,text),public.academy_ai_fail(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_ai_state(),public.academy_ai_request(uuid),public.academy_ai_conversation(uuid) to authenticated;
grant execute on function public.academy_ai_reserve(uuid,uuid,text,text,text,integer,uuid,text),public.academy_ai_claim(uuid,uuid),public.academy_ai_finish(uuid,uuid,jsonb,jsonb,text),public.academy_ai_fail(uuid,uuid) to service_role;
revoke all on function public.academy_ai_maintenance() from public,anon,authenticated;
grant execute on function public.academy_ai_maintenance() to service_role;
revoke all on function public.academy_ai_paid_topup(uuid,text,integer,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.academy_ai_paid_topup(uuid,text,integer,bigint,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
