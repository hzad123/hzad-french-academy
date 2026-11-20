import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const old=JSON.parse(await readFile('supabase/exams/tef-listening-test01.json','utf8'));
const latest=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v2.json','utf8'));
const names=(await readdir('supabase/migrations')).filter(x=>x.endsWith('_tef_listening_01_grouped_v2.sql'));
assert.equal(names.length,1,'Exactly one staged v2 migration required');
const v2sql=await readFile('supabase/migrations/'+names[0],'utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261119234824_tef_listening_test01.sql']){
  await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 }
 const q=async(sql,p=[])=> (await db.query(sql,p)).rows;
 const command=async(user,action,id=null,payload={})=>{
  await q("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
  return (await q('select public.academy_tef_listening_command($1,$2,$3) v',[action,id,payload]))[0].v;
 };
 return {db,q,command};
}
test('TEF v2 stores new immutable paper, keeps v1 students and exposes only latest catalogue',async()=>{
 const {db,q,command}=await fixture();try{
  const oldAttempt=crypto.randomUUID();
  const v1=await command(alice,'start',oldAttempt,{testId:old.id,version:old.version});
  assert.equal(v1.version,old.version);
  await db.exec(v2sql);
  assert.equal((await q("select count(*)::int c from academy_tef_listening.papers"))[0].c,2);
  assert.equal((await q("select count(*)::int c from academy_tef_listening.attempts"))[0].c,1);
  assert.equal((await command(alice,'read',oldAttempt)).version,old.version);
  const catalog=await command(bob,'catalog');
  assert.equal(catalog.tests.length,1);
  assert.equal(catalog.tests[0].version,latest.version);
  const v2=await command(bob,'start',crypto.randomUUID(),{testId:latest.id,version:latest.version});
  assert.equal(v2.paper.questions.length,40);
  assert.equal(v2.paper.questions[22].groupEnd,24);
  assert.equal(v2.paper.questions[23].audio,v2.paper.questions[22].audio);
  assert(!JSON.stringify(v2.paper).includes('"correct"'));
  await assert.rejects(()=>command(bob,'start',crypto.randomUUID(),{testId:old.id,version:old.version}),/changed/i);
 }finally{await db.close()}
});
test('TEF shared 23/24 interview accepts both answers during one recording, then advances to 25',async()=>{
 const {db,q,command}=await fixture();try{
  await db.exec(v2sql);
  let a=await command(alice,'start',crypto.randomUUID(),{testId:latest.id,version:latest.version});
  const originalDeadline=a.deadline;
  // Directly position the clock within Q23's real slot without changing the
  // immutable 40-minute test or its answer revision.
  const elapsed=latest.questions.slice(0,22).reduce((s,x)=>s+x.slotSeconds,0)+1;
  await q("update academy_tef_listening.attempts set started_at=now()-$2*interval '1 second',deadline=now()+(2400-$2)*interval '1 second' where id=$1",[a.id,elapsed]);
  a=await command(alice,'read',a.id);
  assert.equal(a.currentQuestion,23);
  assert.equal(a.paper.questions[23].groupStart,23);
  a=await command(alice,'answer',a.id,{revision:a.revision,number:24,choice:latest.questions[23].correct});
  assert.equal(a.currentQuestion,23);assert.equal(a.answers[24],latest.questions[23].correct);
  a=await command(alice,'answer',a.id,{revision:a.revision,number:23,choice:latest.questions[22].correct});
  assert.equal(a.answers[23],latest.questions[22].correct);
  await assert.rejects(()=>command(alice,'answer',a.id,{revision:a.revision,number:25,choice:'A'}),/ended/i);
  a=await command(alice,'next',a.id,{revision:a.revision,number:23});
  assert.equal(a.currentQuestion,25);
  assert.equal(a.answers[23],latest.questions[22].correct);
  assert.equal(a.answers[24],latest.questions[23].correct);
  assert.equal(a.paper.questions[22].audio,a.paper.questions[23].audio);
  assert.equal((await q("select count(*)::int c from academy_tef_listening.papers"))[0].c,2);
 }finally{await db.close()}
});
