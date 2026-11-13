import {readFile,writeFile} from 'node:fs/promises';
for(const n of [4,5,6]){
 const label=String(n).padStart(2,'0');
 const p=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+label+'-v2.json','utf8'));
 if(p.version!=='tcf-listening-2026-11-test'+label+'-v2'||p.questions.length!==39||p.questions.some(q=>q.audioSeconds<=0)||p.questions.reduce((a,q)=>a+q.slotSeconds,0)!==2100)throw Error('Incomplete paper '+label);
 const json=JSON.stringify(p);
 const sql=`-- New immutable Listening Test ${label} editorial replacement.
-- Never delete original v1 version or student attempts. Publish after media deployment.
begin;
insert into academy_tcf_listening.papers(id,version,content)
values('tcf-listening-${label}','tcf-listening-2026-11-test${label}-v2',$paper${label}v2$${json}$paper${label}v2$::jsonb)
on conflict(id,version) do nothing;
insert into academy_tcf_listening.published(test_id,version)
values('tcf-listening-${label}','tcf-listening-2026-11-test${label}-v2')
on conflict(test_id) do update set version='tcf-listening-2026-11-test${label}-v2';
commit;
`;
 await writeFile('supabase/migrations/202611132359'+label+'_tcf_listening_test'+label+'_v2_editorial.sql',sql);
}
console.log('Staged independently authored v2 releases for Tests04,05,06');
