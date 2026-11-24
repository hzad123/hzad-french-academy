import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];
assert(/^supabase\/migrations\/\d+_tef_listening_01_audio_timing_v3\.sql$/.test(out||''),'Create a Supabase migration first');
const base=await readFile('supabase/migrations/20261120221958_tef_listening_01_grouped_v2.sql','utf8');
const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
assert.equal(bank.id,'tef-listening-01');
assert.equal(bank.version,'tef-listening-2026-11-test01-v3');
assert.equal(bank.questions.length,40);
assert.equal(bank.questions.filter(q=>q.slotSeconds>0).length,36);
assert.equal(bank.questions.reduce((s,q)=>s+q.slotSeconds,0),2400);
const start=base.indexOf('create or replace function public.academy_tef_listening_command(');
const end=base.indexOf('\nnotify pgrst',start);
assert(start>=0&&end>start,'Missing prior production RPC');
let fn=base.slice(start,end);
const old="p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v2'";
assert(fn.includes(old),'Cannot find previous published-version allowlist');
fn=fn.replace(old,"p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v3'");
assert(!fn.includes(old),'Current start validation must use new published version');
const data=JSON.stringify(bank);
assert(!data.includes('$tef_v3_data$'));
const sql=`-- Immutable v3 listening recordings + accurate slot timing. Historical attempts and v1/v2 banks remain untouched.
-- Never apply before exact website revision and 43 hosted media files have been verified.
begin;
insert into academy_tef_listening.papers(id,version,content)
values('tef-listening-01','tef-listening-2026-11-test01-v3',$tef_v3_data$${data}$tef_v3_data$::jsonb)
on conflict(id,version) do nothing;
${fn}
notify pgrst,'reload schema';
commit;
`;
await writeFile(out,sql);
console.log('TEF Listening Test01 v3: immutable bank migration prepared; requires pre-deploy hosted QA.');
