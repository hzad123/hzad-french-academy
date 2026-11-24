BEGIN;
alter table academy_ai.activities drop constraint activities_kind_check, add constraint activities_kind_check check (kind in ('pronunciation','conversation','writing','tcf-writing','tcf-speaking-turn','tcf-speaking-feedback','tef-writing','tef-speaking-turn','tef-speaking-feedback','tutor'));
alter table academy_ai.conversations drop constraint conversations_scenario_check, add constraint conversations_scenario_check check (scenario in ('cafe','travel','daily','work','interview','debate','tutor'));
CREATE OR REPLACE FUNCTION academy_ai.reserve(p_user uuid, p_id uuid, p_kind text, p_level text, p_hash text, p_expected_credits integer, p_session uuid DEFAULT NULL::uuid, p_scenario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cfg academy_ai.policy;a academy_ai.activities;w academy_ai.wallets;r academy_ai.requests;s academy_ai.conversations;
begin
 perform academy_ai.require_access(p_user);
 if p_id is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_level is null or p_level not in ('A0','A1','A2','B1','B2','C1','C2') then raise exception 'Invalid AI request';end if;
 -- One global lock serializes budget reservations across accounts and workers.
 select * into cfg from academy_ai.policy where id for update;
 select * into r from academy_ai.requests where id=p_id;
 if found then
  if r.user_id is distinct from p_user or r.input_hash is distinct from p_hash or r.kind is distinct from p_kind or r.level is distinct from p_level then raise exception 'Request ID already used for another activity' using errcode='42501';end if;
  return jsonb_build_object('id',r.id,'status',r.status,'result',r.result,'credits',r.credits,'conversationId',r.conversation_id);
 end if;
 select * into a from academy_ai.activities where kind=p_kind;
 if not found or not cfg.enabled or (cfg.allowed_users is not null and not (p_user=any(cfg.allowed_users))) or cfg.included_credits is null or not a.enabled or a.credits is null or a.ceiling_microcad is null or a.model is null then raise exception 'AI Learning is not available yet';end if;
 if p_expected_credits is null or p_expected_credits<>a.credits then raise exception 'AI credit price changed. Refresh before starting';end if;
 perform academy_ai.ensure_wallet(p_user);select * into w from academy_ai.wallets where user_id=p_user for update;
 if w.expires_at<=now() then raise exception 'Included AI learning period has ended. Purchase additional AI credits to continue';end if;
 if w.available<a.credits then raise exception 'Not enough AI credits for this activity. A paid top-up is required';end if;
 if w.spent_microcad+w.reserved_microcad+a.ceiling_microcad>w.cap_microcad
 or (cfg.global_cap_microcad is not null and cfg.spent_microcad+cfg.reserved_microcad+a.ceiling_microcad>cfg.global_cap_microcad) then raise exception 'AI study allowance reached. Please contact the academy for paid credit options';end if;
 -- Daily AI usage is governed by credits and total budget.
 if exists(select 1 from academy_ai.requests where user_id=p_user and status in ('reserved','dispatched')) then raise exception 'An AI activity is already in progress. Check your saved activity';end if;
 if p_kind in ('conversation','tutor') then
  if (p_kind='tutor' and p_scenario is distinct from 'tutor') or (p_kind='conversation' and (p_scenario is null or p_scenario not in ('cafe','travel','daily','work','interview','debate'))) then raise exception 'Choose a conversation scenario';end if;
  if p_session is null then
   insert into academy_ai.conversations(user_id,level,scenario) values(p_user,p_level,p_scenario) returning * into s;
  else
   select * into s from academy_ai.conversations where id=p_session and user_id=p_user for update;
   if not found or s.level<>p_level or s.scenario is distinct from p_scenario then raise exception 'Conversation not found' using errcode='42501';end if;
  end if;
  if s.busy_request is not null then raise exception 'A conversation reply is already in progress';end if;
  if jsonb_array_length(s.messages)>=24 then raise exception 'Conversation complete. Start a new scenario';end if;
  update academy_ai.conversations set busy_request=p_id where id=s.id;
 elsif p_session is not null or p_scenario is not null then raise exception 'Invalid conversation context';end if;
 insert into academy_ai.requests(id,user_id,kind,level,input_hash,credits,ceiling_microcad,model,max_output_tokens,conversation_id)
 values(p_id,p_user,p_kind,p_level,p_hash,a.credits,a.ceiling_microcad,a.model,a.max_output_tokens,s.id);
 update academy_ai.wallets set available=available-a.credits,reserved=reserved+a.credits,reserved_microcad=reserved_microcad+a.ceiling_microcad where user_id=p_user;
 update academy_ai.policy set reserved_microcad=reserved_microcad+a.ceiling_microcad where id;
 insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad) values(p_user,p_id,'reserve',-a.credits,a.ceiling_microcad);
 return jsonb_build_object('id',p_id,'status','reserved','credits',a.credits,'conversationId',s.id);
