import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const VERSION='tcf-reading-2026-11-close-reading-v4';
const PRIOR='tcf-reading-2026-11-reference-v3';
const LETTERS='ABCD';
const migrations=[
 '20261029_academy_learning.sql',
 '20261105001000_ai_learning.sql',
 '20261112204911_tcf_reading_test01.sql',
 '20261112212313_tcf_reading_twenty_tests.sql',
 '20261112222727_reading_reference_length.sql',
 '20261117225800_tcf_reading_two_editorial.sql',
 '20261118210000_tcf_reading_01_06_advanced_v5.sql',
 '20261118210025_tcf_reading_01_06_close_reading_v6.sql',
];
const bankSQL=await readFile('supabase/migrations/20261119180000_tcf_reading_07_20_close_reading_v4.sql','utf8');
const papers=await Promise.all(Array.from({length:14},(_,i)=>i+7).map(async n=>
 JSON.parse(await readFile('tests/fixtures/tcf-reading-v4/tcf-reading-'+String(n).padStart(2,'0')+'.json','utf8'))));
const q=async(db,sql,params=[]) => (await db.query(sql,params)).rows;

test('14 new TCF Reading banks: real authenticated RPC start, answer, resume and grade; historical versions preserved', async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql as
     $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,
     access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
   insert into auth.users values('${alice}',now()),('${bob}',now());
   insert into purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
  for(const file of migrations)await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  const cmd=async(user,action,id=null,payload={})=>{
   await q(db,"select set_config('request.jwt.claim.sub',$1,false)",[user]);
   await db.exec('set role authenticated');
   try{return (await q(db,'select public.academy_tcf_reading_command($1,$2,$3) v',[action,id,payload]))[0].v}
   finally{await db.exec('reset role')}
  };
  const before=(await cmd(alice,'catalog')).tests;
  assert.equal(before.length,20);
  assert.equal(before.filter(t=>Number(t.id.slice(-2))>=7 && t.version===PRIOR).length,14);
  const priorRows=await q(db,'select to_jsonb(t)::text row from academy_tcf_reading.papers t where version<>$1 order by id,version',[VERSION]);
  let preserved=await cmd(alice,'start',randomUUID(),{testId:papers[0].id,version:PRIOR});
  preserved=await cmd(alice,'answer',preserved.id,{revision:preserved.revision,number:25,choice:'C'});
  const saved={id:preserved.id,version:preserved.version,deadline:preserved.deadline,answers:preserved.answers,revision:preserved.revision};
  await db.exec(bankSQL.replace(/commit;\s*$/,'rollback;'));
  assert.deepEqual((await cmd(alice,'catalog')).tests,before,'rollback must not publish new versions');
  await db.exec(bankSQL);
  assert.deepEqual(await q(db,'select to_jsonb(t)::text row from academy_tcf_reading.papers t where version<>$1 order by id,version',[VERSION]),priorRows,'immutable historical banks remain intact');
  const catalog=(await cmd(alice,'catalog')).tests;
  assert.equal(catalog.length,20);
  for(const t of catalog)assert.equal(t.version,Number(t.id.slice(-2))<=6?before.find(x=>x.id===t.id).version:VERSION);
  const old=await cmd(alice,'read',saved.id);
  assert.equal(old.version,saved.version);
  assert.equal(old.deadline,saved.deadline);
  assert.deepEqual(old.answers,saved.answers);
  assert.equal(old.revision,saved.revision);
  for(const paper of papers){
   let a=await cmd(alice,'start',randomUUID(),{testId:paper.id,version:paper.version});
   assert.equal(a.version,VERSION);
   assert.equal(a.paper.questions.length,39);
   assert.deepEqual(a.paper.questions,paper.questions.map(({correct,explanation,...item})=>item),'do not expose answer keys on active paper');
   assert.equal(Date.parse(a.deadline)-Date.parse(a.startedAt),3600000);
   for(const item of paper.questions){
    a=await cmd(alice,'answer',a.id,{revision:a.revision,number:item.number,choice:item.correct});
   }
   const resumed=await cmd(alice,'read',a.id);
   assert.deepEqual(resumed.answers,a.answers);
   assert.equal(resumed.deadline,a.deadline);
   a=await cmd(alice,'submit',a.id,{revision:a.revision});
   assert.equal(a.result.correct,39,paper.id);
   assert.equal(a.result.points,699,paper.id);
   assert.equal(a.result.unanswered,0,paper.id);
   assert.equal(a.result.rows.length,39);
   for(const item of paper.questions){
    const result=a.result.rows.find(row=>row.number===item.number);
    assert.equal(result.correct,item.correct,paper.id+' Q'+item.number+' correct letter');
    assert.equal(result.explanation,item.explanation,paper.id+' Q'+item.number+' final rationale');
    assert.equal(result.isCorrect,true);
   }
   assert.deepEqual((await cmd(alice,'read',a.id)).result,a.result,'submitted results must reopen');

   // Deliberately wrong answers for every advanced question; verify server marks none correct.
   let b=await cmd(bob,'start',randomUUID(),{testId:paper.id,version:VERSION});
   for(const item of paper.questions.slice(24)){
    const wrong=[...LETTERS].find(letter=>letter!==item.correct);
    b=await cmd(bob,'answer',b.id,{revision:b.revision,number:item.number,choice:wrong});
   }
   b=await cmd(bob,'submit',b.id,{revision:b.revision});
   assert.equal(b.result.correct,0,paper.id+' wrong-answer run');
   assert.equal(b.result.unanswered,24,paper.id);
   assert.equal(b.result.rows.length,39);
   for(const item of paper.questions.slice(24)){
    const result=b.result.rows.find(row=>row.number===item.number);
    assert.equal(result.isCorrect,false,paper.id+' Q'+item.number);
    assert.equal(result.correct,item.correct);
    assert.equal(result.explanation,item.explanation);
   }
  }
  await assert.rejects(()=>db.exec(bankSQL),/prior pointers|immutable/i,'guard rejects reapplying immutable version');
  await db.exec('rollback;');
  const oldAfter=await cmd(alice,'read',saved.id);
  assert.equal(oldAfter.version,PRIOR);
  assert.deepEqual(oldAfter.answers,saved.answers);
 }finally{await db.close()}
});
