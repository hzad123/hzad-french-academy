import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {loadPapers,protectedTables,publicationSQL} from '../scripts/release/listening-owner-review.mjs';
const migrationFile='supabase/migrations/20261114002258_tcf_listening_03_06_owner_review_v3.sql';
const papers=await loadPapers();
const source=await readFile(migrationFile,'utf8');
const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';

test('owner-review publication matches exact checked banks and rejects wrong scope/incomplete audio',()=>{
 assert.equal(source,publicationSQL(papers));
 assert.throws(()=>publicationSQL(papers.slice(0,2)),/four requested/);
 const incomplete=structuredClone(papers);incomplete[0].questions[0].audioSeconds=null;
 assert.throws(()=>publicationSQL(incomplete),/Incomplete mechanical/);
 assert(!/update\s+(?:auth|public|academy_ai)\./i.test(source));
 assert(!source.includes('create or replace function'));
});

test('publication rehearses under rollback, preserves historical attempts and makes only03–06 playable',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
   insert into auth.users values('${alice}',now()),('${bob}',now());
   insert into public.purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
  for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql',
   '20261113171848_tcf_listening_test01.sql','20261113185622_tcf_listening_next_final_submit.sql',
   '20261113194000_tcf_listening_fresh_start.sql','20261113223000_tcf_listening_twenty_registry.sql'])
   await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
  for(let n=2;n<=20;n++) {
   const p=JSON.parse(await readFile(`supabase/exams/tcf-listening-test${String(n).padStart(2,'0')}.json`,'utf8'));
   await db.query('insert into academy_tcf_listening.papers values($1,$2,$3)',[p.id,p.version,p]);
   if(n===2)await db.query('insert into academy_tcf_listening.published values($1,$2)',[p.id,p.version]);
  }
  // Snapshot-only tables need no production schema emulation: the transaction
  // never writes them. Real Auth/entitlements/listening tables are used above.
  for(const table of protectedTables) {
   const existing=(await db.query('select to_regclass($1) name',[table])).rows[0].name;
   if(!existing) {
    await db.exec(`create schema if not exists ${table.split('.')[0]};create table ${table}(fixture_data jsonb);`);
    await db.query(`insert into ${table} values($1)`,[{preserve:'historical data'}]);
   }
  }
  const cmd=async(user,action,id=null,payload={})=>{
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
   return (await db.query('select public.academy_tcf_listening_command($1,$2,$3) value',[action,id,payload])).rows[0].value;
  };
  const pilot=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
  const oldId=crypto.randomUUID();
  let old=await cmd(alice,'start',oldId,{testId:pilot.id,version:pilot.version});
  old=await cmd(alice,'answer',oldId,{number:1,choice:'B',revision:old.revision});
  const oldRow=(await db.query('select to_jsonb(a) row from academy_tcf_listening.attempts a where id=$1',[oldId])).rows[0].row;
  const initial=await cmd(alice,'catalog');
  assert.deepEqual(initial.tests.map(p=>p.id),['tcf-listening-01','tcf-listening-02']);
  const identity={testId:papers[0].id,version:papers[0].version};
  await assert.rejects(()=>cmd(alice,'start',crypto.randomUUID(),identity),/not available/);
  await db.exec('begin;'+source);
  assert.equal((await cmd(alice,'catalog')).tests.length,6);
  await db.exec('rollback;');
  assert.equal((await cmd(alice,'catalog')).tests.length,2);
  assert.equal((await db.query("select count(*) n from academy_tcf_listening.papers where version like '%-v3'")).rows[0].n,0);
  await db.exec('begin;'+source+'commit;');
  await db.exec('begin;'+source+'commit;');
  const published=await cmd(alice,'catalog');
  assert.deepEqual(published.tests.map(p=>p.id),['tcf-listening-01','tcf-listening-02','tcf-listening-03','tcf-listening-04','tcf-listening-05','tcf-listening-06']);
  assert.deepEqual((await db.query('select to_jsonb(a) row from academy_tcf_listening.attempts a where id=$1',[oldId])).rows[0].row,oldRow);
  for(const paper of papers) {
   const id=crypto.randomUUID();
   let attempt=await cmd(alice,'start',id,{testId:paper.id,version:paper.version});
   assert.equal(attempt.currentQuestion,1);
   assert.equal(Date.parse(attempt.deadline)-Date.parse(attempt.startedAt),2100000);
   for(const q of attempt.paper.questions)for(const hidden of ['correct','transcript','segments','explanation'])assert(!Object.hasOwn(q,hidden));
   await assert.rejects(()=>cmd(bob,'read',id),/not found/);
   const deadline=attempt.deadline;
   for(const q of paper.questions) {
    assert.equal(attempt.currentQuestion,q.number);
    attempt=await cmd(alice,'answer',id,{number:q.number,choice:q.correct,revision:attempt.revision});
    if(q.number<39)attempt=await cmd(alice,'next',id,{number:q.number,revision:attempt.revision});
    assert.equal(attempt.deadline,deadline);
   }
   const result=await cmd(alice,'submit',id,{revision:attempt.revision});
   assert.equal(result.status,'completed');assert.equal(result.result.correct,39);assert.equal(result.result.total,39);
   assert.deepEqual(result.result,(await cmd(alice,'read',id)).result);
  }
  assert.equal((await db.query('select count(*) n from academy_tcf_listening.papers')).rows[0].n,24);
  const changed=structuredClone(papers);changed[0].questions[0].explanation+=' Changed after publication.';
  await assert.rejects(()=>db.exec(publicationSQL(changed)),/Immutable candidate content differs/);
  assert.equal((await cmd(alice,'catalog')).tests.length,6);
 } finally {await db.close();}
});