end;$function$
;
CREATE OR REPLACE FUNCTION academy_ai.state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); cfg academy_ai.policy; w academy_ai.wallets; catalog jsonb; history jsonb;
begin
 perform academy_ai.require_access(u);perform academy_ai.ensure_wallet(u);
 select * into cfg from academy_ai.policy where id;select * into w from academy_ai.wallets where user_id=u;
 select jsonb_object_agg(kind,jsonb_build_object('enabled',enabled and credits is not null and ceiling_microcad is not null and model is not null,'credits',credits)) into catalog from academy_ai.activities;
 select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]') into history from (
  select id,kind,level,status,credits,conversation_id as "conversationId",created_at as "createdAt",result
  from academy_ai.requests where user_id=u and kind<>'tutor' and created_at>now()-interval '90 days' order by created_at desc,id desc limit 20
 )h;
 return jsonb_build_object('enabled',cfg.enabled and (cfg.allowed_users is null or u=any(cfg.allowed_users)) and cfg.included_credits is not null and (cfg.global_cap_microcad is null or cfg.global_cap_microcad>cfg.spent_microcad+cfg.reserved_microcad),
 'testingCad',case when w.testing_budget_microcad>0 then w.cap_microcad/1000000.0 else null end,'includedCad',cfg.student_cap_microcad/1000000.0,'topUpUrl',cfg.topup_url,
 'wallet',case when w.user_id is null then null else jsonb_build_object('available',case when w.expires_at>now() then w.available else 0 end,'reserved',w.reserved,'expiresAt',w.expires_at,'funding',case when w.testing_budget_microcad>0 then 'testing' when w.purchased_budget_microcad>0 then 'paid' else 'included' end,
 'capCad',w.cap_microcad/1000000.0,'budgetAvailable',w.spent_microcad+w.reserved_microcad<w.cap_microcad) end,'activities',catalog,'history',history,
 'conversations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from (select id,level,scenario,updated_at as "updatedAt",jsonb_array_length(messages)/2 as turns from academy_ai.conversations where user_id=u and scenario<>'tutor' and updated_at>now()-interval '90 days' order by updated_at desc limit 5)c),
 'tutorHistory',(select coalesce(jsonb_agg(to_jsonb(h) order by h."createdAt" desc),'[]') from (select id,kind,level,status,credits,conversation_id as "conversationId",created_at as "createdAt",result from academy_ai.requests where user_id=u and kind='tutor' and created_at>now()-interval '90 days' order by created_at desc,id desc limit 20)h),
 'tutorConversations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from (select id,level,scenario,updated_at as "updatedAt",jsonb_array_length(messages)/2 as turns from academy_ai.conversations where user_id=u and scenario='tutor' and updated_at>now()-interval '90 days' order by updated_at desc limit 10)c));
end;$function$
;
insert into academy_ai.activities(kind,enabled,credits,ceiling_microcad,model,max_output_tokens) values ('tutor',false,1,20000,'gpt-4o-mini',1200) on conflict(kind) do nothing;
COMMIT;
