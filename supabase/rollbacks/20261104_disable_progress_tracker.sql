-- Review before applying. Restore original quiz grading; preserve all tracker data.
begin;
revoke execute on function public.academy_tracker_snapshot(integer),public.academy_tracker_preferences(integer,text),public.academy_tracker_revise(text,text,integer) from authenticated;
revoke execute on function academy_tracker.snapshot(integer),academy_tracker.save_preferences(integer,text),academy_tracker.revise(text,text,integer),academy_tracker.check_answer(text,text,integer) from authenticated;
drop function public.academy_check_answer(text,text,integer);
alter function academy_tracker.grade_answer(text,text,integer) set schema public;
alter function public.grade_answer(text,text,integer) rename to academy_check_answer;
grant execute on function public.academy_check_answer(text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
