import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {protectedTables} from './listening-owner-review.mjs';
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
export function publicationSQL6(papers,tables=protectedTables,{revision=4}={}){
 if(!Number.isInteger(revision)||revision<4)throw Error('Invalid immutable revision');
 const ids=Array.from({length:6},(_,i)=>'tcf-listening-'+String(i+1).padStart(2,'0'));
 if(JSON.stringify(papers.map(p=>p.id))!==JSON.stringify(ids))throw Error('Exactly Tests01–06 required');
 for(const p of papers)if(p.version!==`tcf-listening-2026-11-test${p.id.slice(-2)}-v${revision}`||p.seconds!==2100||p.questions.length!==39||
  p.questions.reduce((n,q)=>n+q.slotSeconds,0)!==2100||p.questions.some((q,i)=>q.number!==i+1||q.options?.length!==4||new Set(q.options).size!==4||!/^([ABCD])$/.test(q.correct)||!(q.audioSeconds>0)||q.audioSeconds+12>q.slotSeconds))throw Error('Incomplete mechanical validation: '+p.id);
 if(tables.some(t=>!/^\w+\.\w+$/.test(t)))throw Error('Invalid protected table');
 const versions=papers.map(p=>p.version),snapshot='jsonb_build_array('+tables.map(t=>`(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${t} t)`).join(',')+')';
 const data=JSON.stringify(papers);if(data.includes('$six_papers$'))throw Error('Unexpected SQL delimiter');
 const versionList=versions.map(literal).join(','),idList=ids.map(literal).join(',');
 const header=revision===4?`-- Owner explicitly requested new Listening01–06 live after disclosure of blind QA failures.
-- Review release, not a declaration of a passed 25% held-out experiment.
-- All234 keys were independently grounded; all media must be deployed first.`:`-- Strict Listening01–06 v${revision}: independent blind, transcript, paper and late-cohort gates passed.
-- All234 keys were independently grounded; verified media must be deployed first.
-- Historical banks, attempts, clocks, scoring and access remain immutable.`;
 return `${header}
do $publish_six$
declare
 wanted jsonb := $six_papers$${data}$six_papers$::jsonb;
 item jsonb; prior jsonb; protected_before jsonb; protected_after jsonb;
 old_before jsonb; old_after jsonb; other_before jsonb; other_after jsonb;
 engine_before text; engine_after text;
begin
 perform pg_advisory_xact_lock(hashtext('hzad-listening-01-06-review-v${revision}'));
 select ${snapshot} into protected_before;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_before
  from academy_tcf_listening.papers where version not in (${versionList});
 select coalesce(jsonb_object_agg(test_id,version),'{}') into other_before
  from academy_tcf_listening.published where test_id not in (${idList});
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into engine_before;
 for item in select value from jsonb_array_elements(wanted) loop
  select content into prior from academy_tcf_listening.papers where id=item->>'id' and version=item->>'version';
  if found and prior is distinct from item then raise exception 'Immutable review version differs: %',item->>'id';end if;
  select content into prior from academy_tcf_listening.papers where id=item->>'id'
   and version=case when item->>'id'='tcf-listening-01' then 'tcf-listening-2026-11-v1' else 'tcf-listening-2026-11-test'||right(item->>'id',2)||'-v1' end;
  if not found then raise exception 'Historical bank missing';end if;
  if jsonb_array_length(item->'questions')<>39 or (item->>'seconds')::int<>2100
   or (select sum((q->>'slotSeconds')::numeric) from jsonb_array_elements(item->'questions') q)<>2100
   or exists(select 1 from jsonb_array_elements(item->'questions') with ordinality as x(q,n)
    where (q->>'number')::int<>n or jsonb_array_length(q->'options')<>4 or q->>'correct' not in ('A','B','C','D')
     or coalesce((q->>'audioSeconds')::numeric,0)<=0 or (q->>'audioSeconds')::numeric+12>(q->>'slotSeconds')::numeric)
   then raise exception 'Invalid complete bank';end if;
  if exists(select 1 from jsonb_array_elements(item->'questions') q join jsonb_array_elements(prior->'questions') oldq on q->>'number'=oldq->>'number'
   where q->'slotSeconds' is distinct from oldq->'slotSeconds' or q->'kind' is distinct from oldq->'kind')then raise exception 'Historical format/timing changed';end if;
  insert into academy_tcf_listening.papers(id,version,content) values(item->>'id',item->>'version',item) on conflict(id,version) do nothing;
  insert into academy_tcf_listening.published(test_id,version) values(item->>'id',item->>'version') on conflict(test_id) do update set version=excluded.version
   where academy_tcf_listening.published.version is distinct from excluded.version;
 end loop;
 select ${snapshot} into protected_after;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_after
  from academy_tcf_listening.papers where version not in (${versionList});
 select coalesce(jsonb_object_agg(test_id,version),'{}') into other_after
  from academy_tcf_listening.published where test_id not in (${idList});
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into engine_after;
 if protected_before is distinct from protected_after or old_before is distinct from old_after or other_before is distinct from other_after or engine_before is distinct from engine_after
  then raise exception 'Preservation check failed; review publication rolled back';end if;
 if exists(select 1 from jsonb_array_elements(wanted) p where not exists(select 1 from academy_tcf_listening.papers b join academy_tcf_listening.published v on v.test_id=b.id and v.version=b.version
  where b.id=p->>'id' and b.version=p->>'version' and b.content=p))then raise exception 'Exact review publication failed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='academy_tcf_listening' and c.relkind='r' and not c.relrowsecurity)
  or has_table_privilege('anon','academy_tcf_listening.papers','select') or has_table_privilege('authenticated','academy_tcf_listening.papers','select')
  then raise exception 'Private bank protection changed';end if;
end;
$publish_six$;
`;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];if(!/^supabase\/migrations\/\d+_tcf_listening_01_06_owner_review_v4\.sql$/.test(output||''))throw Error('Supply the file created by supabase migration new');
 const papers=[];
 for(let n=1;n<=6;n++){
  const label=String(n).padStart(2,'0'),bank=`supabase/exams/tcf-listening-test${label}-v4.json`;
  const paper=JSON.parse(await readFile(bank,'utf8'));
  execFileSync('node',['scripts/check-listening-owner-review.mjs','--bank',bank,'--evidence',`curriculum/tcf-listening-owner-review-v4/${paper.version}`,'--media'],{stdio:'inherit'});
  papers.push(paper);
 }
 await writeFile(output,publicationSQL6(papers));console.log('Prepared six exact immutable review banks and preservation-checked publication pointers.');
}
