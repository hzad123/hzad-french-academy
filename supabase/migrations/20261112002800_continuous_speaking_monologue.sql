-- One uninterrupted Task3 recording, using the existing turn price and budget.
begin;
alter table academy_tcf_speaking.attempts add column monologue_started_at timestamptz;
do $$declare definition text;begin
 select pg_get_functiondef('public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position('if p_action=''advance'' then' in definition)=0 or position('now()>a.deadline+interval ''10 seconds''' in definition)=0 then raise exception 'Review speaking timing baseline';end if;
 definition:=replace(definition,'if p_action=''advance'' then', $patch$
 if p_action='begin_monologue' then
  if a.phase<>3 or a.pending is not null then raise exception 'Monologue task is not ready';end if;
  if a.monologue_started_at is null then
   update academy_tcf_speaking.attempts set monologue_started_at=now(),
    deadline=case when not exists(select 1 from academy_tcf_speaking.calls where attempt_id=a.id and phase=3) then now()+interval '270 seconds' else deadline end
    where id=a.id returning * into a;
  end if;
  p_action:='read';
 end if;
 if p_action='advance' then$patch$);
 definition:=replace(definition,'now()>a.deadline+interval ''10 seconds''','now()>a.deadline+make_interval(secs=>case a.phase when 3 then 60 else 10 end)');
 execute definition;
 if not exists(select 1 from academy_ai.activities where kind='tcf-speaking-turn' and enabled and credits=10 and model='gpt-audio-mini' and ceiling_microcad=200000 and max_output_tokens=1200) then raise exception 'Review existing speaking price/model/budget';end if;
 update academy_ai.activities set max_output_tokens=2000 where kind='tcf-speaking-turn';
end;$$;
commit;
