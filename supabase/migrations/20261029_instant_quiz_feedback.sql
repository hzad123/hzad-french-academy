-- Install in Supabase SQL Editor before testing instant quiz feedback.
-- Checks one answer without exposing quiz keys or recording an incomplete attempt.
begin;
create or replace function public.academy_check_answer(p_unit_id text,p_question_id text,p_answer integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_q jsonb;
 v_correct integer;
begin
 if auth.uid() is null or not public.academy_has_access() then
   raise exception 'Not authorized' using errcode = '42501';
 end if;
 select q.value into v_q
 from public.academy_units u
 cross join lateral jsonb_array_elements(u.quiz) q(value)
 where u.id = p_unit_id and u.published = true and q.value->>'id' = p_question_id
 limit 1;
 if v_q is null then raise exception 'Question not found'; end if;
 if p_answer is null or p_answer < 0 or p_answer >= jsonb_array_length(v_q->'options') then
   raise exception 'Invalid answer';
 end if;
 v_correct := (v_q->>'answer')::integer;
 return jsonb_build_object(
   'id',p_question_id,
   'correct',p_answer = v_correct,
   'answer',v_q->'options'->v_correct,
   'explanation',v_q->>'explanation'
 );
end;
$$;
revoke all on function public.academy_check_answer(text,text,integer) from public,anon;
grant execute on function public.academy_check_answer(text,text,integer) to authenticated;
commit;
