import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const migration=await readFile('supabase/migrations/20261113171848_tcf_listening_test01.sql','utf8');
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
test('Listening Test01 has39 original progressively longer scripts, four choices, real recordings and exact35minute schedule',async()=>{
 assert.equal(paper.id,'tcf-listening-01');assert.equal(paper.version,'tcf-listening-2026-11-v1');assert.equal(paper.questions.length,39);assert.equal(paper.seconds,2100);assert.equal(paper.questions.reduce((n,q)=>n+q.slotSeconds,0),2100);
 assert.equal(new Set(paper.questions.map(q=>q.transcript)).size,39);assert.equal(new Set(paper.questions.map(q=>q.correct)).size,4);
 const wordCount=s=>s.trim().split(/\s+/u).length;
 for(const [i,q] of paper.questions.entries()){
  assert.equal(q.number,i+1);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.match(q.correct,/^[ABCD]$/);assert(q.question.length>10);assert(q.explanation.length>40);assert(q.transcript.length>50);assert(q.segments.length>0);assert(q.segments.every(s=>['female','male'].includes(s.voice)&&s.text.trim().length>0));
  assert.equal(q.audio,`q-${String(i+1).padStart(2,'0')}.mp3`);assert(q.audioSeconds>0&&q.slotSeconds>q.audioSeconds);assert.equal(q.slotSeconds%1,0);assert((await stat('assets/tcf-listening/v1/audio/'+q.audio)).size>1000);
  if(i<4){assert.equal(q.kind,'image');assert(q.image);assert.match(await readFile('assets/tcf-listening/v1/images/'+q.image,'utf8'),/<svg/)}
  if(i>=35)assert(wordCount(q.transcript)>100,'Later recordings need extended arguments');
 }
 assert(wordCount(paper.questions[38].transcript)>wordCount(paper.questions[8].transcript)*2);
 assert.deepEqual(JSON.parse(migration.split('$paper$')[1]),paper);
});
test('listening migration rollback preserves existing settings; only authenticated owners see sanitized active output',async()=>{
 const {db,q,cmd,start}=await fixture();try{
 const snapshot=()=>q("select (select jsonb_agg(to_jsonb(t)) from academy_ai.policy t) policy,(select jsonb_agg(to_jsonb(t) order by kind) from academy_ai.activities t) activities,(select jsonb_agg(to_jsonb(t) order by id) from auth.users t) users,(select count(*) from academy_ai.wallets) wallets,(select count(*) from public.academy_learning_progress) progress");const before=await snapshot();
 await db.exec(migration.replace('commit;','rollback;'));assert.equal((await q("select count(*)::int n from pg_namespace where nspname='academy_tcf_listening'"))[0].n,0);assert.deepEqual(await snapshot(),before);await db.exec(migration);
 for(const role of ['anon','authenticated','service_role']){
  assert.equal((await q(`select has_schema_privilege('${role}','academy_tcf_listening','usage') v`))[0].v,false);
  for(const table of ['papers','attempts'])assert.equal((await q(`select has_table_privilege('${role}','academy_tcf_listening.${table}','select') v`))[0].v,false);
  assert.equal((await q(`select has_function_privilege('${role}','academy_tcf_listening.grade(jsonb,jsonb)','execute') v`))[0].v,false);
 }
 for(const role of ['anon','service_role'])assert.equal((await q(`select has_function_privilege('${role}','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') v`))[0].v,false);
 assert.equal((await q("select has_function_privilege('authenticated','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') v"))[0].v,true);
 assert((await q("select relrowsecurity v from pg_class where oid in ('academy_tcf_listening.papers'::regclass,'academy_tcf_listening.attempts'::regclass)")).every(r=>r.v));
 const catalog=await cmd(alice,'catalog');assert.equal(catalog.tests.length,1);assert.equal(catalog.tests[0].questions,39);assert.equal(catalog.tests[0].seconds,2100);assert(!JSON.stringify(catalog).includes('transcript'));
 const a=await start();assert.equal(a.currentQuestion,1);assert.equal(a.result,null);assert.equal(a.paper.questions.length,39);
 for(const q of a.paper.questions)for(const privateField of ['correct','explanation','transcript','segments'])assert(!Object.hasOwn(q,privateField));
 assert.deepEqual(await snapshot(),before);
 await assert.rejects(()=>q("update academy_tcf_listening.papers set content='{}'"),/immutable/);
 await assert.rejects(()=>q('update academy_tcf_listening.attempts set user_id=$1 where id=$2',[bob,a.id]),/immutable/);
 }finally{await db.close()}
});
test('listening clock advances only forward, rejects past/future answers and retains each window across resume',async()=>{
 const {db,q,cmd,start,at}=await fixture();try{await db.exec(migration);let a=await start();const deadline=a.deadline,started=a.startedAt;
 assert.equal(Date.parse(deadline)-Date.parse(started),2100000);assert.equal(Date.parse(a.questionStartedAt),Date.parse(started));assert.equal(Date.parse(a.questionEndsAt)-Date.parse(started),paper.questions[0].slotSeconds*1000);
 assert.equal((await start(alice)).id,a.id);assert.equal((await start(alice,a.id)).deadline,deadline);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:2,choice:'A',revision:0}),/current question/);
 a=await cmd(alice,'answer',a.id,{number:1,choice:'A',revision:0});a=await cmd(alice,'answer',a.id,{number:1,choice:null,revision:a.revision});assert.deepEqual(a.answers,{});a=await cmd(alice,'answer',a.id,{number:1,choice:paper.questions[0].correct,revision:a.revision});
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:1,choice:'B',revision:0}),/another tab/);
 await at(a.id,2);const next=await cmd(alice,'read',a.id);assert.equal(next.currentQuestion,2);assert.equal((await start(alice)).currentQuestion,2);assert.equal((await start(alice)).deadline,next.deadline);assert.deepEqual(next.answers,a.answers);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:1,choice:'C',revision:a.revision}),/current question/);
 await assert.rejects(()=>cmd(alice,'answer',a.id,{number:39,choice:'C',revision:a.revision}),/current question/);
 const changed=await cmd(alice,'answer',a.id,{number:2,choice:paper.questions[1].correct,revision:a.revision});assert.equal(changed.currentQuestion,2);assert.equal(changed.deadline,next.deadline);assert.equal(changed.questionStartedAt,next.questionStartedAt);
 await at(a.id,39);const final=await cmd(alice,'read',a.id);assert.equal(final.currentQuestion,39);assert.equal(Date.parse(final.questionEndsAt),Date.parse(final.deadline));
 }finally{await db.close()}
});
test('server marking scores39correct without invented conversions, marks wrong/blank answers and freezes completed review',async()=>{
 const {db,q,cmd,start,at}=await fixture();try{await db.exec(migration);let a=await start();
 for(const item of paper.questions){await at(a.id,item.number);a=await cmd(alice,'answer',a.id,{number:item.number,choice:item.correct,revision:a.revision})}
 a=await cmd(alice,'submit',a.id,{revision:a.revision});assert.equal(a.result.correct,39);assert.equal(a.result.total,39);assert.equal(a.result.percentage,100);assert.equal(a.result.unanswered,0);assert.equal(a.currentQuestion,null);assert.equal(a.questionStartedAt,null);assert.equal(a.questionEndsAt,null);assert.equal(a.result.rows.length,39);
 assert(a.result.rows.every((r,i)=>r.isCorrect&&r.transcript===paper.questions[i].transcript&&r.explanation===paper.questions[i].explanation));for(const field of ['tcf','nclc','points','maxPoints'])assert(!Object.hasOwn(a.result,field));
 assert.deepEqual((await cmd(alice,'submit',a.id,{revision:0})).result,a.result);assert.deepEqual((await cmd(alice,'answer',a.id,{number:1,choice:'A',revision:0})).result,a.result);
 let b=await start(bob);b=await cmd(bob,'answer',b.id,{number:1,choice:paper.questions[0].correct,revision:0});await at(b.id,2);const wrong='ABCD'.split('').find(c=>c!==paper.questions[1].correct);b=await cmd(bob,'answer',b.id,{number:2,choice:wrong,revision:b.revision});b=await cmd(bob,'submit',b.id,{revision:b.revision});assert.equal(b.result.correct,1);assert.equal(b.result.unanswered,37);assert.equal(b.result.rows[1].selected,wrong);assert.equal(b.result.rows[1].correct,paper.questions[1].correct);assert.equal(b.result.rows[1].isCorrect,false);assert.equal(b.result.rows[2].selected,null);
 const oldDeadline=b.deadline;assert.deepEqual((await cmd(bob,'read',b.id)).result,b.result);assert.equal((await cmd(bob,'read',b.id)).deadline,oldDeadline);assert.notEqual((await start(bob)).id,b.id);
 }finally{await db.close()}
});
test('expired listening attempts grade saved responses once, and late answers never change the score',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(migration);let a=await start();a=await cmd(alice,'answer',a.id,{number:1,choice:paper.questions[0].correct,revision:0});await q("update academy_tcf_listening.attempts set deadline=now()-interval'1 second' where id=$1",[a.id]);a=await cmd(alice,'answer',a.id,{number:2,choice:paper.questions[1].correct,revision:a.revision});assert.equal(a.status,'completed');assert.equal(a.result.correct,1);assert.equal(a.result.unanswered,38);assert.equal(a.currentQuestion,null);const again=await cmd(alice,'read',a.id);assert.deepEqual(again.result,a.result);assert.equal(again.revision,a.revision);
 const blank=await start();const result=await cmd(alice,'submit',blank.id,{revision:0});assert.equal(result.result.correct,0);assert.equal(result.result.unanswered,39);
 }finally{await db.close()}
});
test('listening denies unverified/revoked/expired identities, cross-account access and forged choice/score/clock inputs',async()=>{
 const {db,q,cmd,start}=await fixture();try{await db.exec(migration);
 await assert.rejects(()=>cmd(null,'catalog'));await assert.rejects(()=>cmd(eve,'catalog'),/verified|access/i);const a=await start();
 for(const action of ['read','answer','submit','start'])await assert.rejects(()=>cmd(bob,action,a.id,action==='start'?identity:{}),/not found/);
 for(const extra of [{score:39},{deadline:new Date().toISOString()},{startedAt:new Date().toISOString()},{currentQuestion:39},{userId:bob},{transcript:'fake'}])await assert.rejects(()=>cmd(alice,'answer',a.id,{number:1,choice:'A',revision:0,...extra}),/Invalid/);
 await assert.rejects(()=>cmd(alice,'start',crypto.randomUUID(),{testId:'tcf-listening-02',version:paper.version}),/changed/);
 for(const [number,choice] of [[0,'A'],[40,'A'],['1','A'],[1.5,'A'],[1,'E'],[1,1],[1,{}],[1,[]]])await assert.rejects(()=>cmd(alice,'answer',a.id,{number,choice,revision:0}),/Invalid/);
 await q("update purchase_entitlements set access_ends_at=now()-interval'1 second' where user_id=$1",[alice]);await assert.rejects(()=>cmd(alice,'read',a.id),/access/i);
 await q("update purchase_entitlements set access_ends_at=null,status='revoked' where user_id=$1",[alice]);await assert.rejects(()=>cmd(alice,'read',a.id),/access/i);assert.equal((await q('select count(*)::int n from academy_ai.wallets'))[0].n,0);
 }finally{await db.close()}
});
test('listening production release rehearses before commit and preserves all reading and saved listening data on rerun',async()=>{
 const {db,q,cmd,start}=await fixture();try{
 await db.exec(`create table academy_ai.testing_grants(id text);create schema academy_tcf_writing;create table academy_tcf_writing.attempts(id text);insert into academy_tcf_writing.attempts values('old-writing');create schema academy_tcf_speaking;create table academy_tcf_speaking.attempts(id text);create table academy_tcf_speaking.calls(id text);create schema academy_exams;create table academy_exams.attempts(id text);create schema academy_tcf_reading;create table academy_tcf_reading.papers(id text,content jsonb);insert into academy_tcf_reading.papers values('saved-reading','{"original":true}');create table academy_tcf_reading.attempts(id text);insert into academy_tcf_reading.attempts values('saved-attempt');create table academy_tcf_reading.published_papers(id text);insert into academy_tcf_reading.published_papers values('saved-publication');create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 const transaction=(pending,commit)=>execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('listening','scripts/release/tcf-listening.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.transaction("+pending+","+commit+"))"],{encoding:'utf8',maxBuffer:4*1024*1024});
 await db.exec(transaction('True','False'));assert.equal((await q("select count(*)::int n from pg_namespace where nspname='academy_tcf_listening'"))[0].n,0);
 await db.exec(transaction('True','True'));let a=await start();a=await cmd(alice,'answer',a.id,{number:1,choice:paper.questions[0].correct,revision:0});a=await cmd(alice,'submit',a.id,{revision:a.revision});const active=await start(bob);
 await db.exec(transaction('False','False'));await db.exec(transaction('False','True'));assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result);assert.equal((await cmd(bob,'read',active.id)).deadline,active.deadline);
 assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,1);assert.equal((await q('select id from academy_tcf_reading.attempts'))[0].id,'saved-attempt');assert.deepEqual((await q('select content from academy_tcf_reading.papers'))[0].content,{original:true});
 }finally{await db.close()}
});
