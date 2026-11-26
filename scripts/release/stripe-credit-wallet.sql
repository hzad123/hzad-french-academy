-- Stage 1: authenticated wallet read and fail-closed payment infrastructure.
begin;
alter table academy_ai.policy add column if not exists credit_scale integer not null default 1 check(credit_scale in (1,100));
alter table academy_ai.policy add column if not exists stripe_enabled boolean not null default false;
alter table academy_ai.wallets add column if not exists payment_hold boolean not null default false;
create table if not exists academy_ai.stripe_orders(
 id uuid primary key, user_id uuid not null references auth.users(id),
 cents integer not null check(cents in (1000,2000,3000)),
 credits integer not null check(credits in (10000,20000,30000)),
 budget_microcad bigint not null check(budget_microcad in (2000000,4000000,6000000)),
 session_id text unique, payment_intent text unique,
 status text not null default 'created' check(status in ('created','paid','review')),
 created_at timestamptz not null default now(), paid_at timestamptz, review_reason text
);
alter table academy_ai.stripe_orders enable row level security;
revoke all on academy_ai.stripe_orders from public,anon,authenticated;
create index if not exists academy_stripe_orders_user_idx on academy_ai.stripe_orders(user_id,created_at desc);
create or replace function academy_ai.credit_wallet() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare u uuid:=auth.uid(); w academy_ai.wallets; p academy_ai.policy;
begin
 perform academy_ai.require_access(u);perform academy_ai.ensure_wallet(u);
 select * into p from academy_ai.policy where id;
 select * into w from academy_ai.wallets where user_id=u;
 return jsonb_build_object('scale',p.credit_scale,'available',case when w.expires_at>now() then coalesce(w.available,0) else 0 end,'reserved',coalesce(w.reserved,0),'expiresAt',w.expires_at,'paymentHold',coalesce(w.payment_hold,false),'topupsEnabled',p.stripe_enabled and p.credit_scale=100 and p.enabled and not coalesce(w.payment_hold,false) and coalesce(w.testing_budget_microcad,0)=0,'budgetAvailable',coalesce(w.spent_microcad+w.reserved_microcad<w.cap_microcad,false),'lastCharge',(select jsonb_build_object('kind',kind,'credits',credits,'at',updated_at) from academy_ai.requests where user_id=u and status='completed' order by updated_at desc limit 1),'activities',(select jsonb_object_agg(kind,jsonb_build_object('credits',credits,'enabled',enabled)) from academy_ai.activities));
