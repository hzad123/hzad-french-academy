// Generates a migration to support multiple *explicitly published* listening
// tests while keeping Test 01's immutable grading, navigation and timing intact.
// The publication registry is a fail-closed allowlist, never latest draft by ID.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];
assert(/^supabase\/migrations\/\d+_tef_listening_publication_registry\.sql$/.test(out||''),'First create a migration with supabase migration new');
const source=await readFile('supabase/migrations/20261124142411_tef_listening_01_audio_timing_v3.sql','utf8');
const begin=source.indexOf('create or replace function public.academy_tef_listening_command(');
const end=source.indexOf('\nnotify pgrst',begin);
assert(begin>0&&end>begin);
let rpc=source.slice(begin,end);
const startOld="if p_payload->>'testId' is distinct from 'tef-listening-01' or p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v3' then raise exception 'Listening paper changed. Refresh before starting';end if;";
const startNew=`if p_payload->>'testId' is null or p_payload->>'version' is null
      or not exists (
       select 1 from academy_tef_listening.published_papers pub
       join academy_tef_listening.papers p on p.id=pub.id and p.version=pub.version
       where pub.id=p_payload->>'testId' and pub.version=p_payload->>'version'
       and jsonb_array_length(p.content->'questions')=40
      ) then raise exception 'Listening paper changed. Refresh before starting';end if;`;
assert(rpc.includes(startOld));
rpc=rpc.replace(startOld,startNew);
const catalogOld="from (select distinct on(id) id,version,content from academy_tef_listening.papers order by id,version desc) latest";
const catalogNew=`from (select p.id,p.version,p.content from academy_tef_listening.published_papers pub
     join academy_tef_listening.papers p on p.id=pub.id and p.version=pub.version) latest`;
assert(rpc.includes(catalogOld));
rpc=rpc.replace(catalogOld,catalogNew);
assert(!rpc.includes(startOld));
assert(!rpc.includes('distinct on(id)'));
const sql=`-- Only explicit published papers are available to authenticated students.
-- Do NOT insert draft Tests 02-07 into this registry before media & content QA.
begin;
create table if not exists academy_tef_listening.published_papers (
 id text primary key,
 version text not null,
 published_at timestamptz not null default now(),
 foreign key(id,version) references academy_tef_listening.papers(id,version)
);
alter table academy_tef_listening.published_papers enable row level security;
revoke all on academy_tef_listening.published_papers from public, anon, authenticated;
insert into academy_tef_listening.published_papers(id,version) values
 ('tef-listening-01','tef-listening-2026-11-test01-v3')
on conflict(id) do update set version=excluded.version
where academy_tef_listening.published_papers.version is distinct from excluded.version;
${rpc}
notify pgrst,'reload schema';
commit;
`;
await writeFile(out,sql);
console.log('Generated fail-closed TEF listening publication registry; preserves Test01 v3 and historical attempts');
