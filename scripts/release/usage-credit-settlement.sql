-- Cost rates are micro-USD per token; use a conservative 1.45 CAD/USD conversion.
-- Estimates are not provider invoices. Missing/unrecognized usage retains the quoted ceiling.
create or replace function academy_ai.estimate_request_microcad(p_kind text,p_model text,p_usage jsonb,p_result jsonb) returns bigint language plpgsql immutable set search_path='' as $fn$
declare m text:=coalesce(p_usage->>'model',p_model); i numeric; o numeric; a numeric:=0; sec numeric:=0; usd numeric:=0; speech boolean:=p_kind in ('tef-speaking-turn','tcf-speaking-turn');
begin
 if speech then
  if jsonb_typeof(p_result->'seconds') is distinct from 'number' then return null;end if;
  sec:=(p_result->>'seconds')::numeric;
  if sec<0 or sec>270 then return null;end if;
  -- Independent speech recognizer: use the more expensive configured transcription rate.
  usd:=sec*75;
 end if;
 if jsonb_typeof(p_usage->'prompt_tokens')='number' and jsonb_typeof(p_usage->'completion_tokens')='number' then
  i:=(p_usage->>'prompt_tokens')::numeric;o:=(p_usage->>'completion_tokens')::numeric;
  if i<0 or o<0 or i>1000000 or o>100000 or trunc(i)<>i or trunc(o)<>o then return null;end if;
  if m='gpt-4o-mini' or m like 'gpt-4o-mini-2024-%' then usd:=usd+i*.15+o*.60;
  elsif m='gpt-audio-mini' or m like 'gpt-audio-mini-%' then
   if speech then a:=0;
   elsif jsonb_typeof(p_usage->'audio_input_tokens')='number' then a:=(p_usage->>'audio_input_tokens')::numeric;
   else return null;end if;
   if a<0 or a>i then return null;end if;
   usd:=usd+(i-a)*.60+a*10+o*2.40;
  else return null;end if;
 elsif not(coalesce(speech and p_usage->>'transcription_model' in ('gpt-transcribe','gpt-4o-mini-transcribe') and not(p_usage ? 'prompt_tokens') and not(p_usage ? 'completion_tokens'),false)) then return null;
 end if;
 return greatest(1,ceil(usd*1.45)::bigint);
exception when data_exception then return null;
end;$fn$;
revoke all on function academy_ai.estimate_request_microcad(text,text,jsonb,jsonb) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION academy_ai.finish(p_user uuid, p_id uuid, p_result jsonb, p_usage jsonb, p_student_text text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r academy_ai.requests; pricing_scale integer; actual_cost bigint; charged integer; released integer; estimated bigint;
begin
 -- Budget lock order matches reserve/fail to prevent concurrent deadlocks.
 select credit_scale into pricing_scale from academy_ai.policy where id for update;
 select * into r from academy_ai.requests where id=p_id and user_id=p_user for update;
 if not found then raise exception 'AI activity not found';end if;
 if r.status='completed' then return jsonb_build_object('id',r.id,'status',r.status,'credits',r.credits,'conversationId',r.conversation_id,'result',r.result);end if;
 if r.status<>'dispatched' or p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>24000
 or p_usage is null or jsonb_typeof(p_usage)<>'object' or octet_length(p_usage::text)>2000 then raise exception 'Invalid AI completion';end if;
 if r.conversation_id is not null then
  if p_student_text is null or length(p_student_text)>2000 or length(coalesce(p_result->>'reply','')) not between 1 and 2000 then raise exception 'Invalid conversation reply';end if;
  update academy_ai.conversations set messages=messages||jsonb_build_array(jsonb_build_object('role','user','content',p_student_text),jsonb_build_object('role','assistant','content',p_result->>'reply')),
  busy_request=null,updated_at=now() where id=r.conversation_id and busy_request=p_id;
  if not found then raise exception 'Conversation reservation changed';end if;
 end if;
 -- New pricing settles the maximum reservation at the measured provider-cost estimate.
 actual_cost:=r.ceiling_microcad;charged:=r.credits;
 if pricing_scale=100 then
  estimated:=academy_ai.estimate_request_microcad(r.kind,r.model,p_usage,p_result);
  if estimated is not null then
   actual_cost:=estimated;
   charged:=least(r.credits,greatest(1,ceil(actual_cost/200.0)::integer));
  end if;
  p_usage:=p_usage||jsonb_build_object('pricingVersion',2,'estimatedMicrocad',actual_cost,'chargedUnits',charged,'quotedUnits',r.credits,'estimateBasis',case when estimated is null then 'reserved ceiling; usage unavailable' else 'recorded tokens/duration; conservative FX' end,'ceilingOverrun',actual_cost>r.ceiling_microcad);
 end if;
 released:=r.credits-charged;
 update academy_ai.requests set status='completed',result=p_result,usage=p_usage,credits=charged,updated_at=now() where id=p_id;
 update academy_ai.wallets set available=available+released,reserved=reserved-r.credits,reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+actual_cost where user_id=p_user;
 update academy_ai.policy set reserved_microcad=reserved_microcad-r.ceiling_microcad,spent_microcad=spent_microcad+actual_cost where id;
 insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad) values(p_user,p_id,'charge',released,actual_cost);
 return jsonb_build_object('id',r.id,'status','completed','credits',charged,'conversationId',r.conversation_id,'result',p_result);
end;$function$;

