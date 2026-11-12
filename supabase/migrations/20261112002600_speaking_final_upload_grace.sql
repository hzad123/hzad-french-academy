-- Capture ends at zero; allow a bounded transport grace for its last WAV.
-- Per-task recorded-second caps, phase ownership and wallet gates remain intact.
begin;
do $$declare definition text;begin
 select pg_get_functiondef('public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position('now()>=a.deadline' in definition)=0 then raise exception 'Review speaking timer before changing final upload window';end if;
 definition:=replace(definition,'now()>=a.deadline','now()>a.deadline+interval ''10 seconds''');
 execute definition;
end;$$;
commit;
