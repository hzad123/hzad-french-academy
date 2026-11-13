import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const pilotMigration=await readFile('supabase/migrations/20261113171848_tcf_listening_test01.sql','utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',eve='33333333-3333-4333-8333-333333333333';
const identity={testId:paper.id,version:paper.version};
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now()),('${eve}',null);insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const f of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
 const cmd=async(user,action,id=null,payload={})=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);return (await q('select public.academy_tcf_listening_command($1,$2,$3) v',[action,id,payload]))[0].v};
 const start=(user=alice,id=crypto.randomUUID())=>cmd(user,'start',id,identity);
 const at=async(id,number,extra=1)=>{const elapsed=paper.questions.slice(0,number-1).reduce((n,q)=>n+q.slotSeconds,0)+extra;await q("update academy_tcf_listening.attempts set started_at=now()-$2*interval'1 second',deadline=now()+(2100-$2)*interval'1 second' where id=$1",[id,elapsed])};
 return {db,q,cmd,start,at};
}
const migration=await readFile('supabase/migrations/20261113185622_tcf_listening_next_final_submit.sql','utf8');
test('Next advances through all39 questions, preserves the original deadline and submits only on the final question',async()=>{
 const {db,cmd,start}=await fixture();try{await db.exec(pilotMigration);await db.exec(migration);let a=await start();const deadline=a.deadline,started=a.startedAt;
 await assert.rejects(()=>cmd(alice,'submit',a.id,{revision:a.revision}),/final listening question/);
 for(const item of paper.questions){
  assert.equal(a.currentQuestion,item.number);assert.equal(a.deadline,deadline);assert.equal(a.startedAt,started);assert.equal(a.result,null);
  for(const q of a.paper.questions)for(const key of ['correct','transcript','segments','explanation'])assert(!Object.hasOwn(q,key));
  a=await cmd(alice,'answer',a.id,{number:item.number,choice:item.correct,revision:a.revision});
  if(item.number<39){const before=a;a=await cmd(alice,'next',a.id,{number:item.number,revision:a.revision});assert.equal(a.currentQuestion,item.number+1);assert.equal(a.revision,before.revision+1);assert.equal(a.questionStartedAt,a.serverNow);assert.deepEqual(a.answers,before.answers);
   const resume=await start();assert.equal(resume.id,a.id);assert.equal(resume.currentQuestion,a.currentQuestion);assert.equal(resume.deadline,deadline);assert.equal(resume.questionStartedAt,a.questionStartedAt);
  }
 }
 assert.equal(a.questionEndsAt,deadline);await assert.rejects(()=>cmd(alice,'next',a.id,{number:39,revision:a.revision}),/final listening question/);
 a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.correct,39);assert.equal(a.result.percentage,100);assert.equal(a.result.unanswered,0);assert.equal(a.result.rows.length,39);assert.deepEqual((await cmd(alice,'submit',a.id,{revision:0})).result,a.result);
 }finally{await db.close()}
});
test('Next rejects duplicate/stale/forged/cross-account inputs and never rewrites past answers',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(pilotMigration);await db.exec(migration);let a=await start();
 for(const payload of [{number:2,revision:0},{number:'1',revision:0},{number:1.5,revision:0},{number:1},{number:1,revision:0,skipped_seconds:2000},{number:1,revision:0,currentQuestion:39}])await assert.rejects(()=>cmd(alice,'next',a.id,payload),/Invalid|current question|another tab/);
 await assert.rejects(()=>cmd(bob,'next',a.id,{number:1,revision:0}),/not found/);await assert.rejects(()=>cmd(eve,'next',a.id,{number:1,revision:0}),/verified|access/i);
 const request={number:1,revision:a.revision};a=await cmd(alice,'next',a.id,request);assert.equal(a.currentQuestion,2);
 await assert.rejects(()=>cmd(alice,'next',a.id,request),/another tab/);assert.equal((await cmd(alice,'read',a.id)).currentQuestion,2);
 await assert.rejects(()=>cmd(alice,'next',a.id,{number:1,revision:a.revision}),/current question/);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:1,choice:'A',revision:a.revision}),/current question/);
 await assert.rejects(()=>cmd(alice,'submit',a.id,{revision:a.revision}),/final listening question/);
 await q("update purchase_entitlements set status='revoked' where user_id=$1",[alice]);await assert.rejects(()=>cmd(alice,'next',a.id,{number:2,revision:a.revision}),/access/i);
 }finally{await db.close()}
});
test('automatic advancement and the final question continue using the original clock after manual Next',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(pilotMigration);await db.exec(migration);let a=await start();a=await cmd(alice,'next',a.id,{number:1,revision:0});
 // Simulate time passing without changing the original duration or navigation offset.
 const secondStart=paper.questions[1].slotSeconds+1;await q("update academy_tcf_listening.attempts set started_at=started_at-$2*interval'1 second',deadline=deadline-$2*interval'1 second' where id=$1",[a.id,secondStart]);a=await cmd(alice,'read',a.id);assert.equal(a.currentQuestion,3);
 while(a.currentQuestion<39)a=await cmd(alice,'next',a.id,{number:a.currentQuestion,revision:a.revision});const finalStart=a.questionStartedAt,deadline=a.deadline;
 await q("update academy_tcf_listening.attempts set started_at=started_at-interval'300 seconds' where id=$1",[a.id]);a=await cmd(alice,'read',a.id);assert.equal(a.currentQuestion,39);assert.equal(a.questionEndsAt,deadline);assert.notEqual(a.questionStartedAt,finalStart);
 a=await cmd(alice,'answer',a.id,{number:39,choice:paper.questions[38].correct,revision:a.revision});assert.equal(a.answers[39],paper.questions[38].correct);
 await q("update academy_tcf_listening.attempts set deadline=now()-interval'1 second' where id=$1",[a.id]);const expired=await cmd(alice,'next',a.id,{number:39,revision:a.revision});assert.equal(expired.status,'completed');assert.equal(expired.result.correct,1);assert.equal(expired.result.unanswered,38);assert.deepEqual((await cmd(alice,'read',a.id)).result,expired.result);
 }finally{await db.close()}
});
test('navigation migration preserves all existing attempts, results, answers and clocks; private table remains inaccessible',async()=>{
 const {db,q,cmd,start,at}=await fixture();try{await db.exec(pilotMigration);let saved=await start();saved=await cmd(alice,'submit',saved.id,{revision:0});const active=await start(bob);await at(active.id,20);const oldActive=await cmd(bob,'read',active.id);
 const snapshot=()=>q('select to_jsonb(t) v from academy_tcf_listening.attempts t order by id');const before=await snapshot();
 await db.exec(migration.replace('commit;','rollback;'));assert.deepEqual(await snapshot(),before);assert.equal((await q("select count(*)::int n from pg_class where oid=to_regclass('academy_tcf_listening.navigation')"))[0].n,0);
 await db.exec(migration);assert.deepEqual(await snapshot(),before);assert.equal((await q('select count(*)::int n from academy_tcf_listening.navigation'))[0].n,0);assert.deepEqual((await cmd(alice,'read',saved.id)).result,saved.result);const current=await cmd(bob,'read',active.id);assert.equal(current.currentQuestion,20);assert.equal(current.deadline,oldActive.deadline);assert.equal(current.questionStartedAt,oldActive.questionStartedAt);
 for(const role of ['anon','authenticated','service_role'])for(const privilege of ['select','insert','update','delete'])assert.equal((await q(`select has_table_privilege('${role}','academy_tcf_listening.navigation','${privilege}') v`))[0].v,false);
 assert.equal((await q("select relrowsecurity v from pg_class where oid='academy_tcf_listening.navigation'::regclass"))[0].v,true);
 }finally{await db.close()}
});
test('mixed saved answers, skips and final submission produce the correct end-only marking',async()=>{
 const {db,cmd,start}=await fixture();try{await db.exec(pilotMigration);await db.exec(migration);let a=await start();a=await cmd(alice,'answer',a.id,{number:1,choice:paper.questions[0].correct,revision:0});a=await cmd(alice,'next',a.id,{number:1,revision:a.revision});const wrong='ABCD'.split('').find(c=>c!==paper.questions[1].correct);a=await cmd(alice,'answer',a.id,{number:2,choice:wrong,revision:a.revision});while(a.currentQuestion<39)a=await cmd(alice,'next',a.id,{number:a.currentQuestion,revision:a.revision});a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.correct,1);assert.equal(a.result.unanswered,37);assert.equal(a.result.rows[1].selected,wrong);assert.equal(a.result.rows[1].correct,paper.questions[1].correct);assert.equal(a.result.rows[2].selected,null);assert.equal(a.result.rows[38].transcript,paper.questions[38].transcript);
 }finally{await db.close()}
});
test('reviewed Next release rehearses and reruns while preserving earlier academy and all navigation progress',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(pilotMigration);
 await db.exec(`create table academy_ai.testing_grants(id text);create schema academy_tcf_writing;create table academy_tcf_writing.attempts(id text);create schema academy_tcf_speaking;create table academy_tcf_speaking.attempts(id text);create table academy_tcf_speaking.calls(id text);create schema academy_exams;create table academy_exams.attempts(id text);create schema academy_tcf_reading;create table academy_tcf_reading.papers(id text);create table academy_tcf_reading.attempts(id text);create table academy_tcf_reading.published_papers(id text);create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 let old=await start();old=await cmd(alice,'submit',old.id,{revision:0});const active=await start(bob);
 const transaction=(pending,commit)=>execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('next','scripts/release/tcf-listening-next.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.transaction("+pending+","+commit+"))"],{encoding:'utf8',maxBuffer:4*1024*1024});
 await db.exec(transaction('True','False'));assert.equal((await q("select to_regclass('academy_tcf_listening.navigation') v"))[0].v,null);await db.exec(transaction('True','True'));
 const advanced=await cmd(bob,'next',active.id,{number:1,revision:0});await db.exec(transaction('False','False'));await db.exec(transaction('False','True'));const reopened=await cmd(bob,'read',active.id);assert.equal(reopened.currentQuestion,2);assert.equal(reopened.questionStartedAt,advanced.questionStartedAt);assert.equal(reopened.deadline,active.deadline);assert.deepEqual((await cmd(alice,'read',old.id)).result,old.result);assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,1);
 }finally{await db.close()}
});


test('explicit fresh start begins at question one and preserves an earlier active attempt as a marked result',async()=>{
 const {db,cmd,start}=await fixture();try{
  await db.exec(pilotMigration);await db.exec(migration);
  const freshMigration=await readFile('supabase/migrations/20261113194000_tcf_listening_fresh_start.sql','utf8');
  await db.exec(freshMigration);
  let prior=await start();const priorId=prior.id,priorDeadline=prior.deadline;
  prior=await cmd(alice,'answer',priorId,{number:1,choice:paper.questions[0].correct,revision:prior.revision});
  prior=await cmd(alice,'next',priorId,{number:1,revision:prior.revision});
  assert.equal(prior.currentQuestion,2);
  const nextId=crypto.randomUUID();
  const fresh=await cmd(alice,'restart',nextId,identity);
  assert.equal(fresh.id,nextId);assert.notEqual(fresh.id,priorId);
  assert.equal(fresh.currentQuestion,1);assert.equal(fresh.status,'active');
  assert.deepEqual(fresh.answers,{});assert.equal(fresh.revision,0);
  assert.equal(Date.parse(fresh.deadline)-Date.parse(fresh.startedAt),2100000);
  assert.equal(fresh.questionStartedAt,fresh.startedAt);
  const earlier=await cmd(alice,'read',priorId);
  assert.equal(earlier.status,'completed');assert.equal(earlier.deadline,priorDeadline);
  assert.equal(earlier.result.correct,1);assert.equal(earlier.result.unanswered,38);
  assert.equal(earlier.answers[1],paper.questions[0].correct);
  assert.equal((await cmd(alice,'restart',nextId,identity)).id,nextId);
  assert.equal((await start()).id,nextId);
  assert.equal((await cmd(alice,'read',priorId)).result.correct,1);
  await assert.rejects(()=>cmd(bob,'restart',priorId,identity),/not found/);
  await assert.rejects(()=>cmd(alice,'restart',crypto.randomUUID(),{testId:'tcf-listening-02',version:identity.version}),/changed/);
  await assert.rejects(()=>cmd(alice,'restart',crypto.randomUUID(),{...identity,score:39}),/Invalid/);
  const history=await cmd(alice,'catalog');assert.equal(history.history.length,2);
  assert(history.history.some(row=>row.id===priorId&&row.status==='completed'));
  assert(history.history.some(row=>row.id===nextId&&row.status==='active'));
 }finally{await db.close()}
});
