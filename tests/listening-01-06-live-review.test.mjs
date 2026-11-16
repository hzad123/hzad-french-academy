import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {publicationSQL6} from '../scripts/release/listening-01-06-v4.mjs';
import {protectedTables} from '../scripts/release/listening-owner-review.mjs';
import {assertReviewAuthorization,assertReviewQuestion,reviewRequest} from '../scripts/lib/listening-owner-review.mjs';
import {POLICY_VERSION,MODELS} from '../supabase/functions/academy-listening-qc/contracts.js';
import {policyHash,hash,contentHash,blindProjection,stimulus} from '../scripts/lib/listening-answer-qc.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const current=await Promise.all([1,2,3,4,5,6].map(n=>read(`supabase/exams/tcf-listening-test${String(n).padStart(2,'0')}${n>=3?'-v3':''}.json`)));
const candidateFiles=current.map(p=>`supabase/exams/tcf-listening-test${p.id.slice(-2)}-v4.json`);
const present=await Promise.all(candidateFiles.map(p=>access(p).then(()=>true,()=>false)));
if(present.some(Boolean)&&!present.every(Boolean))throw Error('The six-test release must include all six immutable banks');
// During preparation, transaction fixtures are not fabricated authoring QA.
// Once release banks exist, the same scoring/preservation tests use their real
// text and answer keys, and the committed migration must match them bytewise.
const fixtures=present.every(Boolean)?await Promise.all(candidateFiles.map(read)):
 current.map(p=>({...structuredClone(p),version:`tcf-listening-2026-11-test${p.id.slice(-2)}-v4`}));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
