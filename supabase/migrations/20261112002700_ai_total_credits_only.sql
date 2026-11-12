-- Owner-authorized removal of daily AI counts. Credits/budgets remain authoritative.
begin;
do $$declare definition text; old_line text;begin
 old_line:='if (select count(*) from academy_ai.requests where user_id=p_user and created_at>now()-interval ''24 hours'')>=cfg.daily_limit then raise exception ''Daily AI practice limit reached. Return tomorrow'';end if;';
 select pg_get_functiondef('academy_ai.reserve(uuid,uuid,text,text,text,integer,uuid,text)'::regprocedure) into definition;
 if position(old_line in definition)=0 then raise exception 'Review daily AI count guard before removal';end if;
 execute replace(definition,old_line,'-- Daily AI usage is governed by credits and total budget.');
 old_line:='if (select count(*) from academy_tcf_writing.attempts where user_id=p_user and started_at>now()-interval ''1 day'')>=50 then raise exception ''Daily writing attempt limit reached. Resume a saved test'';end if;';
 select pg_get_functiondef('public.academy_tcf_writing_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position(old_line in definition)=0 then raise exception 'Review daily AI count guard before removal';end if;
 execute replace(definition,old_line,'-- Daily AI usage is governed by credits and total budget.');
 old_line:='if (select count(*) from academy_tcf_speaking.attempts where user_id=p_user and created_at>now()-interval ''1 day'')>=10 then raise exception ''Daily speaking attempt limit reached'';end if;';
 select pg_get_functiondef('public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position(old_line in definition)=0 then raise exception 'Review daily AI count guard before removal';end if;
 execute replace(definition,old_line,'-- Daily AI usage is governed by credits and total budget.');
 old_line:='if (select count(*) from academy_exams.attempts where user_id=p_user and created_at>now()-interval ''24 hours'')>=3 then raise exception ''Daily mock exam limit reached'';end if;';
 select pg_get_functiondef('public.academy_exam_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position(old_line in definition)=0 then raise exception 'Review daily AI count guard before removal';end if;
 execute replace(definition,old_line,'-- Daily AI usage is governed by credits and total budget.');
end;$$;
commit;
