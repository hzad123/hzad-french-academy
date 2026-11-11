-- Explicitly authorized owner-only testing exception. No payment is fabricated.
-- Ordinary included allowances remain CAD 10; there is no shared cap.
begin;
alter table academy_ai.wallets add column testing_budget_microcad bigint not null default 0 check(testing_budget_microcad between 0 and 90000000);
do $$declare name text;begin
 select conname into name from pg_constraint where conrelid='academy_ai.wallets'::regclass and contype='c' and pg_get_constraintdef(oid) like '%cap_microcad%' and pg_get_constraintdef(oid) like '%purchased_budget_microcad%';
 if name is null then raise exception 'Review the current wallet cap constraint';end if;
 execute format('alter table academy_ai.wallets drop constraint %I',name);
end;$$;
alter table academy_ai.wallets add constraint wallets_cap_microcad_check check(
 cap_microcad>0 and cap_microcad<=10000000+purchased_budget_microcad+testing_budget_microcad
 and (testing_budget_microcad=0 or cap_microcad<=100000000));
create table academy_ai.testing_grants(
 user_id uuid primary key references auth.users(id),
 reference text unique not null check(length(reference) between 8 and 120),
 cap_microcad bigint not null check(cap_microcad=100000000),
 credits_added integer not null check(credits_added between 0 and 4500),
 granted_at timestamptz not null default now()
);
alter table academy_ai.testing_grants enable row level security;
revoke all on academy_ai.testing_grants from public,anon,authenticated,service_role;
create function public.academy_ai_grant_owner_testing(p_user uuid,p_reference text) returns jsonb
language plpgsql security definer set search_path='' as $$
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
 added=greatest(0,((100000000-w.cap_microcad)/20000)::integer);
 insert into academy_ai.testing_grants(user_id,reference,cap_microcad,credits_added) values(p_user,p_reference,100000000,added);
 update academy_ai.wallets set available=available+added,
 testing_budget_microcad=greatest(0,100000000-10000000-purchased_budget_microcad),cap_microcad=100000000 where user_id=p_user;
 return jsonb_build_object('alreadyGranted',false,'capMicrocad',100000000,'creditsAdded',added);
end;$$;
revoke all on function public.academy_ai_grant_owner_testing(uuid,text) from public,anon,authenticated;
grant execute on function public.academy_ai_grant_owner_testing(uuid,text) to service_role;
-- Keep the deployed nullable-global-cap logic and all wallet/history semantics.
do $$declare definition text;begin
 select pg_get_functiondef('academy_ai.state()'::regprocedure) into definition;
 if position('''includedCad'',cfg.student_cap_microcad/1000000.0,' in definition)=0 then raise exception 'Review AI state before adding testing metadata';end if;
 definition:=replace(definition,'''includedCad'',cfg.student_cap_microcad/1000000.0,',
 '''testingCad'',case when w.testing_budget_microcad>0 then w.cap_microcad/1000000.0 else null end,''includedCad'',cfg.student_cap_microcad/1000000.0,');
 definition:=replace(definition,'case when w.purchased_budget_microcad>0 then ''paid'' else ''included'' end',
 'case when w.testing_budget_microcad>0 then ''testing'' when w.purchased_budget_microcad>0 then ''paid'' else ''included'' end');
 definition:=replace(definition,'''budgetAvailable'',w.spent_microcad', '''capCad'',w.cap_microcad/1000000.0,''budgetAvailable'',w.spent_microcad');
 execute definition;
end;$$;
commit;
