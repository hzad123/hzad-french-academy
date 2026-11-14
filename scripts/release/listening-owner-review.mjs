import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const protectedTables=Object.freeze([
 'auth.users','public.purchase_entitlements','public.academy_learning_progress',
 'academy_ai.wallets','academy_ai.requests','academy_ai.ledger','academy_ai.policy',
 'academy_ai.activities','academy_ai.testing_grants','academy_tcf_writing.attempts',
 'academy_tcf_speaking.attempts','academy_tcf_speaking.calls','academy_exams.attempts',
 'academy_tcf_reading.papers','academy_tcf_reading.published_papers','academy_tcf_reading.attempts',
 'academy_tcf_listening.attempts','academy_tcf_listening.navigation'
]);
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
export const loadPapers=()=>Promise.all([3,4,5,6].map(n=>readFile(`supabase/exams/tcf-listening-test0${n}-v3.json`,'utf8').then(JSON.parse)));
export function publicationSQL(papers,tables=protectedTables) {
 const ids=['tcf-listening-03','tcf-listening-04','tcf-listening-05','tcf-listening-06'];
 if(JSON.stringify(papers.map(p=>p.id))!==JSON.stringify(ids))throw Error('Exactly the four requested tests are required');
 for(const paper of papers) {
  if(paper.version!==`tcf-listening-2026-11-test${paper.id.slice(-2)}-v3`||paper.seconds!==2100||paper.questions.length!==39||
    paper.questions.reduce((sum,q)=>sum+q.slotSeconds,0)!==2100||paper.questions.some((q,i)=>q.number!==i+1||q.options?.length!==4||!/^([ABCD])$/.test(q.correct)||!(q.audioSeconds>0)||q.audioSeconds+12>q.slotSeconds))throw Error('Incomplete mechanical verification: '+paper.id);
 }
 if(tables.some(t=>!/^\w+\.\w+$/.test(t)))throw Error('Invalid preservation table');
 const snapshot='jsonb_build_array('+tables.map(table=>`(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${table} t)`).join(',')+')';
 const data=JSON.stringify(papers);
 if(data.includes('$review_papers$'))throw Error('Unexpected SQL delimiter');
 return `-- Owner-requested review release: Tests03–06 v3 only.
-- The owner asked to activate these four for checking after disclosure that
-- broader editorial QA remains incomplete. This is not an eighteen-test release.
-- Reversible publication pointers; all historical banks/attempts stay intact.
do $publish_review$
declare
 wanted jsonb := $review_papers$${data}$review_papers$::jsonb;
 item jsonb;
 previous_paper jsonb;
 preserved_before jsonb;
 preserved_after jsonb;
 old_papers_before jsonb;
 old_papers_after jsonb;
 other_publications_before jsonb;
 other_publications_after jsonb;
 rpc_before text;
 rpc_after text;
begin
 perform pg_advisory_xact_lock(hashtext('hzad-listening-03-06-owner-review-v3'));
 select ${snapshot} into preserved_before;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_papers_before
  from academy_tcf_listening.papers where version not in ('tcf-listening-2026-11-test03-v3','tcf-listening-2026-11-test04-v3','tcf-listening-2026-11-test05-v3','tcf-listening-2026-11-test06-v3');
 select coalesce(jsonb_object_agg(test_id,version),'{}') into other_publications_before
  from academy_tcf_listening.published where test_id not in ('tcf-listening-03','tcf-listening-04','tcf-listening-05','tcf-listening-06');
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into rpc_before;
 for item in select value from jsonb_array_elements(wanted) loop
  select content into previous_paper from academy_tcf_listening.papers
   where id=item->>'id' and version=item->>'version';
  if found and previous_paper is distinct from item then raise exception 'Immutable candidate content differs: %',item->>'id';end if;
  if jsonb_array_length(item->'questions')<>39 or (item->>'seconds')::int<>2100
   or (select sum((q->>'slotSeconds')::numeric) from jsonb_array_elements(item->'questions') q)<>2100
   or exists(select 1 from jsonb_array_elements(item->'questions') q
    where jsonb_array_length(q->'options')<>4 or q->>'correct' not in ('A','B','C','D')
     or coalesce((q->>'audioSeconds')::numeric,0)<=0 or (q->>'audioSeconds')::numeric+12>(q->>'slotSeconds')::numeric)
   then raise exception 'Incomplete question bank: %',item->>'id';end if;
  select content into previous_paper from academy_tcf_listening.papers
   where id=item->>'id' and version='tcf-listening-2026-11-test'||right(item->>'id',2)||'-v1';
  if not found then raise exception 'Historical paper missing: %',item->>'id';end if;
  if exists(select 1 from jsonb_array_elements(item->'questions') q
   join jsonb_array_elements(previous_paper->'questions') oldq on oldq->>'number'=q->>'number'
   where oldq->'slotSeconds' is distinct from q->'slotSeconds' or oldq->'kind' is distinct from q->'kind')
   then raise exception 'Historical format/timing changed: %',item->>'id';end if;
  insert into academy_tcf_listening.papers(id,version,content)
   values(item->>'id',item->>'version',item) on conflict(id,version) do nothing;
  insert into academy_tcf_listening.published(test_id,version)
   values(item->>'id',item->>'version') on conflict(test_id) do update set version=excluded.version
   where academy_tcf_listening.published.version is distinct from excluded.version;
 end loop;
 select ${snapshot} into preserved_after;
 select coalesce(jsonb_object_agg(id||':'||version,md5(content::text)),'{}') into old_papers_after
  from academy_tcf_listening.papers where version not in ('tcf-listening-2026-11-test03-v3','tcf-listening-2026-11-test04-v3','tcf-listening-2026-11-test05-v3','tcf-listening-2026-11-test06-v3');
 select coalesce(jsonb_object_agg(test_id,version),'{}') into other_publications_after
  from academy_tcf_listening.published where test_id not in ('tcf-listening-03','tcf-listening-04','tcf-listening-05','tcf-listening-06');
 select md5(pg_get_functiondef('public.academy_tcf_listening_command(text,uuid,jsonb)'::regprocedure)) into rpc_after;
 if preserved_before is distinct from preserved_after or old_papers_before is distinct from old_papers_after
  or other_publications_before is distinct from other_publications_after or rpc_before is distinct from rpc_after
  then raise exception 'Existing student data, papers, publication or engine changed';end if;
 if exists(select 1 from jsonb_array_elements(wanted) p where not exists(
  select 1 from academy_tcf_listening.papers b join academy_tcf_listening.published v on v.test_id=b.id and v.version=b.version
   where b.id=p->>'id' and b.version=p->>'version' and b.content=p)) then raise exception 'Exact candidate publication failed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='academy_tcf_listening' and c.relkind='r' and not c.relrowsecurity)
  or has_table_privilege('authenticated','academy_tcf_listening.papers','select')
  or has_table_privilege('anon','academy_tcf_listening.papers','select')
  then raise exception 'Listening RLS/private bank protection differs';end if;
end;
$publish_review$;
`;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const output=process.argv[2];
 if(!output?.match(/^supabase\/migrations\/\d+_tcf_listening_03_06_owner_review_v3\.sql$/))throw Error('Supply the file created by supabase migration new');
 await writeFile(output,publicationSQL(await loadPapers()));
 console.log('Prepared exact immutable Tests03–06 v3 publication with preservation checks.');
}
