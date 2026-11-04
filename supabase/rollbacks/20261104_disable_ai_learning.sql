-- Stops new model calls without deleting wallets, ledger, conversations or feedback.
begin;
update academy_ai.policy set enabled=false where id;
revoke execute on function public.academy_ai_reserve(uuid,uuid,text,text,text,integer,uuid,text),public.academy_ai_claim(uuid,uuid) from service_role;
-- Keep finish/fail available to reconcile in-flight requests and release holds.
notify pgrst,'reload schema';
commit;
