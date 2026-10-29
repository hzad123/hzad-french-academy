-- Run in Supabase SQL Editor as a project administrator after review.
-- Separate tables: does not modify the existing portal or entitlement policies.
begin;

create table if not exists public.academy_units (
 id text primary key check (id ~ '^a[0-9]-[0-9]{2}$'),
 level text not null check (level in ('A0','A1','A2','B1','B2','C1','C2')),
 position integer not null check (position > 0),
 title text not null,
 minutes integer not null default 10 check (minutes between 1 and 120),
 content jsonb not null default '{}'::jsonb,
 quiz jsonb not null default '[]'::jsonb,
 published boolean not null default false,
 unique(level,position)
);
create table if not exists public.academy_learning_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 unit_id text not null references public.academy_units(id) on delete cascade,
 attempts integer not null default 0 check (attempts >= 0),
 best_percent integer not null default 0 check (best_percent between 0 and 100),
 completed boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(user_id,unit_id)
);

create or replace function public.academy_has_access()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
   select 1 from public.purchase_entitlements e
   where e.user_id = (select auth.uid())
     and e.status = 'active'
     and e.verified_at is not null
     and e.access_starts_at <= now()
     and (e.access_ends_at is null or e.access_ends_at > now())
     and e.product_code in ('HZAD_FULL_ACADEMY','FULL_ACADEMY')
 );
$$;
revoke all on function public.academy_has_access() from public,anon;
grant execute on function public.academy_has_access() to authenticated;

alter table public.academy_units enable row level security;
alter table public.academy_learning_progress enable row level security;

drop policy if exists academy_units_entitled_read on public.academy_units;
create policy academy_units_entitled_read on public.academy_units
 for select to authenticated using (published and (select public.academy_has_access()));

drop policy if exists academy_progress_entitled_read on public.academy_learning_progress;
create policy academy_progress_entitled_read on public.academy_learning_progress
 for select to authenticated using (
 user_id = (select auth.uid()) and (select public.academy_has_access())
 );

revoke all on public.academy_units from anon,authenticated;
grant select on public.academy_units to authenticated;
revoke all on public.academy_learning_progress from anon,authenticated;
grant select on public.academy_learning_progress to authenticated;

-- Quiz grading is performed in the database, not trusted from browser-supplied scores.
create or replace function public.academy_submit_quiz(p_unit_id text,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_quiz jsonb;
 v_q jsonb;
 v_correct integer := 0;
 v_total integer := 0;
 v_percent integer;
 v_feedback jsonb := '[]'::jsonb;
 v_answer integer;
 v_given text;
begin
 if v_user is null or not public.academy_has_access() then
   raise exception 'Not authorized' using errcode = '42501';
 end if;
 if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
   raise exception 'Answers must be a JSON object';
 end if;
 select quiz into v_quiz from public.academy_units
 where id = p_unit_id and published = true;
 if v_quiz is null then raise exception 'Unit not found'; end if;
 if jsonb_typeof(v_quiz) <> 'array' or jsonb_array_length(v_quiz) = 0 then
   raise exception 'Quiz not available';
 end if;
 for v_q in select value from jsonb_array_elements(v_quiz)
 loop
   v_total := v_total + 1;
   v_given := p_answers ->> (v_q ->> 'id');
   if v_given is null or v_given !~ '^[0-9]+$' then
     raise exception 'All questions require an answer';
   end if;
   v_answer := (v_q ->> 'answer')::integer;
   if v_given::integer = v_answer then v_correct := v_correct + 1; end if;
   v_feedback := v_feedback || jsonb_build_array(jsonb_build_object(
      'id',v_q->>'id',
      'correct',v_given::integer=v_answer,
      'answer',v_q->'options'->v_answer,
      'explanation',v_q->>'explanation'
   ));
 end loop;
 v_percent := round(100.0 * v_correct / v_total);
 insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed,updated_at)
 values(v_user,p_unit_id,1,v_percent,v_percent >= 70,now())
 on conflict(user_id,unit_id) do update set
 attempts=public.academy_learning_progress.attempts+1,
 best_percent=greatest(public.academy_learning_progress.best_percent,excluded.best_percent),
 completed=public.academy_learning_progress.completed or excluded.completed,
 updated_at=now();
 return jsonb_build_object('correct',v_correct,'total',v_total,'percent',v_percent,
 'passed',v_percent>=70,'feedback',v_feedback);
end;
$$;
revoke all on function public.academy_submit_quiz(text,jsonb) from public,anon;
grant execute on function public.academy_submit_quiz(text,jsonb) to authenticated;
commit;