end;$fn$;
revoke all on function academy_ai.credit_wallet() from public,anon;
grant execute on function academy_ai.credit_wallet() to authenticated;
create or replace function public.academy_credit_wallet() returns jsonb language sql set search_path='' as $fn$ select academy_ai.credit_wallet() $fn$;
revoke all on function public.academy_credit_wallet() from public,anon;
grant execute on function public.academy_credit_wallet() to authenticated;
-- Orders originate on the authenticated server, never from price/credit values sent by clients.
create or replace function academy_ai.stripe_prepare(p_user uuid,p_id uuid,p_cents integer) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare p academy_ai.policy; w academy_ai.wallets; o academy_ai.stripe_orders;
begin
 perform academy_ai.require_access(p_user);
 select * into p from academy_ai.policy where id for update;
 if not p.stripe_enabled or p.credit_scale<>100 or not p.enabled then raise exception 'Credit purchases are not enabled';end if;
 if p_id is null or p_cents is null or p_cents not in (1000,2000,3000) then raise exception 'Invalid package';end if;
 perform academy_ai.ensure_wallet(p_user);
 select * into w from academy_ai.wallets where user_id=p_user for update;
 if not found or w.payment_hold or w.testing_budget_microcad>0 then raise exception 'Payment review required';end if;
 select * into o from academy_ai.stripe_orders where id=p_id;
 if found then
  if o.user_id<>p_user or o.cents<>p_cents or o.status<>'created' or o.created_at<now()-interval '23 hours' then raise exception 'Invalid order';end if;
 else
  if (select count(*) from academy_ai.stripe_orders where user_id=p_user and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many checkout requests';end if;
  insert into academy_ai.stripe_orders(id,user_id,cents,credits,budget_microcad) values(p_id,p_user,p_cents,p_cents*10,p_cents::bigint*2000) returning * into o;
 end if;
 return jsonb_build_object('id',o.id,'cents',o.cents,'credits',o.credits,'sessionId',o.session_id);
end;$fn$;
create or replace function academy_ai.stripe_fulfill(p_id uuid,p_session text,p_intent text,p_cents integer) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare o academy_ai.stripe_orders; w academy_ai.wallets; expiry timestamptz;
begin
 -- A verified Stripe event and authenticated API retrieval are prerequisites in the edge handler.
 perform 1 from academy_ai.policy where id for update;
 select * into o from academy_ai.stripe_orders where id=p_id for update;
 if not found or p_cents is distinct from o.cents or p_session is null or p_session !~ '^cs_live_[A-Za-z0-9_]+$' or p_intent is null or p_intent !~ '^pi_[A-Za-z0-9_]+$' then raise exception 'Invalid verified checkout';end if;
 if o.session_id is distinct from p_session then raise exception 'Checkout session was not bound to this order';end if;
 if o.status='review' then raise exception 'Payment under review';end if;
 if o.status='paid' then
  if o.session_id is distinct from p_session or o.payment_intent is distinct from p_intent then raise exception 'Payment reference mismatch';end if;
  return jsonb_build_object('credited',false,'alreadyRecorded',true);
 end if;
 select * into w from academy_ai.wallets where user_id=o.user_id for update;
 if not found then raise exception 'Wallet not found';end if;
 expiry:=greatest(w.expires_at,now()+interval '6 months');
 insert into academy_ai.paid_topups(payment_reference,user_id,credits,budget_microcad,expired_credits,expires_at)
 values(p_session,o.user_id,o.credits,o.budget_microcad,case when w.expires_at<=now() then w.available else 0 end,expiry);
 update academy_ai.wallets set available=(case when w.expires_at>now() then w.available else 0 end)+o.credits,
 cap_microcad=w.cap_microcad+o.budget_microcad,
 purchased_budget_microcad=w.purchased_budget_microcad+o.budget_microcad,expires_at=expiry where user_id=o.user_id;
 update academy_ai.stripe_orders set status='paid',session_id=p_session,payment_intent=p_intent,paid_at=now() where id=o.id;
 return jsonb_build_object('credited',true,'credits',o.credits);
end;$fn$;
-- Refunds/disputes hold the wallet for reconciliation. Never silently remove unrelated credits.
create or replace function academy_ai.stripe_review(p_id uuid,p_intent text,p_reason text) returns void language plpgsql security definer set search_path='' as $fn$
declare o academy_ai.stripe_orders;
begin
 perform 1 from academy_ai.policy where id for update;
 select * into o from academy_ai.stripe_orders where (payment_intent=p_intent or (id=p_id and payment_intent is null)) for update;
 if not found then return;end if;
 if p_reason not in ('refund','dispute') or p_intent is null or p_intent !~ '^pi_[A-Za-z0-9_]+$' then raise exception 'Invalid review';end if;
 update academy_ai.stripe_orders set status='review',payment_intent=p_intent,review_reason=p_reason where id=o.id;
 update academy_ai.wallets set payment_hold=true where user_id=o.user_id;
end;$fn$;
create or replace function academy_ai.guard_payment_hold() returns trigger language plpgsql set search_path='' as $fn$
begin
 if old.payment_hold and (new.available<old.available or new.reserved>old.reserved) then raise exception 'Payment review required';end if;
 return new;
end;$fn$;
drop trigger if exists academy_payment_hold on academy_ai.wallets;
create trigger academy_payment_hold before update on academy_ai.wallets for each row execute function academy_ai.guard_payment_hold();
create or replace function public.academy_stripe_prepare(p_user uuid,p_id uuid,p_cents integer) returns jsonb language sql set search_path='' as $fn$ select academy_ai.stripe_prepare(p_user,p_id,p_cents) $fn$;
create or replace function public.academy_stripe_fulfill(p_id uuid,p_session text,p_intent text,p_cents integer) returns jsonb language sql set search_path='' as $fn$ select academy_ai.stripe_fulfill(p_id,p_session,p_intent,p_cents) $fn$;
create or replace function public.academy_stripe_review(p_id uuid,p_intent text,p_reason text) returns void language sql set search_path='' as $fn$ select academy_ai.stripe_review(p_id,p_intent,p_reason) $fn$;
revoke all on function academy_ai.stripe_prepare(uuid,uuid,integer),academy_ai.stripe_fulfill(uuid,text,text,integer),academy_ai.stripe_review(uuid,text,text),public.academy_stripe_prepare(uuid,uuid,integer),public.academy_stripe_fulfill(uuid,text,text,integer),public.academy_stripe_review(uuid,text,text) from public,anon,authenticated;
grant execute on function academy_ai.stripe_prepare(uuid,uuid,integer),academy_ai.stripe_fulfill(uuid,text,text,integer),academy_ai.stripe_review(uuid,text,text),public.academy_stripe_prepare(uuid,uuid,integer),public.academy_stripe_fulfill(uuid,text,text,integer),public.academy_stripe_review(uuid,text,text) to service_role;
create or replace function academy_ai.stripe_bind_session(p_user uuid,p_id uuid,p_session text) returns void language plpgsql security definer set search_path='' as $fn$
declare o academy_ai.stripe_orders;
begin
 select * into o from academy_ai.stripe_orders where id=p_id and user_id=p_user for update;
 if not found or o.status<>'created' or p_session is null or p_session !~ '^cs_live_[A-Za-z0-9_]+$' or (o.session_id is not null and o.session_id<>p_session) then raise exception 'Invalid checkout binding';end if;
 update academy_ai.stripe_orders set session_id=p_session where id=p_id;
end;$fn$;
create or replace function public.academy_stripe_bind_session(p_user uuid,p_id uuid,p_session text) returns void language sql set search_path='' as $fn$ select academy_ai.stripe_bind_session(p_user,p_id,p_session) $fn$;
revoke all on function academy_ai.stripe_bind_session(uuid,uuid,text),public.academy_stripe_bind_session(uuid,uuid,text) from public,anon,authenticated;
grant execute on function academy_ai.stripe_bind_session(uuid,uuid,text),public.academy_stripe_bind_session(uuid,uuid,text) to service_role;
commit;