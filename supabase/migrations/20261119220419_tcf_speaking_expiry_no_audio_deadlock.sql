-- TCF Speaking: a failed/quiet microphone turn or in-flight AI reply must
-- never hold the student on a timed task after its server deadline.
-- Preserve existing attempts, calls, credit accounting, access and grants.
-- Patch the live public RPC definition cautiously because earlier migrations
-- have extended its paper/version validation and monologue semantics.
DO $migration$
DECLARE
  source_definition text;
  updated_definition text;
  pending_guard_old text := $search$
 if p_action='advance' then
  if a.pending is not null then raise exception 'Check the pending examiner reply first';end if;$search$;
  pending_guard_new text := $replace$
 if p_action='advance' then
  -- At deadline, navigation wins over a slow/failed inference. Calls already
  -- reserved or dispatched remain in the ledger and finish independently.
  if a.pending is not null and now()<a.deadline then raise exception 'Check the pending examiner reply first';end if;$replace$;
  reconcile_old text := $search$deadline=deadline+least(now()-c.started_at,interval '90 seconds'),pending=null$search$;
  reconcile_new text := $replace$deadline=case when now()>=deadline then deadline else deadline+least(now()-c.started_at,interval '90 seconds') end,pending=null$replace$;
  advance_old text := $search$update academy_tcf_speaking.attempts set phase=phase+1,deadline=now()+make_interval(secs=>case a.phase when 0 then 120 when 1 then 210 when 2 then 270 else 0 end) where id=a.id returning * into a;$search$;
  advance_new text := $replace$update academy_tcf_speaking.attempts set phase=phase+1,deadline=now()+make_interval(secs=>case a.phase when 0 then 120 when 1 then 210 when 2 then 270 else 0 end),pending=null where id=a.id returning * into a;$replace$;
BEGIN
  SELECT pg_get_functiondef('public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)'::regprocedure)
    INTO source_definition;
  IF source_definition IS NULL THEN
    RAISE EXCEPTION 'TCF speaking command is missing';
  END IF;
  -- Fail closed if production's RPC has changed; never overwrite unrelated
  -- security or current-paper logic with a stale copy from an old migration.
  IF (length(source_definition)-length(replace(source_definition,pending_guard_old,'')))/length(pending_guard_old)<>1
    OR (length(source_definition)-length(replace(source_definition,reconcile_old,'')))/length(reconcile_old)<>1
    OR (length(source_definition)-length(replace(source_definition,advance_old,'')))/length(advance_old)<>1
  THEN
    RAISE EXCEPTION 'TCF speaking command drift; review deployed RPC before updating';
  END IF;
  updated_definition := replace(source_definition,pending_guard_old,pending_guard_new);
  updated_definition := replace(updated_definition,reconcile_old,reconcile_new);
  updated_definition := replace(updated_definition,advance_old,advance_new);
  EXECUTE updated_definition;
END $migration$;
