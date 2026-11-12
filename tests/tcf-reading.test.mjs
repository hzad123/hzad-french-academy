import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {makeReadingStore} from '../src/exams/tcf-reading/store.js';
const paper=JSON.parse(await readFile('supabase/exams/tcf-reading-test01.json','utf8'));
const migration=await readFile('supabase/migrations/20261112204911_tcf_reading_test01.sql','utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',eve='33333333-3333-4333-8333-333333333333';
const identity={testId:paper.id,version:paper.version};
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now()),('${eve}',null);insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const f of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 const q=async(sql,params=[])=>(await db.query(sql,params)).rows;
 const cmd=async(user,action,id=null,payload={})=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);return (await q('select public.academy_tcf_reading_command($1,$2,$3) v',[action,id,payload]))[0].v};
 return {db,q,cmd};
}
test('attached reading paper contains39 ordered questions, four options and PDF scoring bands totalling699',()=>{
 assert.equal(paper.questions.length,39);assert.equal(paper.seconds,3600);assert.equal(paper.maxPoints,699);
 assert.equal(paper.questions.reduce((sum,q)=>sum+q.points,0),699);
 for(const [i,q] of paper.questions.entries()){assert.equal(q.number,i+1);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.passage.length>100);assert(q.question.endsWith('?'));assert.match(q.correct,/^[ABCD]$/);assert(q.explanation.length>50)}
 assert.match(paper.questions[0].passage,/Genève/);assert.match(paper.questions[38].passage,/trottinettes électriques/);
 assert.match(paper.questions[1].options[3],/sans date limite/);assert.match(paper.questions[11].options[3],/sous conditions/);
 const seed=JSON.parse(migration.split('$paper$')[1]);assert.deepEqual(seed,paper);
});
test('reading migration rehearses and preserves wallets, pricing, progress and auth; authenticated RPC alone can see sanitized questions',async()=>{
 const {db,q,cmd}=await fixture();try{
 const snapshot=()=>q("select (select jsonb_agg(to_jsonb(t)) from academy_ai.policy t) policy,(select jsonb_agg(to_jsonb(t) order by kind) from academy_ai.activities t) activities,(select jsonb_agg(to_jsonb(t) order by id) from auth.users t) users,(select count(*) from academy_ai.wallets) wallets,(select count(*) from public.academy_learning_progress) progress");const before=await snapshot();
 await db.exec(migration.replace('commit;','rollback;'));assert.equal((await q("select count(*)::int n from pg_namespace where nspname='academy_tcf_reading'"))[0].n,0);
 await db.exec(migration);assert.deepEqual(await snapshot(),before);
 for(const role of ['anon','authenticated','service_role']){assert.equal((await q(`select has_schema_privilege('${role}','academy_tcf_reading','usage') allowed`))[0].allowed,false);assert.equal((await q(`select has_table_privilege('${role}','academy_tcf_reading.papers','select') allowed`))[0].allowed,false)}
 assert.equal((await q("select has_function_privilege('anon','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') allowed"))[0].allowed,false);
 assert.equal((await q("select has_function_privilege('authenticated','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') allowed"))[0].allowed,true);
 const catalog=await cmd(alice,'catalog');assert.equal(catalog.tests.length,1);assert.equal(catalog.tests[0].questions,39);assert(!JSON.stringify(catalog).includes('correct'));
 const a=await cmd(alice,'start',crypto.randomUUID(),identity);assert.equal(a.paper.questions.length,39);assert.equal(a.result,null);assert(a.paper.questions.every(q=>!('correct' in q)&&!('explanation' in q)));assert.deepEqual(await snapshot(),before);
 }finally{await db.close()}
});
test('reading choices persist; replay/resume retain timer/identity, completion marks mixed/blank answers and freezes review',async()=>{
 const {db,q,cmd}=await fixture();try{await db.exec(migration);const id=crypto.randomUUID();let a=await cmd(alice,'start',id,identity);const deadline=a.deadline;
 assert.equal((await cmd(alice,'start',id,identity)).deadline,deadline);assert.equal((await cmd(alice,'start',crypto.randomUUID(),identity)).id,id);
 a=await cmd(alice,'answer',id,{revision:a.revision,number:1,choice:'D'});a=await cmd(alice,'answer',id,{revision:a.revision,number:2,choice:'A'});
 a=await cmd(alice,'answer',id,{revision:a.revision,number:39,choice:'D'});assert.equal((await cmd(alice,'read',id)).answers[39],'D');assert.equal(a.deadline,deadline);
 await assert.rejects(()=>cmd(alice,'answer',id,{revision:0,number:3,choice:'C'}),/another tab/);
 const revision=a.revision;a=await cmd(alice,'submit',id,{revision});assert.equal(a.status,'completed');assert.equal(a.result.correct,2);assert.equal(a.result.points,36);assert.equal(a.result.unanswered,36);assert.equal(a.result.rows.length,39);assert.equal(a.result.rows[1].selected,'A');assert.equal(a.result.rows[1].correct,'B');assert.equal(a.result.rows[1].isCorrect,false);assert.equal(a.result.rows[2].selected,null);
 assert.deepEqual((await cmd(alice,'submit',id,{revision})).result,a.result);assert.deepEqual((await cmd(alice,'answer',id,{revision:a.revision,number:1,choice:'A'})).result,a.result);
 assert.equal((await cmd(alice,'read',id)).deadline,deadline);assert.equal((await cmd(alice,'catalog')).history[0].status,'completed');
 const next=await cmd(alice,'start',crypto.randomUUID(),identity);assert.notEqual(next.id,id);assert.equal((await cmd(alice,'read',id)).result.correct,2);
 }finally{await db.close()}
});
test('all39 answers score699 only from server key; expiry grades saved choices once and never accepts late answers',async()=>{
 const {db,q,cmd}=await fixture();try{await db.exec(migration);let a=await cmd(alice,'start',crypto.randomUUID(),identity);
 for(const item of paper.questions)a=await cmd(alice,'answer',a.id,{revision:a.revision,number:item.number,choice:item.correct});a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.correct,39);assert.equal(a.result.points,699);assert.equal(a.result.unanswered,0);
 let b=await cmd(bob,'start',crypto.randomUUID(),identity);b=await cmd(bob,'answer',b.id,{revision:0,number:1,choice:'D'});
 await q("update academy_tcf_reading.attempts set deadline=now()-interval'1 second' where id=$1",[b.id]);
 b=await cmd(bob,'answer',b.id,{revision:b.revision,number:2,choice:'B'});assert.equal(b.status,'completed');assert.equal(b.result.points,3);assert.equal(b.result.unanswered,38);const saved=await cmd(bob,'read',b.id);assert.deepEqual(saved.result,b.result);assert.equal(saved.revision,b.revision);
 const blank=await cmd(bob,'start',crypto.randomUUID(),identity);const result=await cmd(bob,'submit',blank.id,{revision:0});assert.equal(result.result.points,0);assert.equal(result.result.unanswered,39);
 }finally{await db.close()}
});
test('reading denies unverified/revoked accounts, cross-account reads/writes, forged grades/identity and invalid choices',async()=>{
 const {db,q,cmd}=await fixture();try{await db.exec(migration);
 await assert.rejects(()=>cmd(null,'catalog'));await assert.rejects(()=>cmd(eve,'catalog'),/verified|access/i);
 const a=await cmd(alice,'start',crypto.randomUUID(),identity);
 for(const action of ['read','answer','submit','start'])await assert.rejects(()=>cmd(bob,action,a.id,action==='start'?identity:{}),/not found/);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{revision:0,number:1,choice:'D',score:699}),/Invalid/);
 await assert.rejects(()=>cmd(alice,'start',crypto.randomUUID(),{testId:'tcf-reading-02',version:paper.version}),/changed/);
 for(const [number,choice] of [[0,'A'],[40,'A'],[1,'E'],[1,1],[1,{}],[1,[]],['1','A'],[1.5,'A']])await assert.rejects(()=>cmd(alice,'answer',a.id,{revision:0,number,choice}),/Invalid/);
 let b=await cmd(alice,'answer',a.id,{revision:0,number:1,choice:'B'});b=await cmd(alice,'answer',a.id,{revision:b.revision,number:1,choice:null});assert.deepEqual(b.answers,{});
 await q("update public.purchase_entitlements set status='revoked' where user_id=$1",[alice]);await assert.rejects(()=>cmd(alice,'read',a.id),/access/i);
 assert.equal((await q('select count(*)::int n from academy_ai.wallets'))[0].n,0);
 }finally{await db.close()}
});
test('reading store requires session, uses authenticated RPC and never sends a grade or answer key',async()=>{
 const calls=[];const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture',expires_at:Date.now()/1000+3600,user:{id:alice}}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{id:alice}}}};
 const store=makeReadingStore(client);await store.answer(alice,4,12,'D');assert.deepEqual(calls,[{name:'academy_tcf_reading_command',args:{p_action:'answer',p_id:alice,p_payload:{revision:4,number:12,choice:'D'}}}]);
 const signedOut=makeReadingStore({auth:{getSession:async()=>({data:{session:null}})},rpc:client.rpc});await assert.rejects(()=>signedOut.catalog());assert.equal(calls.length,1);
});

