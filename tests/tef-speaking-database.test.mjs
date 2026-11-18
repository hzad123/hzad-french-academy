import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const userA='11111111-1111-4111-8111-111111111111',userB='22222222-2222-4222-8222-222222222222';
const migrations=['20261029_academy_learning.sql','20261105001000_ai_learning.sql',
 '20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql',
 '20261112002400_tcf_speaking_test01.sql','20261117192000_tef_writing.sql',
 '20261117234000_tef_speaking_twenty_tests.sql'];
test('TEF Speaking private migration preserves existing users, TCF attempts and wallets; phases, idempotence and refunds',async()=>{
 const db=new PGlite();
 const q=async(sql,params=[])=> (await db.query(sql,params)).rows;
 const cmd=async(user,kind,id,params={})=>(await q('select public.academy_tef_speaking_command($1,$2,$3,$4) as result',[user,kind,id,params]))[0].result;
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;");
  await db.exec("create table auth.users(id uuid primary key,email_confirmed_at timestamptz);");
  await db.exec("create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");
  await db.exec("create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);");
  await db.exec("create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit int,allowed_mime_types text[]);");
  await db.exec("insert into auth.users values('"+userA+"',now()),('"+userB+"',now());");
  await db.exec("insert into purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;");
  for(const filename of migrations.slice(0,-1))await db.exec(await readFile('supabase/migrations/'+filename,'utf8'));
  const before=await q("select kind,enabled,credits,model,ceiling_microcad from academy_ai.activities order by kind");
  const a=crypto.randomUUID();
  const tcfCmd=async(action,p={})=>(await q("select public.academy_tcf_speaking_command($1,$2,$3,$4) r",[userA,action,a,p]))[0].r;
  await tcfCmd('start');const tcfBefore=await q('select * from academy_tcf_speaking.attempts where id=$1',[a]);
  await db.exec(await readFile('supabase/migrations/20261117234000_tef_speaking_twenty_tests.sql','utf8'));
  const tcfAfter=await q('select * from academy_tcf_speaking.attempts where id=$1',[a]);
  assert.deepEqual(tcfAfter,tcfBefore);
  const after=await q("select kind,enabled,credits,model,ceiling_microcad from academy_ai.activities where kind not like 'tef-speaking-%' order by kind");
  assert.deepEqual(after,before);
  assert.equal((await q("select count(*)::int n from academy_ai.activities where kind like 'tef-speaking-%'"))[0].n,2);
  assert.equal((await q("select public from storage.buckets where id='academy-tef-speaking'"))[0].public,false);
  assert.equal((await q("select has_function_privilege('anon','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','EXECUTE') as v"))[0].v,false);
  assert.equal((await q("select has_function_privilege('authenticated','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','EXECUTE') as v"))[0].v,false);
  assert.equal((await q("select has_function_privilege('service_role','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','EXECUTE') as v"))[0].v,true);
  assert.equal((await q("select relrowsecurity from pg_class where oid='academy_tef_speaking.attempts'::regclass"))[0].relrowsecurity,true);
  const id=crypto.randomUUID(),identity={testId:'tef-speaking-04',version:'tef-speaking-2026-11-v1'};
  let attempt=await cmd(userA,'start',id,identity);
  assert.equal(attempt.phase,0);assert.equal(attempt.test_id,identity.testId);
  assert.equal((await cmd(userA,'start',id,identity)).id,id);
  await assert.rejects(()=>cmd(userB,'read',id),/not found/i);
  await assert.rejects(()=>cmd(userA,'start',id,{...identity,testId:'tef-speaking-07'}),/another paper/);
  await assert.rejects(()=>cmd(userA,'advance',id),/cinq minutes/);
  await q("update academy_tef_speaking.attempts set deadline=now()-interval '1 second' where id=$1",[id]);
  attempt=await cmd(userA,'advance',id);assert.equal(attempt.phase,1);
  await assert.rejects(()=>cmd(userA,'advance',id),/cannot be advanced/);
  attempt=await cmd(userA,'begin_b',id);assert.equal(attempt.phase,2);
  await assert.rejects(()=>cmd(userA,'advance',id),/dix minutes/);
  // Reserve one turn, then fail it and verify exactly-once refund & call reconciliation.
  await db.exec("update academy_ai.policy set enabled=true,included_credits=500;");
  await db.exec("update academy_ai.activities set enabled=true,credits=10,model='gpt-audio-mini',ceiling_microcad=200000,max_output_tokens=1200 where kind='tef-speaking-turn';");
  const call=crypto.randomUUID(),hash='f'.repeat(64);
  await cmd(userA,'lock',id,{kind:'turn',callId:call,hash});
  await assert.rejects(()=>cmd(userA,'advance',id),/pending/i);
  const reserve=await q("select public.academy_ai_reserve($1,$2,'tef-speaking-turn','B2',$3,10,null,null) r",[userA,call,hash]);
  assert.equal(reserve[0].r.status,'reserved');
  await q("select public.academy_ai_claim($1,$2)",[userA,call]);
  await q("select public.academy_ai_fail($1,$2)",[userA,call]);
  attempt=await cmd(userA,'read',id);
  assert.equal(attempt.pending,null);
  const ledger=await q("select event,credits_delta from academy_ai.ledger where request_id=$1 order by id",[call]);
  assert(ledger.some(x=>x.event==='reserve')&&ledger.some(x=>x.event==='refund'));
  assert.equal(attempt.calls[0].status,'failed');
  const otherCall=crypto.randomUUID();
  await cmd(userA,'lock',id,{kind:'turn',callId:otherCall,hash:'a'.repeat(64)});
  await assert.rejects(()=>cmd(userA,'lock',id,{kind:'turn',callId:otherCall,hash:'b'.repeat(64)}),/already used/i);
  await cmd(userA,'unlock',id,{callId:otherCall});
  await q("update academy_tef_speaking.attempts set deadline=now()-interval '1 second' where id=$1",[id]);
  attempt=await cmd(userA,'advance',id);assert.equal(attempt.phase,3);
  assert.equal((await cmd(userA,'list')).length,1);
  assert.deepEqual(await q('select * from academy_tcf_speaking.attempts where id=$1',[a]),tcfBefore);
 }finally{await db.close()}
});
