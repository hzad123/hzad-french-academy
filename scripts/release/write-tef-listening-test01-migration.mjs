// Generate isolated TEF listening schema from the already-audited private TCF RPC model.
// Do not reuse TCF data or expose answer keys to the browser. No production DB calls.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dest=process.argv[2];
if(!/^supabase\/migrations\/\d+_tef_listening_test01\.sql$/.test(dest||''))throw Error('Use supabase migration new tef_listening_test01');
const original=await readFile('supabase/migrations/20261113171848_tcf_listening_test01.sql','utf8');
const navigation=await readFile('supabase/migrations/20261113185622_tcf_listening_next_final_submit.sql','utf8');
const paper=JSON.parse(await readFile('supabase/exams/tef-listening-test01.json','utf8'));
assert.equal(paper.questions.length,40);assert.equal(paper.seconds,2400);
assert.equal(paper.questions.reduce((t,q)=>t+q.slotSeconds,0),2400);
for(const q of paper.questions)assert(q.audioSeconds>0&&q.audioSeconds+q.previewSeconds+10<=q.slotSeconds);
let core=original.slice(original.indexOf('create schema academy_tcf_listening;'),original.indexOf('insert into academy_tcf_listening.papers('));
const grade=original.slice(original.indexOf('create function academy_tcf_listening.grade('),original.indexOf('-- The public endpoint returns'));
const navTable=navigation.slice(navigation.indexOf('create table academy_tcf_listening.navigation('),navigation.indexOf('create or replace function public.academy_tcf_listening_command('));
const cmd=navigation.slice(navigation.indexOf('create or replace function public.academy_tcf_listening_command('),navigation.indexOf("notify pgrst,'reload schema';"));
assert(core.startsWith('create schema'));assert(cmd.includes('perform academy_ai.require_access(u)'));
const transform=s=>s
 .replaceAll('academy_tcf_listening','academy_tef_listening')
 .replaceAll('tcf-listening-01','tef-listening-01')
 .replaceAll('tcf-listening-2026-11-v1','tef-listening-2026-11-test01-v1')
 .replaceAll("interval '35 minutes'","interval '40 minutes'")
 .replaceAll('2100','2400')
 .replaceAll('39','40')
 .replaceAll('^([1-9]|[12][0-9]|3[0-9])$','^([1-9]|[12][0-9]|3[0-9]|40)$');
core=transform(core);
const gradeSql=transform(grade),navigationSql=transform(navTable),commandSql=transform(cmd).replace("'audioSeconds',q->'audioSeconds','slotSeconds'","'audioSeconds',q->'audioSeconds','previewSeconds',q->'previewSeconds','slotSeconds'");
assert(commandSql.includes("current_no=40"));assert(commandSql.includes("question_no text"));
assert(commandSql.includes("p_action='next'"));
assert(!commandSql.includes('academy_tcf_listening'));
const payload=JSON.stringify(paper);
if(payload.includes('$tef_data$'))throw Error('SQL delimiter collision');
const sql=`-- HZad TEF Canada Listening Test01, 40 items, 40 minutes.
-- Original questions and pinned recorded audio only. All student data/credits remain untouched.
-- Requires deployed full audio and four image panels to be SHA verified before applying.
begin;
${core}
${navTable?navigationSql:''}
insert into academy_tef_listening.papers(id,version,content)
values('tef-listening-01','tef-listening-2026-11-test01-v1',$tef_data$${payload}$tef_data$::jsonb);
${gradeSql}
${commandSql}
notify pgrst,'reload schema';
commit;
`;
assert(!sql.includes('academy_tcf_listening'));
await writeFile(dest,sql);
console.log('Staged isolated TEF listening schema, 40 questions, secure server-side grading.');
