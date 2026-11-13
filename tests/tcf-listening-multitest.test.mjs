import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const root='supabase/migrations/';
const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const pilot=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
test('published-only listening catalog and cross-test starts preserve Test01 data, 35m and private answer keys',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
  insert into auth.users values('${alice}',now()),('${bob}',now());
  insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
  for(const m of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261113171848_tcf_listening_test01.sql','20261113185622_tcf_listening_next_final_submit.sql','20261113194000_tcf_listening_fresh_start.sql','20261113223000_tcf_listening_twenty_registry.sql'])
   await db.exec(await readFile(root+m,'utf8'));
  const query=async (sql,params=[]) => (await db.query(sql,params)).rows;
  const cmd=async(user,action,id=null,payload={})=>{
   await query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
   return (await query("select public.academy_tcf_listening_command($1,$2,$3) v",[action,id,payload]))[0].v;
  };
  let catalog=await cmd(alice,'catalog');
  assert.equal(catalog.tests.length,1);
  assert.equal(catalog.tests[0].id,'tcf-listening-01');
  assert.equal(catalog.tests[0].questions,39);
  const v2={...pilot,id:'tcf-listening-02',version:'tcf-listening-2026-11-test02-v1',title:'TCF Listening · Test 02'};
  await query('insert into academy_tcf_listening.papers(id,version,content) values($1,$2,$3)',[v2.id,v2.version,v2]);
  catalog=await cmd(alice,'catalog');assert.equal(catalog.tests.length,1,'Unpublished test must not appear');
  const identity={testId:v2.id,version:v2.version};
  await assert.rejects(()=>cmd(alice,'restart',crypto.randomUUID(),identity),/not available/);
  await query('insert into academy_tcf_listening.published(test_id,version) values($1,$2)',[v2.id,v2.version]);
  catalog=await cmd(alice,'catalog');
  assert.deepEqual(catalog.tests.map(t=>t.id),['tcf-listening-01','tcf-listening-02']);
  const id=crypto.randomUUID();
  let attempt=await cmd(alice,'restart',id,identity);
  assert.equal(attempt.testId,v2.id);
  assert.equal(attempt.currentQuestion,1);
  assert.equal(attempt.paper.questions.length,39);
  assert.equal(Date.parse(attempt.deadline)-Date.parse(attempt.startedAt),2100000);
  for(const q of attempt.paper.questions)for(const key of ['correct','transcript','segments','explanation'])assert(!Object.hasOwn(q,key));
  await assert.rejects(()=>cmd(bob,'read',id),/not found/);
  attempt=await cmd(alice,'answer',id,{number:1,choice:'B',revision:0});
  assert.equal(attempt.answers['1'],'B');
  const next=await cmd(alice,'next',id,{number:1,revision:attempt.revision});
  assert.equal(next.currentQuestion,2);
  const oldId=crypto.randomUUID();
  const original=await cmd(alice,'restart',oldId,{testId:pilot.id,version:pilot.version});
  assert.equal(original.testId,pilot.id);
  assert.equal((await cmd(alice,'read',id)).currentQuestion,2,'Other test attempt must stay active');
  assert.equal((await cmd(alice,'catalog')).history.length,2);
  const security=await query("select has_table_privilege('authenticated','academy_tcf_listening.published','select') as student_can_read, has_table_privilege('anon','academy_tcf_listening.published','select') as public_can_read");
  assert.equal(security[0].student_can_read,false);assert.equal(security[0].public_can_read,false);
 }finally{await db.close()}
});
