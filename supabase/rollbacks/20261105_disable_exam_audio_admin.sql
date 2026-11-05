-- Stops generation/review without deleting recordings or any student data.
begin;
revoke execute on function public.academy_exam_audio_command(uuid,text,text,text,uuid,jsonb) from service_role;
commit;
