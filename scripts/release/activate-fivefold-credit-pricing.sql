-- Run only AFTER verifying public JS and CSS support the credit_scale=100 contract.
-- A centicredit is 0.01 displayed credits, CAD $0.001 retail and CAD $0.0002 estimated cost.
begin;
lock table academy_ai.policy in exclusive mode;
do $activate$
begin
 if (select credit_scale from academy_ai.policy where id)<>1 then raise exception 'Pricing already migrated';end if;
 if exists(select 1 from academy_ai.requests where status in ('reserved','dispatched')) or exists(select 1 from academy_ai.wallets where reserved<>0 or reserved_microcad<>0) then raise exception 'Pending AI reservations: reconcile before activating';end if;
 if exists(select 1 from academy_exams.catalog where enabled) or exists(select 1 from academy_exams.attempts) or exists(select 1 from academy_ai.paid_topups) then raise exception 'Legacy paid credits or full-exam attempts need review before unit migration';end if;
 if exists(select 1 from academy_ai.wallets where available>21474836 or initial_credits>21474836) then raise exception 'Wallet conversion would overflow';end if;
 -- Preserve all existing balances, including the owner testing wallet. No retroactive reduction.
 update academy_ai.wallets set available=available*100,initial_credits=initial_credits*100;
 update academy_ai.requests set credits=credits*100;
 update academy_ai.ledger set credits_delta=credits_delta*100;
 alter table academy_ai.testing_grants drop constraint testing_grants_credits_added_check;
 alter table academy_ai.testing_grants add constraint testing_grants_credits_added_check check(credits_added between 0 and 500000);
 update academy_ai.testing_grants set credits_added=credits_added*100;
 -- These are maximum reservation quotes; successful calls settle estimated actual cost.
 update academy_ai.activities a set credits=q.units,ceiling_microcad=q.units::bigint*200
 from (values ('tutor',35),('writing',35),('pronunciation',65),('conversation',90),('tef-speaking-turn',75),('tef-speaking-feedback',50),('tef-writing',50),('tcf-speaking-turn',200),('tcf-speaking-feedback',50),('tcf-writing',50))q(kind,units)
 where a.kind=q.kind;
 update academy_ai.policy set credit_scale=100,included_credits=10000,student_cap_microcad=2000000,stripe_enabled=false where id;
end;$activate$;
-- Scale any future manual owner testing grants consistently.
CREATE OR REPLACE FUNCTION public.academy_ai_grant_owner_testing(p_user uuid, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w academy_ai.wallets; g academy_ai.testing_grants; added integer;
begin
 perform academy_ai.require_access(p_user);
 if not exists(select 1 from academy_exams.audio_operators where user_id=p_user) then raise exception 'Owner testing permission required' using errcode='42501';end if;
 if p_reference is null or length(p_reference) not between 8 and 120 then raise exception 'Invalid testing reference';end if;
 perform 1 from academy_ai.policy where id for update;
 perform academy_ai.ensure_wallet(p_user);
 select * into w from academy_ai.wallets where user_id=p_user for update;
 if w.user_id is null then raise exception 'AI wallet unavailable';end if;
 select * into g from academy_ai.testing_grants where user_id=p_user;
 if found then
  if g.reference is distinct from p_reference then raise exception 'Testing grant already recorded';end if;
  return jsonb_build_object('alreadyGranted',true,'capMicrocad',g.cap_microcad,'creditsAdded',g.credits_added);
 end if;
 if w.cap_microcad>100000000 or w.spent_microcad+w.reserved_microcad>100000000 then raise exception 'Recorded budget already exceeds the requested testing cap';end if;
 added=greatest(0,((100000000-w.cap_microcad)/(case when (select credit_scale from academy_ai.policy where id)=100 then 200 else 20000 end))::integer);
 insert into academy_ai.testing_grants(user_id,reference,cap_microcad,credits_added) values(p_user,p_reference,100000000,added);
 update academy_ai.wallets set available=available+added,
 testing_budget_microcad=greatest(0,100000000-10000000-purchased_budget_microcad),cap_microcad=100000000 where user_id=p_user;
 return jsonb_build_object('alreadyGranted',false,'capMicrocad',100000000,'creditsAdded',added);
end;$function$

;
commit;
