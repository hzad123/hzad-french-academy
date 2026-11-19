// Generate a guarded, one-way first publication of TCF Listening 07–14 v2.
// This batch retains all historical v1 recordings, scores and correct letters.
// No student history, wallet, speaking or reading table is modified.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {strictProtectedTables} from './listening-owner-review.mjs';
import {sourceInvariant} from '../lib/listening-contrast-quality.mjs';
const output=process.argv[2];
if(!/^supabase\/migrations\/\d+_tcf_listening_07_14_source_v2\.sql$/.test(output||''))throw Error('Use supabase migration new tcf_listening_07_14_source_v2');
execFileSync('node',['scripts/check-listening-07-14-v2.mjs'],{stdio:'inherit'});
const source=[],papers=[];
for(let n=7;n<=14;n++){
 const label=String(n).padStart(2,'0');
 const old=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+label+'.json','utf8'));
 const revised=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+label+'-v2.json','utf8'));
 sourceInvariant(old,revised);
 if(revised.id!=='tcf-listening-'+label||revised.version!=='tcf-listening-2026-11-test'+label+'-v2'||old.version!=='tcf-listening-2026-11-test'+label+'-v1')throw Error('Unexpected version: '+label);
 source.push(old);papers.push(revised);
}
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
const ids=papers.map(p=>p.id),newVersions=papers.map(p=>p.version);
const sub=table=>'(select md5(coalesce(string_agg(to_jsonb(t)::text,\'|\' order by to_jsonb(t)::text),\'\')) from '+table+' t)';
const snapshot='jsonb_build_array('+strictProtectedTables.map(sub).join(',')+')';
const idSql=ids.map(literal).join(',');
const versionSql=newVersions.map(literal).join(',');
const payload=JSON.stringify(papers);
if(payload.includes('$eight_data$'))throw Error('Unexpected SQL delimiter');
const sql=`-- TCF Listening Tests 07–14, complete immutable v2 first publication.
-- Owner requested next batch after 01–06. This release corrects all written
-- distractors while retaining the same original correct answer positions,
-- complete unchanged recordings, illustrations and 35-minute response slots.
-- The original keys are retained from v1 (NOT represented as new independent AI proof).
-- Verify all 361 hosted media/metadata files BEFORE applying this transaction.
do $publish_eight$
declare
 wanted jsonb := $eight_data$${payload}$eight_data$::jsonb;
 paper jsonb; previous jsonb; existing jsonb;
 protected_before jsonb;protected_after jsonb;
 old_before jsonb;old_after jsonb;
 others_before jsonb;others_after jsonb;
 function_before text;function_after text;
begin
 perform pg_advisory_xact_lock(hashtext('hzad-tcf-listening-07-14-v2'));
 select ${snapshot} into protected_before;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_before
  from academy_tcf_listening.papers where version not in (${versionSql});
 select coalesce(jsonb_object_agg(test_id,version),'{}') into others_before
  from academy_tcf_listening.published where test_id not in (${idSql});
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into function_before;
 for paper in select value from jsonb_array_elements(wanted) loop
  select content into previous from academy_tcf_listening.papers
   where id=paper->>'id' and version='tcf-listening-2026-11-test'||right(paper->>'id',2)||'-v1';
  if not found then raise exception 'Historical v1 source bank missing: %',paper->>'id';end if;
  if jsonb_array_length(paper->'questions')<>39 or (paper->>'seconds')::integer<>2100 or
   (select sum((q->>'slotSeconds')::integer) from jsonb_array_elements(paper->'questions') q)<>2100
   or exists(
    select 1 from jsonb_array_elements(paper->'questions') with ordinality x(q,n)
    where (q->>'number')::integer<>x.n or jsonb_array_length(q->'options')<>4
      or q->>'correct' not in ('A','B','C','D')
      or coalesce((q->>'audioSeconds')::numeric,0)<=0
      or (q->>'audioSeconds')::numeric+12>(q->>'slotSeconds')::numeric
   ) then raise exception 'Incomplete or mistimed listening v2 bank: %',paper->>'id';end if;
  if exists(
   select 1 from jsonb_array_elements(paper->'questions') with ordinality new(q,n)
    join jsonb_array_elements(previous->'questions') with ordinality old(q,n) using(n)
    where new.q->>'number' is distinct from old.q->>'number'
     or new.q->>'kind' is distinct from old.q->>'kind'
     or new.q->>'correct' is distinct from old.q->>'correct'
     or new.q->>'question' is distinct from old.q->>'question'
     or new.q->'segments' is distinct from old.q->'segments'
     or new.q->>'transcript' is distinct from old.q->>'transcript'
     or new.q->>'audio' is distinct from old.q->>'audio'
     or new.q->>'audioSeconds' is distinct from old.q->>'audioSeconds'
     or new.q->>'slotSeconds' is distinct from old.q->>'slotSeconds'
     or new.q->>'image' is distinct from old.q->>'image'
     or (new.n<=8 and new.q->'options' is distinct from old.q->'options')
  ) then raise exception 'Audio, key or historical timing changed: %',paper->>'id';end if;
  select content into existing from academy_tcf_listening.papers
   where id=paper->>'id' and version=paper->>'version';
  if found and existing is distinct from paper then
   raise exception 'Refusing to overwrite immutable v2 bank: %',paper->>'id';end if;
  insert into academy_tcf_listening.papers(id,version,content)
   values(paper->>'id',paper->>'version',paper) on conflict(id,version) do nothing;
  insert into academy_tcf_listening.published(test_id,version)
   values(paper->>'id',paper->>'version')
   on conflict(test_id) do update set version=excluded.version
    where academy_tcf_listening.published.version is distinct from excluded.version;
 end loop;
 select ${snapshot} into protected_after;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_after
  from academy_tcf_listening.papers where version not in (${versionSql});
 select coalesce(jsonb_object_agg(test_id,version),'{}') into others_after
  from academy_tcf_listening.published where test_id not in (${idSql});
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into function_after;
 if protected_before is distinct from protected_after
 or old_before is distinct from old_after or others_before is distinct from others_after
 or function_before is distinct from function_after
 then raise exception 'Student/history preservation mismatch: entire batch rolled back';end if;
 if exists(
  select 1 from jsonb_array_elements(wanted) p
  where not exists(select 1 from academy_tcf_listening.papers b
   join academy_tcf_listening.published v on v.test_id=b.id and v.version=b.version
   where b.id=p->>'id' and b.version=p->>'version' and b.content=p)
 ) then raise exception 'One or more exact TCF listening v2 bank publications failed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='academy_tcf_listening' and c.relkind='r' and not c.relrowsecurity)
  or has_table_privilege('anon','academy_tcf_listening.papers','select')
  or has_table_privilege('authenticated','academy_tcf_listening.papers','select')
 then raise exception 'Private answer-key bank protection altered';end if;
end;
$publish_eight$;
`;
await writeFile(output,sql);
console.log('Staged eight immutable TCF Listening v2 banks (312 questions). Database remains unchanged until hosted media verification and explicit transaction.');