test('prepared release rehearses full preservation snapshot and idempotently retains completed reading results',async()=>{
 const {db,q,cmd}=await fixture();try{
 await db.exec(`create table academy_ai.testing_grants(id text);create schema academy_tcf_writing;create table academy_tcf_writing.attempts(id text);insert into academy_tcf_writing.attempts values('old-writing');create schema academy_tcf_speaking;create table academy_tcf_speaking.attempts(id text);insert into academy_tcf_speaking.attempts values('old-speaking');create table academy_tcf_speaking.calls(id text);create schema academy_exams;create table academy_exams.attempts(id text);create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 const transaction=(pending,commit)=>execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('reading','scripts/release/tcf-reading.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.transaction("+pending+","+commit+"))"],{encoding:'utf8'});
 await db.exec(transaction('True','False'));assert.equal((await q("select count(*)::int n from pg_namespace where nspname='academy_tcf_reading'"))[0].n,0);
 await db.exec(transaction('True','True'));let a=await cmd(alice,'start',crypto.randomUUID(),identity);a=await cmd(alice,'answer',a.id,{revision:0,number:1,choice:'D'});a=await cmd(alice,'submit',a.id,{revision:a.revision});
 await db.exec(transaction('False','False'));await db.exec(transaction('False','True'));assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result);
 assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,1);
 assert.equal((await q('select id from academy_tcf_speaking.attempts'))[0].id,'old-speaking');
 }finally{await db.close()}
});
