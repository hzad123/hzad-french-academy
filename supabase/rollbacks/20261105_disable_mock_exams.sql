-- Non-destructive emergency stop; attempts, answers, credit ledger and lessons
-- remain intact. Existing completed reviews remain accessible.
begin;
update academy_exams.catalog set enabled=false;
revoke execute on function public.academy_exam_command(uuid,text,uuid,jsonb) from service_role;
commit;
