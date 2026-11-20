-- TEF Reading six-paper release: prevent cross-paper accidental resume; choose current versions without hiding historical attempts.
begin;
create table if not exists academy_tef_reading.current_papers(
 id text primary key,
 version text not null,
 foreign key(id,version) references academy_tef_reading.papers(id,version)
);
alter table academy_tef_reading.current_papers enable row level security;
revoke all on academy_tef_reading.current_papers from public,anon,authenticated,service_role;
insert into academy_tef_reading.current_papers(id,version) values
 ('tef-reading-01','tef-reading-2026-11-original-01-v1'),
 ('tef-reading-02','tef-reading-2026-11-original-02-v1')
on conflict(id) do nothing;

-- Previous unique(user_id) made starting a different paper return a prior paper.
-- A student may have one active attempt per paper/version; older attempts stay intact.
drop index if exists academy_tef_reading.reading_one_active;
create unique index if not exists tef_reading_one_active_per_paper_version
 on academy_tef_reading.attempts(user_id,test_id,version)
 where status='active';

create or replace function public.academy_tef_reading_command(p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a academy_tef_reading.attempts;paper jsonb;history jsonb;question_no text;choice text;
begin
 perform academy_ai.require_access(u);
 if p_action is null or p_action not in ('catalog','start','read','answer','submit') or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1000 then raise exception 'Invalid reading action';end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where not (k=any(case p_action when 'start' then array['testId','version'] when 'answer' then array['number','choice','revision'] when 'submit' then array['revision'] else array[]::text[] end))) then raise exception 'Invalid reading request';end if;
 if p_action='catalog' then
  select coalesce(jsonb_agg(to_jsonb(h) order by h."startedAt" desc),'[]') into history from (
   select id,test_id "testId",version,status,started_at "startedAt",deadline from academy_tef_reading.attempts where user_id=u order by started_at desc limit 50) h;
  return jsonb_build_object('tests',(select jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'title',p.content->>'title','questions',40,'seconds',3600,'maxPoints',40) order by p.id) from academy_tef_reading.papers p join academy_tef_reading.current_papers c on c.id=p.id and c.version=p.version),'history',history,'serverNow',now());
 end if;
 if p_id is null then raise exception 'Invalid reading attempt';end if;
 -- Serialize starts per account, rather than a shared/global lock.
 if p_action='start' then perform 1 from auth.users where id=u for update;end if;
 select * into a from academy_tef_reading.attempts where id=p_id for update;
 if found and a.user_id<>u then raise exception 'Reading attempt not found' using errcode='42501';end if;
 if p_action='start' then
  if not exists(select 1 from academy_tef_reading.current_papers c where c.id=p_payload->>'testId' and c.version=p_payload->>'version') then raise exception 'Reading paper changed. Refresh before starting';end if;
  if a.id is not null and (a.test_id<>p_payload->>'testId' or a.version<>p_payload->>'version') then raise exception 'Reading attempt already used';end if;
  if a.id is null then
   -- Finish expired saved work, then resume any unexpired attempt of this paper.
   update academy_tef_reading.attempts t set status='completed',submitted_at=t.deadline,
    result=academy_tef_reading.grade(p.content,t.answers),revision=t.revision+1
    from academy_tef_reading.papers p where t.user_id=u and t.status='active' and now()>=t.deadline and p.id=t.test_id and p.version=t.version;
   select * into a from academy_tef_reading.attempts where user_id=u and status='active' and test_id=p_payload->>'testId' and version=p_payload->>'version' for update;
   if a.id is null then insert into academy_tef_reading.attempts(id,user_id,test_id,version) values(p_id,u,p_payload->>'testId',p_payload->>'version') returning * into a;end if;
  end if;
 end if;
 if a.id is null then raise exception 'Reading attempt not found' using errcode='42501';end if;
 select content into paper from academy_tef_reading.papers where id=a.test_id and version=a.version;
 if a.status='active' and now()>=a.deadline then
  update academy_tef_reading.attempts set status='completed',submitted_at=deadline,result=academy_tef_reading.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
 end if;
 if a.status='active' and p_action in ('answer','submit') then
  if p_payload->'revision' is distinct from to_jsonb(a.revision) then raise exception 'Reading answers changed in another tab. Reload saved answers';end if;
  if p_action='answer' then
   if jsonb_typeof(p_payload->'number') is distinct from 'number' or p_payload->>'number' !~ '^([1-9]|[12][0-9]|3[0-9]|40)$' or not (p_payload ? 'choice') or (p_payload->'choice'<>'null'::jsonb and (jsonb_typeof(p_payload->'choice')<>'string' or p_payload->>'choice' not in ('A','B','C','D'))) then raise exception 'Invalid reading choice';end if;
   question_no:=p_payload->>'number';choice:=p_payload->>'choice';
   update academy_tef_reading.attempts set answers=case when choice is null then answers-question_no else jsonb_set(answers,array[question_no],to_jsonb(choice)) end,revision=revision+1 where id=a.id returning * into a;
  else
   update academy_tef_reading.attempts set status='completed',submitted_at=now(),result=academy_tef_reading.grade(paper,answers),revision=revision+1 where id=a.id returning * into a;
  end if;
 end if;
 return jsonb_build_object('id',a.id,'testId',a.test_id,'version',a.version,'status',a.status,'answers',a.answers,'revision',a.revision,'startedAt',a.started_at,'deadline',a.deadline,'submittedAt',a.submitted_at,'serverNow',now(),
 'paper',jsonb_build_object('id',a.test_id,'version',a.version,'title',paper->>'title','seconds',paper->'seconds','questions',(select jsonb_agg(jsonb_build_object('number',q->'number','points',q->'points','passage',q->'passage','question',q->'question','options',q->'options','media',q->'media','section',q->'section','group',q->'group') order by (q->>'number')::int) from jsonb_array_elements(paper->'questions') q)),
 'result',a.result);
end;$$;

revoke all on function public.academy_tef_reading_command(text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.academy_tef_reading_command(text,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
