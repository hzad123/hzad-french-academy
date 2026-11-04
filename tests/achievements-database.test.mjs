import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
let db,bank;
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
const rpc=async(sql,args=[])=> (await query(sql,args))[0].value;
async function user(id,role='authenticated'){
 await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);
}
const rewards=()=>rpc("select public.academy_rewards_state('America/Winnipeg') as value");
const exam=level=>rpc('select public.academy_final_start($1,false) as value',[level]);
const answer=(a,id,index,text=false)=>rpc('select public.academy_final_answer($1,$2,$3,$4) as value',[a,id,index,text]);
const verify=(id,name)=>rpc('select public.academy_certificate_verify($1,$2) as value',[id,name]);
before(async()=>{
 db=new PGlite();bank=JSON.parse(await readFile('supabase/assessments/finals-v1.json','utf8'));
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid references auth.users(id),status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users(id,email_confirmed_at) values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const name of ['20261029_academy_learning.sql','20261029_secure_quiz_delivery.sql','20261029_instant_quiz_feedback.sql','20261104_french_placement.sql','20261104_student_progress_tracker.sql','20261104_achievements_certificates.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 // Production metadata was inspected read-only: IDs are level-prefixed and
 // padded to two digits for A0, three for A1–C2. Match that live constraint here.
 await db.exec("alter table public.academy_units drop constraint academy_units_id_check; alter table public.academy_units add constraint academy_units_id_check check(id=lower(level)||'-'||lpad(position::text,case when level='A0' then 2 else 3 end,'0'))");
 for(const level of Object.keys(bank.levels)){
  const id=level.toLowerCase()+'-'+(level==='A0'?'01':'001');
  await query('insert into public.academy_units(id,level,position,title,quiz,published) values($1,$2,1,$3,$4,true)',[id,level,level+' fixture',[{id:'q1',type:'choice',prompt:'Choose',options:['No','Yes'],answer:1,explanation:'Yes is correct.'}]]);
 }

});
after(async()=>db?.close());
test('final bank is complete, balanced, internally valid and synchronized with SQL',async()=>{
 assert.equal(Object.keys(bank.levels).length,7);
 for(const items of Object.values(bank.levels)){
  assert.equal(items.length,12);
  for(const skill of ['grammar','vocabulary','reading','listening'])assert.equal(items.filter(q=>q[0]===skill).length,3);
  for(const [skill,prompt,options,key,audio] of items){assert.ok(prompt.length>10);assert.equal(new Set(options).size,4);assert.ok(key>=0&&key<=3);if(skill==='listening')assert.ok(typeof audio==='string'&&audio.trim().length>=10)}
 }
 execFileSync(process.execPath,['scripts/generate-final-seed.mjs','--check']);
 assert.equal((await query('select count(*)::int as n from academy_achievements.questions'))[0].n,84);
});
test('XP, badges and streaks derive from authoritative saved activity and cannot be forged',async()=>{
 await user(alice);let r=await rewards();assert.equal(r.xp,0);assert.equal(r.streak,0);
 await assert.rejects(()=>query("insert into academy_achievements.xp(user_id,event_key,kind,points) values($1,'fake','lesson',200)",[alice]),/permission denied/);
 await assert.rejects(()=>rpc('select academy_achievements.award($1,$2,$3,200,true) as value',[alice,'fake','lesson']),/permission denied/);
 await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":1}') as value");r=await rewards();assert.equal(r.xp,50);assert.equal(r.streak,1);assert.equal(r.studiedToday,true);assert.ok(r.badges.find(b=>b.code==='first-lesson').earned);
 await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":1}') as value");assert.equal((await rewards()).xp,50);
 await rpc("select public.academy_check_answer('a0-01','q1',0) as value");await rpc("select public.academy_tracker_revise('a0-01','q1',1) as value");assert.equal((await rewards()).xp,60);
 await rpc("select public.academy_tracker_revise('a0-01','q1',1) as value");assert.equal((await rewards()).xp,60);
 await assert.rejects(()=>rpc("select public.academy_rewards_preferences('America/Winnipeg','Alice','Learning champion') as value"),/not been unlocked/);
 await user(bob);assert.equal((await rewards()).xp,0);
});
test('streak calendar handles missing days, longest streaks and time-zone changes',async()=>{
 await db.exec('reset role');
 await query("insert into academy_achievements.days(user_id,study_date) values($1,(now() at time zone 'America/Winnipeg')::date-1),($1,(now() at time zone 'America/Winnipeg')::date-2),($1,(now() at time zone 'America/Winnipeg')::date-4) on conflict do nothing",[alice]);
 await user(alice);let r=await rewards();assert.equal(r.streak,3);assert.equal(r.longestStreak,3);assert.ok(r.badges.find(b=>b.code==='three-day-streak').earned);
 await assert.rejects(()=>rpc("select public.academy_rewards_preferences('Asia/Tokyo','Alice','French learner') as value"),/30 days/);
 await db.exec('reset role');await query("update academy_achievements.days set study_date=study_date-10 where user_id=$1",[alice]);
 // Keep the latest progress update old so snapshot recovery does not add today.
 await query("select set_config('request.jwt.claim.sub','',false)");await query("update public.academy_learning_progress set updated_at=now()-interval '20 days' where user_id=$1",[alice]);
 await user(alice);r=await rewards();assert.equal(r.streak,0);assert.equal(r.longestStreak,3);
});
test('course prerequisites, certificate names and assessment eligibility are checked on server',async()=>{
 await user(bob);await rewards();await assert.rejects(()=>exam('A0'),/certificate name/);
 await rpc("select public.academy_rewards_preferences('America/Winnipeg','Bob Student','French learner') as value");
 await assert.rejects(()=>exam('A0'),/Complete every published lesson/);
 await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":0}') as value");await assert.rejects(()=>exam('A0'),/Complete every published lesson/);
 await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":1}') as value");
 const a=await exam('A0');assert.equal(a.answered,0);assert.equal(a.total,12);assert.ok(!('answer' in a.question));
 assert.equal((await exam('A0')).id,a.id);
 await assert.rejects(()=>answer(a.id,'final-v1-A0-12',0),/not eligible/);
 await assert.rejects(()=>answer(a.id,a.question.id,99),/Invalid assessment answer/);
 const saved=await answer(a.id,a.question.id,bank.levels.A0[0][3]);assert.equal(saved.answered,1);assert.equal(saved.result,null);
 assert.equal((await answer(a.id,a.question.id,bank.levels.A0[0][3])).answered,1);
 await assert.rejects(()=>answer(a.id,a.question.id,(bank.levels.A0[0][3]+1)%4),/already been recorded/);
 await user(alice);await assert.rejects(()=>rpc('select public.academy_final_state($1) as value',[a.id]),/not found/);
});
test('an optional reward failure never blocks normal quiz progress; XP backfill recovers safely',async()=>{
 const carol='44444444-4444-4444-8444-444444444444';await db.exec('reset role');
 await query('insert into auth.users(id,email_confirmed_at) values($1,now())',[carol]);
 await query("insert into public.purchase_entitlements values($1,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY')",[carol]);
 await user(carol);await rewards();await db.exec('reset role');
 await query("update academy_achievements.profiles set timezone='Invalid/Zone' where user_id=$1",[carol]);
 await user(carol);assert.equal((await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":1}') as value")).percent,100);
 assert.equal((await rpc('select public.academy_tracker_snapshot() as value')).units.find(u=>u.id==='a0-01').completed,true);
 await db.exec('reset role');await query("update academy_achievements.profiles set timezone='Etc/UTC' where user_id=$1",[carol]);
 await user(carol);assert.equal((await rewards()).xp,50);assert.equal((await rewards()).xp,50);
});
test('passing all assessment items issues one verifiable certificate without resetting progress',async()=>{
 await user(bob);let a=await exam('A0');
 for(let i=1;i<12;i++)a=await answer(a.id,`final-v1-A0-${i+1}`,bank.levels.A0[i][3]);
 assert.equal(a.status,'completed');assert.equal(a.result.passed,true);assert.equal(a.result.percent,100);
 const id=a.result.certificateId,c=await rpc('select public.academy_certificate_get($1) as value',[id]);
 assert.equal(c.holder,'Bob Student');assert.equal(c.lessonCount,1);assert.equal(c.revoked,false);
 assert.equal((await verify(id,'Bob Student')).valid,true);assert.equal((await verify(id,'Wrong Name')).valid,false);
 const before=(await rewards()).xp;
 assert.equal((await answer(a.id,'final-v1-A0-12',bank.levels.A0[11][3])).result.certificateId,id);assert.equal((await rewards()).xp,before);
 await user(alice);await assert.rejects(()=>rpc('select public.academy_certificate_get($1) as value',[id]),/not found/);
 await user(null,'anon');const publicResult=await verify(id,'Bob Student');assert.equal(publicResult.valid,true);assert.ok(!('holder' in publicResult));
 await db.exec('reset role');await query('update academy_achievements.certificates set revoked_at=now() where id=$1',[id]);
 await user(null,'anon');assert.equal((await verify(id,'Bob Student')).valid,false);
});
test('all seven levels can earn HZad course-completion certificates; text support limits the scope honestly',async()=>{
 await user(alice);await rpc("select public.academy_rewards_preferences('America/Winnipeg','Alice Student','French learner') as value");
 // Independent calendar days for quota testing, not a client-controlled input.
 let unit=0;
 for(const [level,items] of Object.entries(bank.levels)){
  unit++;await rpc('select public.academy_submit_quiz($1,$2) as value',[level.toLowerCase()+'-'+(level==='A0'?'01':'001'),{q1:1}]);
  await db.exec('reset role');await query("update academy_achievements.attempts set started_at=now()-interval '2 days' where user_id=$1 and status='completed'",[alice]);await user(alice);
  let a=await rpc('select public.academy_final_start($1,true) as value',[level]);
  for(let i=0;i<12;i++)a=await answer(a.id,`final-v1-${level}-${i+1}`,items[i][3],items[i][0]==='listening');
  assert.equal(a.result.passed,true);assert.match(a.result.scope,/text-supported/);assert.ok(!('listening' in a.result.skills));assert.equal(a.result.skills.reading.total,6);
 }
 const state=await rpc('select public.academy_certificates_state() as value');assert.equal(state.certificates.length,7);
 assert.ok((await rewards()).badges.find(b=>b.code==='seven-certificates').earned);
});
test('minimum skill evidence and 80 percent are required; failures do not issue certificates and quotas apply',async()=>{
 await user(bob);
 for(let retry=0;retry<2;retry++){
  let a=await exam('A0');
  for(let i=0;i<12;i++)a=await answer(a.id,`final-v1-A0-${i+1}`,i>=9?(bank.levels.A0[i][3]+1)%4:bank.levels.A0[i][3]);
  assert.equal(a.result.passed,false);assert.equal(a.result.percent,75);assert.equal(a.result.certificateId,null);
 }
 await assert.rejects(()=>exam('A0'),/Three new final assessments/);
});
test('83 percent passes only with balanced skill evidence; expired and changed-course attempts fail safely',async()=>{
 await db.exec('reset role');await query("update academy_achievements.attempts set started_at=now()-interval '2 days' where user_id=$1",[alice]);
 await user(alice);
 for(const [misses,expected] of [[[0,3],true],[[9,10],false]]){
  let a=await exam('A2');
  for(let i=0;i<12;i++)a=await answer(a.id,`final-v1-A2-${i+1}`,misses.includes(i)?(bank.levels.A2[i][3]+1)%4:bank.levels.A2[i][3]);
  assert.equal(a.result.percent,83);assert.equal(a.result.passed,expected);
 }
 let a=await exam('A2');await assert.rejects(()=>answer(a.id,a.question.id,0,true),/Transcript applies only/);
 await db.exec('reset role');await query("update academy_achievements.attempts set started_at=now()-interval '8 days' where id=$1",[a.id]);await user(alice);
 await assert.rejects(()=>answer(a.id,a.question.id,0),/not active/);
 assert.equal((await rpc('select public.academy_final_state($1) as value',[a.id])).status,'expired');
 a=await exam('A2');
 for(let i=0;i<11;i++)a=await answer(a.id,`final-v1-A2-${i+1}`,bank.levels.A2[i][3]);
 await db.exec('reset role');await query("select set_config('request.jwt.claim.sub','',false)");await query('update public.academy_learning_progress set completed=false where user_id=$1 and unit_id=$2',[alice,'a2-001']);await user(alice);
 await assert.rejects(()=>answer(a.id,'final-v1-A2-12',bank.levels.A2[11][3]),/requirements changed/);
 await db.exec('reset role');await query("select set_config('request.jwt.claim.sub','',false)");await query('update public.academy_learning_progress set completed=true where user_id=$1 and unit_id=$2',[alice,'a2-001']);await user(alice);
 assert.equal((await answer(a.id,'final-v1-A2-12',bank.levels.A2[11][3])).result.passed,true);
 await assert.rejects(()=>exam('B1'),/Three new final assessments/);
 await assert.rejects(()=>query('update academy_achievements.certificates set score=100'),/permission denied/);
 await assert.rejects(()=>query('select answer from academy_achievements.questions'),/permission denied/);
});
test('anonymous, expired and unverified users cannot claim XP or assessment/certificate ownership',async()=>{
 await user(null,'anon');await assert.rejects(rewards,/permission denied/);await assert.rejects(()=>exam('A0'),/permission denied/);
 await db.exec('reset role');await query("update public.purchase_entitlements set access_ends_at=now()-interval '1 day' where user_id=$1",[alice]);await user(alice);
 await assert.rejects(rewards,/Active academy access/);await assert.rejects(()=>exam('C2'),/Active academy access/);
 // Previously earned certificates remain readable/verifiable after purchase expiry.
 const id=(await (async()=>{await db.exec('reset role');return query('select id from academy_achievements.certificates where user_id=$1 limit 1',[alice])})())[0].id;
 await user(alice);assert.equal((await rpc('select public.academy_certificate_get($1) as value',[id])).revoked,false);
 await db.exec('reset role');await query('update auth.users set email_confirmed_at=null where id=$1',[alice]);await user(alice);
 await assert.rejects(()=>rpc('select public.academy_certificate_get($1) as value',[id]),/Verified sign-in/);
});
test('rollback disables earning and new assessments while preserving awards, certificates and ordinary quizzes',async()=>{
 await db.exec('reset role');
 const count=(await query('select count(*)::int as n from academy_achievements.certificates'))[0].n;
 await db.exec(await readFile('supabase/rollbacks/20261104_disable_achievements.sql','utf8'));
 await user(bob);await assert.rejects(rewards,/permission denied/);await assert.rejects(()=>exam('A0'),/permission denied/);
 const feedback=await rpc("select public.academy_check_answer('a0-01','q1',1) as value");assert.equal(feedback.correct,true);
 const completed=await rpc("select public.academy_submit_quiz('a0-01','{\"q1\":1}') as value");assert.equal(completed.percent,100);
 await db.exec('reset role');assert.equal((await query('select count(*)::int as n from academy_achievements.certificates'))[0].n,count);
});
