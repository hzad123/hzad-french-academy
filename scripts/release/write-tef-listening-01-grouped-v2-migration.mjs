import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2];
assert(/^supabase\/migrations\/\d+_tef_listening_01_grouped_v2\.sql$/.test(out||''),'Create a Supabase migration first');
const base=await readFile('supabase/migrations/20261119234824_tef_listening_test01.sql','utf8');
const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v2.json','utf8'));
assert.equal(bank.questions.length,40);assert.equal(bank.seconds,2400);
assert.equal(bank.version,'tef-listening-2026-11-test01-v2');
assert.equal(bank.questions.filter(q=>q.slotSeconds>0).length,36);
for(const q of bank.questions)assert(q.audioSeconds>0,'No audio measurement for Q'+q.number);
const start=base.indexOf('create or replace function public.academy_tef_listening_command(');
const end=base.indexOf('\nrevoke all on all functions in schema',start);
assert(start>0&&end>start);
let fn=base.slice(start,end);
function patch(oldValue,newValue){assert(fn.includes(oldValue),'Expected source RPC fragment absent: '+oldValue.slice(0,70));fn=fn.replace(oldValue,newValue)}
patch("from academy_tef_listening.papers),'history',history",
"from (select distinct on(id) id,version,content from academy_tef_listening.papers order by id,version desc) latest),'history',history");
patch("p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v1'",
"p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v2'");
patch("if (p_payload->>'number')::int<>current_no then raise exception 'This listening question has ended. Continue with the current question';end if;\n   question_no:=",
"if (p_payload->>'number')::int<>current_no and not (coalesce((paper->'questions'->(current_no-1)->>'groupEnd')::int,current_no)=current_no+1 and (p_payload->>'number')::int=current_no+1) then raise exception 'This listening question has ended. Continue with the current question';end if;\n   question_no:=");
patch("current_no:=current_no+1;slot_start:=slot_end;",
"current_no:=coalesce((paper->'questions'->(current_no-1)->>'groupEnd')::int,current_no)+1;slot_start:=slot_end;");
patch("'previewSeconds',q->'previewSeconds','slotSeconds',q->'slotSeconds'",
"'previewSeconds',q->'previewSeconds','groupStart',q->'groupStart','groupEnd',q->'groupEnd','slotSeconds',q->'slotSeconds'");
assert(!fn.includes('tef-listening-2026-11-test01-v1'),'v1 should be supported only by immutable existing attempts, not new starts');
const body=JSON.stringify(bank);
assert(!body.includes('$tef_v2_data$'));
const sql=`-- New immutable v2 TEF Listening bank with 36 longer recordings and four shared-audio pairs.
-- All historical v1 papers, results and student attempts remain intact.
-- Deploy and verify all 43 new source-matched media and license files BEFORE applying.
begin;
insert into academy_tef_listening.papers(id,version,content)
values('tef-listening-01','tef-listening-2026-11-test01-v2',$tef_v2_data$${body}$tef_v2_data$::jsonb)
on conflict(id,version) do nothing;
${fn}
notify pgrst,'reload schema';
commit;
`;
await writeFile(out,sql);
console.log('Prepared immutable TEF Listening v2 with secure paired answers and forward-only group navigation.');
