// Stage immutable, idempotent, per-paper SQL publication migrations.
// Never run these until their exact media paths are deployed and validated.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
await mkdir('supabase/migrations',{recursive:true});
for(let number=3;number<=20;number++){
 const label=String(number).padStart(2,'0');
 const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+label+'.json','utf8'));
 if(paper.id!=='tcf-listening-'+label||paper.questions.length!==39||
    paper.questions.reduce((s,q)=>s+q.slotSeconds,0)!==2100||
    paper.questions.some(q=>!Number.isFinite(q.audioSeconds)||q.audioSeconds+12>q.slotSeconds))
   throw Error('Bad paper '+label);
 const literal=JSON.stringify(paper).replaceAll('$paper'+label+'$','');
 const id=paper.id,version=paper.version;
 const sql=`-- Activate Test ${label} only AFTER independent media/CDN verification.
-- Existing students, clocks and prior paper versions are untouched.
begin;
insert into academy_tcf_listening.papers(id,version,content)
values('${id}','${version}',$paper${label}$${literal}$paper${label}$::jsonb)
on conflict(id,version) do nothing;
do $$begin
 if not exists(select 1 from academy_tcf_listening.papers
  where id='${id}' and version='${version}'
    and content->>'seconds'='2100'
    and jsonb_array_length(content->'questions')=39)
 then raise exception 'Complete paper missing';end if;
 if exists(select 1 from academy_tcf_listening.published
  where test_id='${id}' and version<>'${version}')
 then raise exception 'Another listening version is already active';end if;
end;$$;
insert into academy_tcf_listening.published(test_id,version)
values('${id}','${version}') on conflict(test_id) do nothing;
notify pgrst,'reload schema';
commit;
`;
 await writeFile(join('supabase/migrations','202611132340'+label+'_tcf_listening_test'+label+'_release.sql'),sql);
}
console.log('Staged immutable release migrations for 18 fully recorded TCF listening papers.');
