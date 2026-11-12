import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const pilot=JSON.parse(await readFile('supabase/exams/tcf-reading-test01.json','utf8'));
const added=await Promise.all((await readdir('supabase/exams/tcf-reading-v2')).sort().map(async name=>JSON.parse(await readFile('supabase/exams/tcf-reading-v2/'+name,'utf8'))));
const papers=[pilot,...added],migration=await readFile('supabase/migrations/20261112212313_tcf_reading_twenty_tests.sql','utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',unverified='33333333-3333-4333-8333-333333333333';
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now()),('${unverified}',null);insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const f of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261112204911_tcf_reading_test01.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
 const cmd=async(user,action,id=null,payload={})=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);return (await q('select public.academy_tcf_reading_command($1,$2,$3) v',[action,id,payload]))[0].v};
 const start=(p,user=alice,id=crypto.randomUUID())=>cmd(user,'start',id,{testId:p.id,version:p.version});
 return {db,q,cmd,start};
}
test('20 distinct reading papers retain the original pilot and have780 complete four-choice questions',()=>{
 assert.equal(papers.length,20);assert.equal(added.length,19);assert.equal(new Set(added.map(p=>p.topic)).size,19);
 const seen=new Set();
 for(const [i,p] of papers.entries()){
  assert.equal(p.id,`tcf-reading-${String(i+1).padStart(2,'0')}`);assert.equal(p.seconds,3600);assert.equal(p.maxPoints,699);assert.equal(p.questions.length,39);assert.equal(p.questions.reduce((n,q)=>n+q.points,0),699);
  const letters=new Set();for(const [j,q] of p.questions.entries()){
   assert.equal(q.number,j+1);assert(q.passage.length>=65,`${p.id} question${q.number} too little context`);assert(q.question.endsWith('?'));assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.toLowerCase())).size,4);assert.match(q.correct,/^[ABCD]$/);assert(q.explanation.length>50);letters.add(q.correct);
   const normalized=q.passage.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();assert(!seen.has(normalized),'Repeated passage '+p.id+'/'+q.number);seen.add(normalized);
   assert(!/[~|]|équ ivaut|JugER/.test(q.passage+q.explanation));
  }if(i>0)assert.equal(letters.size,4);
 }
 assert.equal(seen.size,780);
 const seeds=migration.split('$paper$').filter((_,i)=>i%2===1).map(s=>JSON.parse(s));assert.deepEqual(seeds,added);
});
test('twenty-paper migration rollback/preservation retains old Test01 work, results, deadlines and all existing settings',async()=>{
 const {db,q,cmd,start}=await fixture();try{
 let saved=await start(pilot);saved=await cmd(alice,'answer',saved.id,{revision:0,number:1,choice:'D'});saved=await cmd(alice,'submit',saved.id,{revision:saved.revision});const active=await start(pilot,bob);
 const snapshot=async()=>({attempts:await q('select to_jsonb(t) v from academy_tcf_reading.attempts t order by id'),pilot:await q("select content from academy_tcf_reading.papers where id='tcf-reading-01'"),policy:await q('select to_jsonb(t) v from academy_ai.policy t'),activities:await q('select to_jsonb(t) v from academy_ai.activities t order by kind'),users:await q('select to_jsonb(t) v from auth.users t order by id')});
 const before=await snapshot();await db.exec(migration.replace('commit;','rollback;'));assert.equal((await q('select count(*)::int n from academy_tcf_reading.papers'))[0].n,1);assert.deepEqual(await snapshot(),before);
 await db.exec(migration);assert.deepEqual(await snapshot(),before);assert.deepEqual((await cmd(alice,'read',saved.id)).result,saved.result);assert.equal((await cmd(bob,'read',active.id)).deadline,active.deadline);
 assert.equal((await cmd(alice,'catalog')).tests.length,20);assert.equal((await q('select count(*)::int n from academy_ai.wallets'))[0].n,0);
 await assert.rejects(()=>q("update academy_tcf_reading.papers set content='{}' where id='tcf-reading-01'"),/immutable/);
 await assert.rejects(()=>q('update academy_tcf_reading.attempts set test_id=$1,version=$2 where id=$3',[added[0].id,added[0].version,saved.id]),/immutable/);
 }finally{await db.close()}
});
test('all20 papers select their own frozen prompts/key, score699 for39 correct and remain original on reopening',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(migration);
 const ids=[];for(const paper of papers){let a=await start(paper);ids.push(a.id);const deadline=a.deadline;
  assert.equal(a.testId,paper.id);assert.equal(a.version,paper.version);assert.deepEqual(a.paper.questions,paper.questions.map(({correct,explanation,...q})=>q));assert.equal(a.result,null);
  assert.equal((await start(paper)).id,a.id);assert.equal((await start(paper)).deadline,deadline);
  for(const q of paper.questions)a=await cmd(alice,'answer',a.id,{revision:a.revision,number:q.number,choice:q.correct});
  a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.points,699);assert.equal(a.result.correct,39);assert.equal(a.result.rows.length,39);assert(a.result.rows.every(r=>r.isCorrect));
  assert.deepEqual((await cmd(alice,'submit',a.id,{revision:0})).result,a.result);assert.equal((await cmd(alice,'read',a.id)).deadline,deadline);
 }
 assert.equal(new Set(ids).size,20);for(const [i,id] of ids.entries()){const a=await cmd(alice,'read',id);assert.equal(a.paper.questions[38].passage,papers[i].questions[38].passage);assert.equal(a.result.rows[38].correct,papers[i].questions[38].correct)}
 }finally{await db.close()}
});
test('switching unfinished papers never resumes another paper or resets clocks, and forged identities/cross-account access fail',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(migration);
 const a=await start(papers[1]),b=await start(papers[19]);assert.notEqual(a.id,b.id);assert.equal((await start(papers[1])).id,a.id);assert.equal((await start(papers[19])).id,b.id);assert.equal((await cmd(alice,'read',a.id)).deadline,a.deadline);
 for(const action of ['read','answer','submit','start'])await assert.rejects(()=>cmd(bob,action,a.id,action==='start'?{testId:papers[1].id,version:papers[1].version}:{}),/not found/);
 await assert.rejects(()=>start(papers[19],alice,a.id),/already used/);
 await assert.rejects(()=>cmd(alice,'start',crypto.randomUUID(),{testId:'tcf-reading-21',version:papers[1].version}),/changed/);
 await assert.rejects(()=>cmd(alice,'start',crypto.randomUUID(),{testId:papers[1].id,version:pilot.version}),/changed/);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:1,choice:'A',revision:0,score:699}),/Invalid/);
 await assert.rejects(()=>cmd(unverified,'catalog'),/access|verified/i);
 await q("update academy_tcf_reading.attempts set deadline=now()-interval'1 second' where id=$1",[a.id]);const expired=await cmd(alice,'answer',a.id,{number:1,choice:papers[1].questions[0].correct,revision:0});assert.equal(expired.status,'completed');assert.equal(expired.result.points,0);assert.equal(expired.result.unanswered,39);
 await q("update purchase_entitlements set status='revoked' where user_id=$1",[alice]);await assert.rejects(()=>cmd(alice,'read',b.id),/access/i);
 }finally{await db.close()}
});
test('all20 public catalogs/active attempts hide keys and preserve restrictive RPC/table/helper permissions',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(migration);const catalog=await cmd(alice,'catalog');assert(!JSON.stringify(catalog.tests).includes('correct'));assert(catalog.tests.slice(1).every(t=>t.topic));
 for(const p of papers){const a=await start(p);assert(a.paper.questions.every(q=>!Object.hasOwn(q,'correct')&&!Object.hasOwn(q,'explanation')));assert.equal(a.result,null)}
 for(const role of ['anon','authenticated','service_role']){assert.equal((await q(`select has_table_privilege('${role}','academy_tcf_reading.papers','select') v`))[0].v,false);assert.equal((await q(`select has_schema_privilege('${role}','academy_tcf_reading','usage') v`))[0].v,false)}
 for(const role of ['anon','service_role'])assert.equal((await q(`select has_function_privilege('${role}','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') v`))[0].v,false);
 assert.equal((await q("select has_function_privilege('authenticated','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') v"))[0].v,true);
 }finally{await db.close()}
});
test('production20paper release rehearses before commit and preserves old/new results on an idempotent rerun',async()=>{
 const {db,q,cmd,start}=await fixture();try{
 await db.exec(`create table academy_ai.testing_grants(id text);create schema academy_tcf_writing;create table academy_tcf_writing.attempts(id text);insert into academy_tcf_writing.attempts values('saved-writing');create schema academy_tcf_speaking;create table academy_tcf_speaking.attempts(id text);create table academy_tcf_speaking.calls(id text);create schema academy_exams;create table academy_exams.attempts(id text);create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 let old=await start(pilot);old=await cmd(alice,'answer',old.id,{revision:0,number:1,choice:'D'});old=await cmd(alice,'submit',old.id,{revision:old.revision});
 const transaction=(pending,commit)=>execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('twenty','scripts/release/tcf-reading-twenty.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.transaction("+pending+","+commit+"))"],{encoding:'utf8',maxBuffer:4*1024*1024});
 await db.exec(transaction('True','False'));assert.equal((await q('select count(*)::int n from academy_tcf_reading.papers'))[0].n,1);
 await db.exec(transaction('True','True'));let a=await start(added[18]);a=await cmd(alice,'submit',a.id,{revision:a.revision});
 await db.exec(transaction('False','False'));await db.exec(transaction('False','True'));
 assert.deepEqual((await cmd(alice,'read',old.id)).result,old.result);assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result);assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,1);
 }finally{await db.close()}
});
