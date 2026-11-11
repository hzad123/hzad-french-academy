-- Fixed validation categories only; no learner/provider text is retained.
begin;
create or replace function public.academy_tcf_writing_note_failure(p_user uuid,p_request uuid,p_failure jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_failure is null or jsonb_typeof(p_failure)<>'object' or octet_length(p_failure::text)>1000
 or exists(select 1 from jsonb_object_keys(p_failure) k where k not in ('code','status','providerCode','usage'))
 or coalesce(p_failure->>'code','') not in ('PROVIDER_HTTP','NETWORK','TRUNCATED','INVALID_JSON','INVALID_SCORE','UNVERIFIED_QUOTE','INVALID_FEEDBACK','FEEDBACK_FIELDS','FEEDBACK_BOUNDS','FEEDBACK_TASKS','FEEDBACK_CRITERIA','UNCHANGED_CORRECTION','OUTPUT_TOO_LARGE','UNKNOWN')
 then raise exception 'Invalid failure diagnostic';end if;
 if p_failure ? 'providerCode' and p_failure->>'providerCode' not in ('invalid_api_key','insufficient_quota','model_not_found','rate_limit_exceeded','unsupported_parameter','invalid_request_error','permission_denied') then raise exception 'Invalid provider diagnostic';end if;
 if p_failure ? 'status' and (jsonb_typeof(p_failure->'status')<>'number' or (p_failure->>'status')::integer not between 400 and 599) then raise exception 'Invalid provider status';end if;
 if p_failure ? 'usage' and (jsonb_typeof(p_failure->'usage')<>'object' or exists(select 1 from jsonb_each(p_failure->'usage') u where u.key not in ('prompt_tokens','completion_tokens','total_tokens') or jsonb_typeof(u.value)<>'number' or u.value::text !~ '^[0-9]{1,10}$')) then raise exception 'Invalid usage diagnostic';end if;
 update academy_ai.requests set usage=coalesce(usage,'{}')||jsonb_build_object('failure',p_failure)
 where id=p_request and user_id=p_user and kind='tcf-writing' and status in ('failed','dispatched');
end;$$;
revoke all on function public.academy_tcf_writing_note_failure(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_tcf_writing_note_failure(uuid,uuid,jsonb) to service_role;
commit;
