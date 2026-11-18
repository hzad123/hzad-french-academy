-- TEF writing practice: both writing sections editable for the full test.
-- Preserve attempts, responses, timestamps, credit events, RLS and authorization.
begin;
do $tef_unlock$
declare
 fn text;
 before_clause text := 'if now()>=a.started_at+interval ''25 minutes'' and answers->>0 is distinct from a.responses->>0 then raise exception ''Section A is closed'';end if;';
 before_clause_b text := 'if now()<a.started_at+interval ''25 minutes'' and answers->>1 is distinct from a.responses->>1 then raise exception ''Section B has not started'';end if;';
 before_submit text := 'if now()<a.started_at+interval ''25 minutes'' then raise exception ''Section B has not started'';end if;';
begin
 fn:=pg_get_functiondef('public.academy_tef_writing_command(uuid,text,uuid,jsonb)'::regprocedure);
 if fn is null or position(before_clause in fn)=0 or position(before_clause_b in fn)=0 or position(before_submit in fn)=0 then
  raise exception 'TEF writing backend differs from reviewed section-lock implementation';
 end if;
 fn:=replace(fn,before_clause,'');
 fn:=replace(fn,before_clause_b,'');
 fn:=replace(fn,before_submit,'');
 execute fn;
 if has_function_privilege('anon','public.academy_tef_writing_command(uuid,text,uuid,jsonb)','execute')
  or has_function_privilege('authenticated','public.academy_tef_writing_command(uuid,text,uuid,jsonb)','execute')
  or not has_function_privilege('service_role','public.academy_tef_writing_command(uuid,text,uuid,jsonb)','execute')
 then raise exception 'TEF backend security checks failed';end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='academy_tef_writing' and c.relname='attempts' and c.relrowsecurity)
 then raise exception 'TEF writing RLS missing';end if;
end;
$tef_unlock$;
commit;
