-- Append this test inside the activation transaction, replacing its COMMIT with ROLLBACK.
do $test$
declare u uuid; o uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); w academy_ai.wallets; result jsonb;
begin
 select user_id into u from academy_ai.wallets where not payment_hold and expires_at>now() limit 1;
 if u is null then raise exception 'No test fixture';end if;
 update academy_ai.wallets set available=10000,initial_credits=10000,cap_microcad=2000000,spent_microcad=0,testing_budget_microcad=0,purchased_budget_microcad=0 where user_id=u;
 perform academy_ai.reserve(u,req,'writing','A1',repeat('a',64),35,null,null);
 perform academy_ai.claim(u,req);
 result:=academy_ai.finish(u,req,'{"correctedText":"Bonjour."}'::jsonb,'{"model":"gpt-4o-mini","prompt_tokens":100,"completion_tokens":100}'::jsonb,null);
 select * into w from academy_ai.wallets where user_id=u;
 if (result->>'credits')::int<>1 or w.available<>9999 or w.reserved<>0 or w.spent_microcad<>109 then raise exception 'Settlement mismatch';end if;
 perform academy_ai.finish(u,req,'{}'::jsonb,'{}'::jsonb,null);
 if (select available from academy_ai.wallets where user_id=u)<>9999 then raise exception 'Duplicate AI charge';end if;
 update academy_ai.policy set stripe_enabled=true where id;
 perform academy_ai.stripe_prepare(u,o,1000);
 perform academy_ai.stripe_bind_session(u,o,'cs_live_test_fixture_123');
 begin perform academy_ai.stripe_fulfill(o,'cs_live_wrong','pi_test_fixture_123',1000);raise exception 'Wrong session accepted';exception when others then if sqlerrm='Wrong session accepted' then raise;end if;end;
 begin perform academy_ai.stripe_fulfill(o,'cs_live_test_fixture_123','pi_test_fixture_123',2000);raise exception 'Wrong amount accepted';exception when others then if sqlerrm='Wrong amount accepted' then raise;end if;end;
 result:=academy_ai.stripe_fulfill(o,'cs_live_test_fixture_123','pi_test_fixture_123',1000);
 if not (result->>'credited')::boolean then raise exception 'Fulfillment failed';end if;
 select * into w from academy_ai.wallets where user_id=u;
 if w.available<>19999 or w.cap_microcad<>4000000 then raise exception 'Top-up mismatch';end if;
 result:=academy_ai.stripe_fulfill(o,'cs_live_test_fixture_123','pi_test_fixture_123',1000);
 if (result->>'credited')::boolean or (select available from academy_ai.wallets where user_id=u)<>19999 then raise exception 'Duplicate payment credited';end if;
 perform academy_ai.stripe_review(o,'pi_test_fixture_123','refund');
 if not (select payment_hold from academy_ai.wallets where user_id=u) then raise exception 'Refund hold not set';end if;
 if has_function_privilege('authenticated','public.academy_stripe_fulfill(uuid,text,text,integer)','execute') or has_function_privilege('anon','public.academy_stripe_prepare(uuid,uuid,integer)','execute') then raise exception 'Unauthorized fulfillment permissions';end if;
end;$test$;
