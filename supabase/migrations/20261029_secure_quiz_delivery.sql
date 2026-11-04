-- Run in Supabase SQL Editor after the initial academy learning migration.
-- Quiz answers remain in private academy_units; student clients receive only safe questions.
begin;
create or replace function public.academy_list_units(p_level text default 'A0')
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.academy_has_access() then
   raise exception 'Not authorized' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(
  jsonb_build_object(
   'id',u.id,'level',u.level,'position',u.position,'title',u.title,
   'minutes',u.minutes,'content',u.content,
   'quiz',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',q.value->>'id','type',q.value->>'type',
      'prompt',q.value->>'prompt','options',q.value->'options'
   ) order by q.ordinality),'[]'::jsonb)
   from jsonb_array_elements(u.quiz) with ordinality q(value,ordinality))
  ) order by u.position
 ),'[]'::jsonb) into result
 from public.academy_units u
 where u.level=p_level and u.published;
 return result;
end;
$$;
revoke all on function public.academy_list_units(text) from public,anon;
grant execute on function public.academy_list_units(text) to authenticated;
-- No direct student access to the answer-key-bearing table.
revoke select on public.academy_units from authenticated;
-- SECURITY DEFINER functions retain server-side access for grading.
commit;