test('review exception retains failed blind evidence but cannot bypass a unique grounded key or exact scope',()=>{
 const summary={policy:POLICY_VERSION,policyHash,tests:[1,2,3,4,5,6],readyForMedia:false,readyForOwnerRequestedReview:true,groundedItems:234,totalItems:234,reviewAuthorization:{message:reviewRequest}};
 assertReviewAuthorization(summary);
 assert.throws(()=>assertReviewAuthorization({...summary,tests:[1,2,3,4,5,6,7]}),/authorization/);
 assert.throws(()=>assertReviewAuthorization({...summary,readyForMedia:true}),/authorization/);
 const q={number:9,kind:'announcement',question:'Sur quel quai le train arrive-t-il ?',options:['Sur le quai quatre.','Sur le quai deux.','Sur le quai trois.','Sur le quai cinq.'],correct:'A',explanation:'Le quai quatre est le nouveau lieu annoncé.',slotSeconds:40,
  segments:[{voice:'female',text:'Le train prévu sur le quai deux arrivera sur le quai quatre.'},{voice:'female',text:'Sur quel quai le train arrive-t-il ?'}]};
 q.transcript=q.segments.map(s=>s.text).join('\n');
 const input={...blindProjection(q),stimulus:stimulus(q),mode:'document'};
 const grounded={stage:'ground',policy:POLICY_VERSION,policyHash,model:MODELS.ground,responseId:'chatcmpl-ground-test-fixture',inputHash:hash(input),result:{supportedIndices:[0],ambiguous:false,questionSupported:true,options:q.options.map((_,i)=>({index:i,supported:i===0,plausibleMisunderstanding:i!==0,evidence:['arrivera sur le quai quatre'],reason:'Le quai quatre est la destination annoncée, contrairement aux autres numéros proposés.'})),summary:'Le nouveau quai est annoncé explicitement.'}};
 const blind={stage:'blind',policy:POLICY_VERSION,policyHash,model:MODELS.blind,responseId:'chatcmpl-blind-test-fixture',inputHash:hash(blindProjection(q)),result:{guess:0,probabilities:[.7,.1,.1,.1],standsOut:true,cues:[{option:0,cue:'Test fixture intentionally retains a failed blind result.'}],reason:'Synthetic failed blind result, never an actual evaluation.'}};
 const record={groundedPass:true,policyHash,contentHash:contentHash(q),sourceHash:contentHash(q),grounded,blind,blindPass:false};
 assert(assertReviewQuestion(q,record,q));
 const faithful=structuredClone(record);faithful.grounded.result.options.forEach(o=>o.evidence=['ARRIVERA  SUR LE QUAI QUATRE']);
 assert(assertReviewQuestion(q,faithful,q));
 const invented=structuredClone(record);invented.grounded.result.options[0].evidence=['arrivera sur le quai cinq'];
 assert.throws(()=>assertReviewQuestion(q,invented,q),/ambiguous or unsupported/);
 assert.throws(()=>assertReviewQuestion(q,{...record,groundContext:'spoken-recording'},q),/Invalid review transcript/);
 const ambiguous=structuredClone(record);ambiguous.grounded.result.ambiguous=true;
 assert.throws(()=>assertReviewQuestion(q,ambiguous,q),/ambiguous or unsupported/);
 const bad={...q,correct:'B'},forged={...record,contentHash:contentHash(bad)};
 assert.throws(()=>assertReviewQuestion(bad,forged,q),/ambiguous or unsupported/);
 assert.throws(()=>assertReviewQuestion(q,{...record,blindPass:true},q),/warning was altered/);
});
test('six-test publication rejects missing audio and never accepts another test or version',()=>{
 assert.throws(()=>publicationSQL6(fixtures.slice(0,5)),/Exactly Tests01/);
 const bad=structuredClone(fixtures);bad[0].questions[0].audioSeconds=null;
 assert.throws(()=>publicationSQL6(bad),/Incomplete mechanical/);
 const source=publicationSQL6(fixtures);assert(!source.includes('create or replace function'));assert(!/update\s+academy_ai\./i.test(source));
});
test('committed six-test migration matches the exact final banks when recorded candidates are present',async()=>{
 if(!present.every(Boolean))return;
 const matches=(await readdir('supabase/migrations')).filter(f=>/_tcf_listening_01_06_owner_review_v4\.sql$/.test(f));
 assert.equal(matches.length,1);assert.equal(await readFile('supabase/migrations/'+matches[0],'utf8'),publicationSQL6(fixtures));
 for(const [i,p] of fixtures.entries()){
  assert.notDeepEqual(p.questions.map(q=>q.options),current[i].questions.map(q=>q.options));
  assert.deepEqual(p.questions.map(q=>q.slotSeconds),current[i].questions.map(q=>q.slotSeconds));
 }
});
test('v4 publication rolls back, preserves pending/completed results and old banks, and scores all six exact versions',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
   insert into auth.users values('${alice}',now()),('${bob}',now());insert into public.purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
  for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261113171848_tcf_listening_test01.sql','20261113185622_tcf_listening_next_final_submit.sql','20261113194000_tcf_listening_fresh_start.sql','20261113223000_tcf_listening_twenty_registry.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
  for(let n=2;n<=20;n++){
   const p=await read(`supabase/exams/tcf-listening-test${String(n).padStart(2,'0')}.json`);
   await db.query('insert into academy_tcf_listening.papers values($1,$2,$3)',[p.id,p.version,p]);
  }
  for(const p of current){
   await db.query('insert into academy_tcf_listening.papers values($1,$2,$3) on conflict do nothing',[p.id,p.version,p]);
   await db.query('insert into academy_tcf_listening.published values($1,$2) on conflict(test_id) do update set version=excluded.version',[p.id,p.version]);
  }
  for(const table of protectedTables)if(!(await db.query('select to_regclass($1) name',[table])).rows[0].name){await db.exec(`create schema if not exists ${table.split('.')[0]};create table ${table}(fixture_data jsonb);`);await db.query(`insert into ${table} values($1)`,[{preserve:'unchanged'}]);}
  const cmd=async(user,action,id=null,payload={})=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await db.query('select public.academy_tcf_listening_command($1,$2,$3) value',[action,id,payload])).rows[0].value;};
  const pendingId=crypto.randomUUID(),completedId=crypto.randomUUID();
  let pending=await cmd(alice,'start',pendingId,{testId:current[0].id,version:current[0].version});
  await cmd(alice,'answer',pendingId,{number:1,choice:'B',revision:pending.revision});
  let completed=await cmd(alice,'start',completedId,{testId:current[1].id,version:current[1].version});
  for(const q of current[1].questions){completed=await cmd(alice,'answer',completedId,{number:q.number,choice:q.correct,revision:completed.revision});if(q.number<39)completed=await cmd(alice,'next',completedId,{number:q.number,revision:completed.revision});}
  completed=await cmd(alice,'submit',completedId,{revision:completed.revision});
  const oldRows=(await db.query('select to_jsonb(a) row from academy_tcf_listening.attempts a order by id')).rows;
  const sql=publicationSQL6(fixtures);
  await db.exec('begin;'+sql);assert((await cmd(alice,'catalog')).tests.every(p=>p.version.endsWith('-v4')));await db.exec('rollback;');
  assert.deepEqual((await cmd(alice,'catalog')).tests.map(p=>p.version),current.map(p=>p.version));
  await db.exec('begin;'+sql+'commit;');await db.exec('begin;'+sql+'commit;');
  assert.deepEqual((await db.query('select to_jsonb(a) row from academy_tcf_listening.attempts a order by id')).rows,oldRows);
  assert.deepEqual((await cmd(alice,'read',completedId)).result,completed.result);
  for(const p of fixtures){
   const id=crypto.randomUUID();let a=await cmd(alice,'start',id,{testId:p.id,version:p.version});const deadline=a.deadline;
   assert.equal(Date.parse(a.deadline)-Date.parse(a.startedAt),2100000);
   for(const q of a.paper.questions)for(const hidden of ['correct','transcript','segments','explanation'])assert(!Object.hasOwn(q,hidden));
   await assert.rejects(()=>cmd(bob,'read',id),/not found/);
   for(const q of p.questions){a=await cmd(alice,'answer',id,{number:q.number,choice:q.correct,revision:a.revision});if(q.number<39)a=await cmd(alice,'next',id,{number:q.number,revision:a.revision});assert.equal(a.deadline,deadline);}
   a=await cmd(alice,'submit',id,{revision:a.revision});assert.equal(a.result.correct,39);assert.equal(a.result.total,39);
  }
  assert.equal((await db.query('select count(*) n from academy_tcf_listening.papers')).rows[0].n,30);
  const changed=structuredClone(fixtures);changed[0].questions[0].explanation+=' Modified immutable bank.';
  await assert.rejects(()=>db.exec(publicationSQL6(changed)),/Immutable review version differs/);
 }finally{await db.close();}
});
