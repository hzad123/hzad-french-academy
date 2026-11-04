-- MANUAL, REVIEWED DISABLE ONLY. Retains all assessment history and bank data.
-- Restore previous frontend assets separately. Do not run during implementation.
begin;
revoke execute on function public.academy_placement_state(uuid), public.academy_placement_start(), public.academy_placement_answer(uuid,text,integer,text) from authenticated;
revoke execute on function academy_placement.state(uuid), academy_placement.start(), academy_placement.answer(uuid,text,integer,text) from authenticated;
commit;
