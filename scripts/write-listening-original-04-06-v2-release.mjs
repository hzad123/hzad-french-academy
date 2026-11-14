import {readFile,writeFile} from 'node:fs/promises';
for(const n of [4,5,6]){
 const label=String(n).padStart(2,'0');
 const p=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+label+'-v2.json','utf8'));
 if(p.version!=='tcf-listening-2026-11-test'+label+'-v2'||p.questions.length!==39||p.questions.some(q=>q.audioSeconds<=0)||p.questions.reduce((a,q)=>a+q.slotSeconds,0)!==2100)throw Error('Incomplete paper '+label);
 const json=JSON.stringify(p);
 const sql=`-- Archive the unreviewed Listening Test ${label} v2 bank without publishing it.
-- This pending migration has not been applied to production (verified before editing).
-- Never delete original v1 versions or student attempts. Reviewed successors need separate publication.
begin;
insert into academy_tcf_listening.papers(id,version,content)
values('tcf-listening-${label}','tcf-listening-2026-11-test${label}-v2',$paper${label}v2$${json}$paper${label}v2$::jsonb)
on conflict(id,version) do nothing;
commit;
`;
 await writeFile('supabase/migrations/202611132359'+label+'_tcf_listening_test'+label+'_v2_editorial.sql',sql);
}
console.log('Staged archive-only v2 banks for Tests04,05,06; no publication changes.');
