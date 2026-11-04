import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
const rpc=async(sql,args=[])=> (await query(sql,args))[0].value;
async function asUser(id,role='authenticated'){
 await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);
}
const snapshot=(offset=0)=>rpc('select public.academy_tracker_snapshot($1) as value',[offset]);
const check=(id,choice)=>rpc("select public.academy_check_answer('a0-01',$1,$2) as value",[id,choice]);
const revise=(id,choice)=>rpc("select public.academy_tracker_revise('a0-01',$1,$2) as value",[id,choice]);
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid references auth.users(id),status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const name of ['20261029_academy_learning.sql','20261029_secure_quiz_delivery.sql','20261029_instant_quiz_feedback.sql','20261104_french_placement.sql','20261104_student_progress_tracker.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 const quiz=['g1','g2','g3','v1','r1','l1','other'].map(id=>({id,type:'choice',prompt:'Original '+id,options:['Incorrect','Correct'],answer:1,explanation:'Original explanation '+id}));
 const content={assessment_domains:[...['g1','g2','g3'].map(questionId=>({questionId,domain:'grammar'})),{questionId:'v1',domain:'vocabulary'},{questionId:'r1',domain:'reading'}],listening_checks:[{questionId:'l1',french:'Bonjour'}]};
 await query("insert into public.academy_units(id,level,position,title,quiz,content,published) values('a0-01','A0',1,'Test lesson',$1,$2,true)",[quiz,content]);
});
after(async()=>db?.close());
test('private tracker RLS/grants reject anonymous and cross-account access',async()=>{
 await asUser(null,'anon');await assert.rejects(snapshot,/permission denied/);
 await asUser(null);await assert.rejects(snapshot,/Verified email/);
 await asUser(alice);await assert.rejects(()=>query('select * from academy_tracker.evidence'),/permission denied/);
 await assert.rejects(()=>query("insert into academy_tracker.preferences(user_id,minutes) values($1,30)",[bob]),/permission denied/);
 await assert.rejects(()=>rpc("select academy_tracker.grade_answer('a0-01','g1',1) as value"),/permission denied/);
 const s=await snapshot();assert.equal(s.notebook.length,0);assert.equal(s.units.length,1);assert.equal(s.placement,null);
 await assert.rejects(()=>revise('g1',1),/Notebook item not found/);
});
test('ordinary server grading automatically saves wrong answers and skill evidence without completing a lesson',async()=>{
 await asUser(alice);const f=await check('g1',0);assert.equal(f.correct,false);assert.equal(f.answer,'Correct');
 await check('g1',0); // immediate duplicate must not inflate missed count
 for(const id of ['g2','g3','v1','r1','l1','other'])await check(id,1);
 const s=await snapshot();assert.equal(s.notebook.length,1);assert.equal(s.notebookTotal,1);
 assert.equal(s.notebook[0].wrongCount,1);assert.equal(s.notebook[0].chosenAnswer,'Incorrect');
 assert.equal(s.units[0].completed,false);assert.equal(s.units[0].attempts,0);
 assert.deepEqual(s.skills.find(x=>x.skill==='grammar'),{skill:'grammar',total:3,correct:2});
 assert.equal(s.skills.find(x=>x.skill==='listening').total,1);assert.equal(s.skills.find(x=>x.skill==='general').total,1);
 assert.ok(!JSON.stringify(s).includes('Original g2')); // no keys/questions for unmissed items
 await asUser(bob);assert.equal((await snapshot()).notebook.length,0);assert.equal((await snapshot()).skills.length,0);
 await assert.rejects(()=>revise('g1',1),/Notebook item not found/);
});
test('correct revisions preserve mistakes, schedule spaced review, and cannot manufacture completion',async()=>{
 await asUser(alice);const result=await revise('g1',1);
 assert.equal(result.feedback.correct,true);const n=result.snapshot.notebook[0];
 assert.equal(n.lastCorrect,true);assert.equal(n.chosenAnswer,'Incorrect');assert.equal(n.wrongCount,1);
 assert.ok(Date.parse(n.dueAt)>Date.parse(result.snapshot.generatedAt));assert.equal(result.snapshot.units[0].completed,false);
 const retry=await revise('g1',1);assert.equal(retry.snapshot.notebook[0].dueAt,n.dueAt);
 const wrong=await revise('g1',0);assert.equal(wrong.feedback.correct,false);assert.equal(wrong.snapshot.notebook[0].wrongCount,2);
 await assert.rejects(()=>revise('g1',9),/Invalid answer/);await assert.rejects(()=>revise('g1',null),/Invalid answer/);
 await assert.rejects(()=>snapshot(-1),/Invalid notebook offset/);assert.equal((await snapshot(200)).notebook.length,0);
});
test('preferences and placement are server-owned, latest complete placement ignores partial attempts',async()=>{
 await asUser(alice);
 const s=await rpc("select public.academy_tracker_preferences(30,'B1') as value");assert.deepEqual(s.preferences,{minutes:30,level:'B1'});
 await assert.rejects(()=>rpc("select public.academy_tracker_preferences(999,'C2') as value"),/Invalid study preference/);
 await assert.rejects(()=>rpc("select public.academy_tracker_preferences(10,'ADMIN') as value"),/Invalid study preference/);
 await asUser(bob);assert.equal((await snapshot()).preferences.minutes,20);
 await db.exec('reset role');
 await query("insert into academy_placement.attempts(user_id,status,completed_at,result) values($1,'completed',now(),$2)",[alice,{recommendedLevel:'A2',skills:{reading:{correct:1,total:2}},provisional:false}]);
 await query("insert into academy_placement.attempts(user_id,status) values($1,'active')",[alice]);
 await asUser(alice);assert.equal((await snapshot()).placement.recommendedLevel,'A2');
 await asUser(bob);assert.equal((await snapshot()).placement,null);
});
test('access is rechecked for every read/write; expiry, revocation and unverified identities fail closed',async()=>{
 for(const change of ["update auth.users set email_confirmed_at=null", "update public.purchase_entitlements set verified_at=null", "update public.purchase_entitlements set access_ends_at=now()-interval '1 day'", "update public.purchase_entitlements set status='revoked'"]){
  await db.exec('reset role;begin;'+change);await asUser(alice);
  for(const operation of [snapshot,()=>check('g1',0),()=>revise('g1',1),()=>rpc("select public.academy_tracker_preferences(10,null) as value")]){
   await db.exec('savepoint denied');await assert.rejects(operation,/Verified email/);await db.exec('rollback to savepoint denied');
  }
  await db.exec('rollback;reset role');
 }
});
test('rollback restores original quiz grader and preserves saved tracker history',async()=>{
 await db.exec('reset role');const before=(await query('select count(*)::int as n from academy_tracker.evidence'))[0].n;
 await db.exec(await readFile('supabase/rollbacks/20261104_disable_progress_tracker.sql','utf8'));
 await asUser(alice);assert.equal((await check('g1',1)).correct,true);await assert.rejects(snapshot,/permission denied/);
 await db.exec('reset role');assert.equal((await query('select count(*)::int as n from academy_tracker.evidence'))[0].n,before);
});
