import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

let db,bank,items;
const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
const rpc=async(sql,args=[])=> (await query(sql,args))[0].value;
async function asUser(id,role='authenticated'){
 await db.exec('reset role');
 await query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
 await db.exec('set role '+role);
}
const start=()=>rpc('select public.academy_placement_start() as value');
const state=id=>rpc('select public.academy_placement_state($1) as value',[id]);
const answer=(id,q,choice,mode=q.skill==='listening'?'audio':'standard')=>rpc('select public.academy_placement_answer($1,$2,$3,$4) as value',[id,q.id,choice,mode]);
before(async()=>{
 db=new PGlite();
 bank=JSON.parse(await readFile('supabase/placement/bank-v1.json','utf8'));
 let pos=0;items=Object.entries(bank.levels).flatMap(([level,rows])=>rows.map(([skill,prompt,options,key,audio])=>({id:`fr-v1-${++pos}`,level,skill,prompt,options,key,audio})));
 await db.exec(`create role anon;create role authenticated;
 create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(id uuid default gen_random_uuid(),user_id uuid references auth.users(id),status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements(user_id,status,verified_at,access_starts_at,product_code) select id,'active',now(),now()-interval '1 day','HZAD_FULL_ACADEMY' from auth.users;`);
 await db.exec(await readFile('supabase/migrations/20261029_academy_learning.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261104_french_placement.sql','utf8'));
});
after(async()=>{await db?.close()});

