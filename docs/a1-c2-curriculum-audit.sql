-- HZad French Academy: read-only A0-C2 editorial audit.
-- Safe to run in Supabase SQL editor. Does not change student records or lesson content.
select level,
       count(*) as units,
       count(*) filter (where published) as published,
       round(avg(jsonb_array_length(quiz)),1) as avg_quiz_questions,
       count(*) filter (where coalesce((content->'reading'->>'cefr_length_met')::boolean,false) = false) as below_target_readings,
       count(*) filter (where coalesce(content->'reading'->>'french','')='') as missing_readings,
       count(*) filter (where jsonb_array_length(coalesce(content->'practice_tasks','[]'::jsonb)) < 2) as few_practice_tasks
from public.academy_units
group by level
order by array_position(array['A0','A1','A2','B1','B2','C1','C2'],level);

-- Find all readings requiring expansion, ordered by level and lesson.
select id, level, position, title,
       coalesce((content->'reading'->>'word_count')::integer,0) as current_words,
       coalesce(content->'authoring_metadata'->>'status','unspecified') as editorial_status
from public.academy_units
where level <> 'A0'
  and coalesce((content->'reading'->>'cefr_length_met')::boolean,false) = false
order by array_position(array['A1','A2','B1','B2','C1','C2'],level), position;
