import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const pilot=JSON.parse(await readFile('supabase/exams/tcf-reading-test01.json','utf8'));
const added=await Promise.all((await readdir('supabase/exams/tcf-reading-v2')).sort().map(async name=>JSON.parse(await readFile('supabase/exams/tcf-reading-v2/'+name,'utf8'))));
const papers=[pilot,...added],previous=await readFile('supabase/migrations/20261112212313_tcf_reading_twenty_tests.sql','utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',unverified='33333333-3333-4333-8333-333333333333';
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now()),('${unverified}',null);insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const f of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261112204911_tcf_reading_test01.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
 const cmd=async(user,action,id=null,payload={})=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);return (await q('select public.academy_tcf_reading_command($1,$2,$3) v',[action,id,payload]))[0].v};
 const start=(p,user=alice,id=crypto.randomUUID())=>cmd(user,'start',id,{testId:p.id,version:p.version});
 return {db,q,cmd,start};
}

const revised=await Promise.all((await readdir('supabase/exams/tcf-reading-v3')).sort().map(async name=>JSON.parse(await readFile('supabase/exams/tcf-reading-v3/'+name,'utf8'))));
const current=[pilot,...revised],migration=await readFile('supabase/migrations/20261112222727_reading_reference_length.sql','utf8');
test('all741 revised passages follow Test01 position lengths and retain distinct topics, answers and evidence',()=>{
 const wc=s=>s.trim().split(/\s+/u).length;assert.equal(revised.length,19);const seen=new Set();
 for(const [i,p] of revised.entries()){
  assert.equal(p.id,added[i].id);assert.equal(p.version,'tcf-reading-2026-11-reference-v3');assert.equal(p.title,`TCF Reading · Test ${String(i+2).padStart(2,'0')}`);assert.equal(p.topic,undefined);assert.equal(p.questions.length,39);assert.equal(p.seconds,3600);assert.equal(p.maxPoints,699);
  for(const [j,q] of p.questions.entries()){
   const baseline=wc(pilot.questions[j].passage),count=wc(q.passage);assert(Math.abs(count-baseline)<=Math.max(5,Math.round(baseline*.10)),`${p.id}/${j+1}: ${count} vs ${baseline}`);
   assert(q.passage.startsWith(added[i].questions[j].passage));assert.equal(q.correct,added[i].questions[j].correct);assert.deepEqual(q.options,added[i].questions[j].options);assert.equal(q.explanation,added[i].questions[j].explanation);assert.equal(q.points,pilot.questions[j].points);assert(!seen.has(q.passage));seen.add(q.passage);
   if(j>=35)assert(count>=120&&count<=151,`${p.id}/${j+1} final text too short`);
  }
 }
 assert.equal(seen.size,741);assert.deepEqual(migration.split('$paper$').filter((_,i)=>i%2===1).map(s=>JSON.parse(s)),revised);
});
test('revision migration preserves every legacy bank, completed result and unfinished attempt through rollback and publication',async()=>{
 const {db,q,cmd,start}=await fixture();try{
 await db.exec(previous);let saved=await start(added[0]);saved=await cmd(alice,'answer',saved.id,{revision:0,number:1,choice:added[0].questions[0].correct});saved=await cmd(alice,'submit',saved.id,{revision:saved.revision});const active=await start(added[18],bob);
 const snapshot=async()=>({attempts:await q('select to_jsonb(t) v from academy_tcf_reading.attempts t order by id'),banks:await q('select content from academy_tcf_reading.papers order by id,version'),users:await q('select to_jsonb(t) v from auth.users t order by id'),policy:await q('select to_jsonb(t) v from academy_ai.policy t')});const before=await snapshot();
 await db.exec(migration.replace('commit;','rollback;'));assert.deepEqual(await snapshot(),before);await db.exec(migration);assert.deepEqual((await snapshot()).attempts,before.attempts);assert.deepEqual((await snapshot()).users,before.users);assert.deepEqual((await snapshot()).policy,before.policy);
 const banks=await q('select content from academy_tcf_reading.papers where version<>$1 order by id,version',[revised[0].version]);assert.deepEqual(banks,before.banks);
 assert.deepEqual((await cmd(alice,'read',saved.id)).result,saved.result);assert.deepEqual((await cmd(bob,'read',active.id)).paper,active.paper);assert.equal((await cmd(bob,'read',active.id)).deadline,active.deadline);
 assert.equal((await start(added[18],bob,active.id)).id,active.id);await assert.rejects(()=>start(added[18],bob),/changed/);
 const next=await start(revised[18],bob);assert.notEqual(next.id,active.id);assert.equal(next.version,revised[18].version);assert.equal((await start(revised[18],bob)).id,next.id);
 await assert.rejects(()=>start(added[18],alice,active.id),/not found/);await assert.rejects(()=>start(revised[18],bob,active.id),/already used/);
 const cat=await cmd(alice,'catalog');assert.equal(cat.tests.length,20);assert.deepEqual(cat.tests.map(t=>[t.id,t.version]),current.map(t=>[t.id,t.version]));assert(cat.tests.every(t=>!Object.hasOwn(t,'topic')));assert.equal((await q('select count(*)::int n from academy_tcf_reading.papers'))[0].n,39);
 for(const role of ['anon','authenticated','service_role'])assert.equal((await q(`select has_table_privilege('${role}','academy_tcf_reading.published_papers','select') v`))[0].v,false);
 assert.equal((await q("select relrowsecurity v from pg_class where oid='academy_tcf_reading.published_papers'::regclass"))[0].v,true);
 await assert.rejects(()=>q("update academy_tcf_reading.papers set content='{}' where id='tcf-reading-02'"),/immutable/);
 }finally{await db.close()}
});
test('every current paper hides keys, grades all39answers to699 and reopens the exact revised text',async()=>{
 const {db,cmd,start}=await fixture();try{await db.exec(previous);await db.exec(migration);
 for(const p of current){let a=await start(p);const deadline=a.deadline;assert.deepEqual(a.paper.questions,p.questions.map(({correct,explanation,...q})=>q));assert.equal(a.result,null);
 for(const q of p.questions)a=await cmd(alice,'answer',a.id,{revision:a.revision,number:q.number,choice:q.correct});
 a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.correct,39);assert.equal(a.result.points,699);assert.equal(a.result.rows.length,39);assert(a.result.rows.every(r=>r.isCorrect));assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result);assert.equal((await cmd(alice,'read',a.id)).deadline,deadline);
 }
 }finally{await db.close()}
});
test('production revision transaction rehearses, commits and reruns without changing any saved work',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(previous);
 await db.exec(`create table academy_ai.testing_grants(id text);create schema academy_tcf_writing;create table academy_tcf_writing.attempts(id text);create schema academy_tcf_speaking;create table academy_tcf_speaking.attempts(id text);create table academy_tcf_speaking.calls(id text);create schema academy_exams;create table academy_exams.attempts(id text);create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 let old=await start(added[18]);old=await cmd(alice,'submit',old.id,{revision:0});
 const transaction=(pending,commit)=>execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('reference','scripts/release/tcf-reading-reference.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.transaction("+pending+","+commit+"))"],{encoding:'utf8',maxBuffer:8*1024*1024});
 await db.exec(transaction('True','False'));assert.equal((await q('select count(*)::int n from academy_tcf_reading.papers'))[0].n,20);
 await db.exec(transaction('True','True'));let a=await start(revised[18]);a=await cmd(alice,'submit',a.id,{revision:0});await db.exec(transaction('False','False'));await db.exec(transaction('False','True'));
 assert.deepEqual((await cmd(alice,'read',old.id)).result,old.result);assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result);assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,1);
 }finally{await db.close()}
});