test('bank has balanced original evidence, and real migration contains all 56 items',async()=>{
 assert.equal(items.length,56);
 assert.deepEqual(Object.keys(bank.levels),['A0','A1','A2','B1','B2','C1','C2']);
 for(const rows of Object.values(bank.levels)){
  assert.equal(rows.length,8);
  for(const skill of ['grammar','vocabulary','reading','listening'])assert.equal(rows.filter(r=>r[0]===skill).length,2);
  for(const [skill,prompt,options,key,audio] of rows){assert.equal(new Set(options).size,4);assert.ok(prompt.length>5);assert.ok(key>=0&&key<=3);if(skill==='listening')assert.ok(audio?.length>20)}
 }
 assert.equal((await query('select count(*)::int as n from academy_placement.questions'))[0].n,56);
 const wrappers=await query("select proname,prosecdef from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname like 'academy_placement_%'");
 assert.equal(wrappers.length,3);assert.ok(wrappers.every(p=>!p.prosecdef));
 assert.ok((await query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='academy_placement' and relname in ('questions','attempts')")).every(t=>t.relrowsecurity));
});

test('scoring boundaries require contiguous mastery and skill evidence, not raw percentage',async()=>{
 const scored=async(answers)=>rpc('select academy_placement.score($1,$2) as value',[bank.version,JSON.stringify(answers)]);
 const answers={};
 for(let level=0;level<7;level++){
  for(const q of items.slice(level*8,level*8+8))answers[q.id]={choice:q.key,mode:q.skill==='listening'?'audio':'standard'};
  assert.equal((await scored(answers)).recommendedLevel,['A1','A2','B1','B2','C1','C2','C2'][level]);
 }
 for(const correct of [0,4,5,6,7,8]){
  const a=Object.fromEntries(items.slice(0,8).map((q,i)=>[q.id,{choice:i<correct?q.key:(q.key+1)%4,mode:q.skill==='listening'?'audio':'standard'}]));
  const r=await scored(a);
  // Six correct with both listening answers wrong still fails skill evidence.
  assert.equal(r.recommendedLevel,correct>=7?'A1':'A0');
 }
 const six=Object.fromEntries(items.slice(0,8).map((q,i)=>[q.id,{choice:[1,3].includes(i)?(q.key+1)%4:q.key,mode:q.skill==='listening'?'audio':'standard'}]));
 assert.equal((await scored(six)).recommendedLevel,'A1');
 six[items[4].id].choice=(items[4].key+1)%4;
 const boundary=await scored(six);assert.equal(boundary.recommendedLevel,'A0');assert.equal(boundary.boundary,true);
 const incomplete={...answers};delete incomplete[items[0].id];
 assert.equal((await scored(incomplete)).recommendedLevel,'A0');
});

test('transcript fallback excludes listening and marks recommendation provisional',async()=>{
 const answers=Object.fromEntries(items.slice(0,8).map(q=>[q.id,{choice:q.key,mode:q.skill==='listening'?'transcript':'standard'}]));
 const r=await rpc('select academy_placement.score($1,$2) as value',[bank.version,answers]);
 assert.equal(r.provisional,true);assert.equal(r.skills.listening.total,0);assert.equal(r.skills.listening.percent,null);assert.equal(r.recommendedLevel,'A1');
 assert.equal(r.stages[0].total,6);
});

test('RPCs reject anonymous, unverified, expired, unverified-purchase and revoked access',async()=>{
 await asUser(null,'anon');await assert.rejects(start,/permission denied/);
 await asUser(null);await assert.rejects(start,/Verified email/);
 for(const change of ["update auth.users set email_confirmed_at=null", "update public.purchase_entitlements set verified_at=null", "update public.purchase_entitlements set access_ends_at=now()-interval '1 day'", "update public.purchase_entitlements set status='revoked'", "update public.purchase_entitlements set access_starts_at=now()+interval '1 day'", "update public.purchase_entitlements set product_code='UNRELATED'"]){
  await db.exec('reset role;begin;'+change);
  await asUser(alice);await db.exec('savepoint denied');
  await assert.rejects(start,/Verified email/);await db.exec('rollback to savepoint denied');
  await assert.rejects(()=>state(null),/Verified email/);
  await db.exec('rollback;reset role;');
 }
});

test('partial attempts resume; question eligibility, direct table writes and score forgery are blocked',async()=>{
 await asUser(alice);const s=await start(),a=s.attempt;
 assert.equal(a.answered,0);assert.equal(a.result,null);assert.equal(a.question.id,items[0].id);
 assert.ok(!('answer' in a.question));assert.ok(!JSON.stringify(s).includes('"choice"'));
 assert.equal((await start()).attempt.id,a.id);
 assert.ok((await Promise.all([start(),start()])).every(s=>s.attempt.id===a.id));
 await assert.rejects(()=>query('select * from academy_placement.questions'),/permission denied/);
 await assert.rejects(()=>query('update academy_placement.attempts set result=\'{"recommendedLevel":"C2"}\''),/permission denied/);
 await assert.rejects(()=>rpc('select academy_placement.score($1,$2) as value',[bank.version,{}]),/permission denied/);
 await assert.rejects(()=>answer(a.id,items[8],0),/not eligible/);
 await assert.rejects(()=>answer(a.id,items[0],null),/Invalid answer/);
 await assert.rejects(()=>answer(a.id,items[0],4),/Invalid answer/);
 await assert.rejects(()=>answer(a.id,items[0],0,'audio'),/Invalid answer mode/);
 const saved=await answer(a.id,items[0],items[0].key);
 assert.equal(saved.attempt.answered,1);assert.equal(saved.attempt.result,null);
 const retry=await answer(a.id,items[0],items[0].key);assert.equal(retry.attempt.answered,1);
 assert.ok((await Promise.all([answer(a.id,items[0],items[0].key),answer(a.id,items[0],items[0].key)])).every(s=>s.attempt.answered===1));
 await assert.rejects(()=>answer(a.id,items[0],(items[0].key+1)%4),/already recorded/);
 await asUser(bob);await assert.rejects(()=>state(a.id),/Attempt not found/);await assert.rejects(()=>answer(a.id,items[1],0),/Attempt not found/);
 assert.equal((await state(null)).history.length,0);
 await asUser(alice);assert.equal((await state(null)).attempt.answered,1);
});

test('progressive stages complete, retakes retain history and quotas are enforced',async()=>{
 await asUser(alice);let s=await start();const first=s.attempt.id;
 for(const q of items.slice(1)){
  s=await answer(first,q,q.key);
  if(q.id==='fr-v1-8')assert.equal(s.attempt.question.level,'A1');
 }
 assert.equal(s.attempt.status,'completed');assert.equal(s.attempt.result.recommendedLevel,'C2');
 assert.equal(s.attempt.result.skills.listening.total,14);
 // Replay of final request is idempotent; no extra attempts created.
 assert.equal((await answer(first,items[55],items[55].key)).attempt.id,first);
 for(let attempt=0;attempt<2;attempt++){
  s=await start();assert.notEqual(s.attempt.id,first);
  for(const q of items.slice(0,8))s=await answer(s.attempt.id,q,(q.key+1)%4);
  assert.equal(s.attempt.status,'completed');assert.equal(s.attempt.result.recommendedLevel,'A0');
 }
 assert.equal(s.history.length,3);await assert.rejects(start,/three new placement attempts/);
 await db.exec('reset role');
 assert.equal((await query('select count(*)::int as n from academy_placement.attempts where user_id=$1',[alice]))[0].n,3);
 await query("update academy_placement.attempts set started_at=now()-interval '25 hours' where user_id=$1",[alice]);
 await asUser(alice);const later=await start();assert.equal(later.history.length,4);
 await db.exec('reset role');
});

test('stale partial attempts expire, access is rechecked mid-attempt, no entitlement is granted',async()=>{
 await asUser(bob);let s=await start();const stale=s.attempt.id;
 await db.exec("reset role;update academy_placement.attempts set started_at=now()-interval '8 days' where user_id='"+bob+"'");
 await asUser(bob);await assert.rejects(()=>answer(stale,items[0],0),/not active/);
 assert.equal((await state(stale)).attempt.status,'expired');s=await start();assert.notEqual(s.attempt.id,stale);
 await db.exec("reset role;update public.purchase_entitlements set status='revoked' where user_id='"+bob+"'");
 await asUser(bob);await assert.rejects(()=>answer(s.attempt.id,items[0],0),/Verified email/);
 await db.exec('reset role');assert.equal((await query("select status from public.purchase_entitlements where user_id=$1",[bob]))[0].status,'revoked');
});
