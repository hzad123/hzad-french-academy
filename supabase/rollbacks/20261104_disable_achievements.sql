-- MANUAL, REVIEWED disable. Retain XP, study days, attempts and certificates.
-- Keep certificate_get/verify available so existing awards remain verifiable.
begin;
drop trigger if exists academy_lesson_reward on public.academy_learning_progress;
drop trigger if exists academy_revision_reward on academy_tracker.evidence;
revoke execute on function public.academy_rewards_state(text),public.academy_rewards_preferences(text,text,text),public.academy_final_start(text,boolean),public.academy_final_answer(uuid,text,integer,boolean) from authenticated;
revoke execute on function academy_achievements.rewards(text),academy_achievements.preferences(text,text,text),academy_achievements.exam_start(text,boolean),academy_achievements.exam_answer(uuid,text,integer,boolean) from authenticated;
notify pgrst,'reload schema';
commit;
