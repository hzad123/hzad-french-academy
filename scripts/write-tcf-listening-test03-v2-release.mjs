// Historical publication path retired; immutable prior migrations stay intact.
throw Error('Use new immutable candidates with independent blind/grounded evidence; historical publication SQL must not be regenerated.');
import {readFile,writeFile} from 'node:fs/promises';
const p=JSON.parse(await readFile('supabase/exams/tcf-listening-test03-v2.json','utf8'));
if(p.version!=='tcf-listening-2026-11-test03-v2'||p.questions.length!==39||p.questions.some(q=>!q.audioSeconds)||p.questions.reduce((n,q)=>n+q.slotSeconds,0)!==2100)throw Error('Incomplete new paper');
const json=JSON.stringify(p);
const sql=`-- Archive the unreviewed Test03 v2 bank without publishing it.
-- This pending migration has not been applied to production (verified before editing).
-- Test03 v2 contains a confirmed Q24 scoring defect; use a reviewed successor.
-- Keeps archived Test03 v1 papers and all past attempts untouched.
begin;
insert into academy_tcf_listening.papers(id,version,content)
values('tcf-listening-03','tcf-listening-2026-11-test03-v2',$test03v2$${json}$test03v2$::jsonb)
on conflict(id,version) do nothing;
commit;
`;
await writeFile('supabase/migrations/20261113235900_tcf_listening_test03_v2_editorial.sql',sql);
console.log('Archive-only migration staged. No publication pointer is changed.');
