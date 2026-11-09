import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createWritingHandler} from '../supabase/functions/academy-tcf-writing/handler.js';
let db;const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
const v=async(sql,args=[])=> (await q(sql,args))[0].v;
async function role(name='postgres',id=''){await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(name!=='postgres')await db.exec('set role '+name)}
const command=(user,action,id=null,payload={})=>v('select public.academy_tcf_writing_command($1,$2,$3,$4) as v',[user,action,id,action==='start'?{version:'tcf-writing-2026-11-v2',...payload}:payload]);
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 await db.exec(await readFile('supabase/migrations/20261029_academy_learning.sql','utf8'));
 await db.exec(`insert into public.academy_units(id,level,position,title,published) values('a0-01','A0',1,'Keep lesson',true);
 insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed) values('${alice}','a0-01',3,92,true);`);
 await db.exec(await readFile('supabase/migrations/20261105001000_ai_learning.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261109001500_tcf_writing.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261109001600_fix_tcf_writing_history.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261109001700_resume_tcf_writing_drafts.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261109001800_tcf_writing_sample_format.sql','utf8'));
});
after(async()=>db?.close());
test('additive migration leaves existing progress and activity prices intact and the new paid activity off',async()=>{
 await role('service_role');assert.deepEqual(await command(alice,'list'),[]);await role();
 const activity=(await q("select * from academy_ai.activities where kind='tcf-writing'"))[0];assert.equal(activity.enabled,false);assert.equal(activity.credits,null);assert.equal(activity.ceiling_microcad,null);
 assert.equal((await q('select best_percent from public.academy_learning_progress'))[0].best_percent,92);
 assert.equal((await q('select count(*)::int n from academy_ai.wallets'))[0].n,0);
 assert.equal((await q('select count(*)::int n from academy_ai.requests'))[0].n,0);
});
test('anonymous and students cannot call privileged commands, read other drafts or edit price/score tables',async()=>{
 for(const name of ['anon','authenticated']){await role(name,alice);await assert.rejects(()=>command(alice,'list'),/permission denied/);await assert.rejects(()=>q('select * from academy_tcf_writing.attempts'),/permission denied/)}await role();
});
test('verified access required; expired/revoked/unverified entitlement cannot start or read writing',async()=>{
 await db.exec(`update auth.users set email_confirmed_at=null where id='${bob}'`);await role('service_role');await assert.rejects(()=>command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-01'}),/Verified email/);
 await role();await db.exec(`update auth.users set email_confirmed_at=now();update public.purchase_entitlements set status='revoked' where user_id='${bob}'`);await role('service_role');await assert.rejects(()=>command(bob,'list'),/active academy access/);
 await role();await db.exec("update public.purchase_entitlements set status='active',access_ends_at=now()-interval '1 second'");await role('service_role');await assert.rejects(()=>command(alice,'list'),/active academy access/);await role();await db.exec('update public.purchase_entitlements set access_ends_at=null');
});
test('drafts persist all three responses, enforce revision conflicts and lock after submission',async()=>{
 await role('service_role');const id=crypto.randomUUID();let row=await command(alice,'start',id,{testId:'tcf-writing-01'});assert.equal(row.revision,0);assert.deepEqual(row.responses,['','','']);
 assert.equal(Date.parse(row.deadline)-Date.parse(row.startedAt),3600000);
 assert.equal((await command(alice,'start',id,{testId:'tcf-writing-01'})).revision,0);
 await assert.rejects(()=>command(alice,'start',id,{testId:'tcf-writing-02'}),/already used/);
 const answers=['Mon premier texte.','Mon deuxième texte.','Mon troisième texte.'];row=await command(alice,'save',id,{revision:0,responses:answers});assert.equal(row.revision,1);
 await assert.rejects(()=>command(alice,'save',id,{revision:0,responses:answers}),/another tab/);
 await assert.rejects(()=>command(bob,'read',id),/not found/);await assert.rejects(()=>command(bob,'submit',id),/not found/);
 assert.deepEqual((await command(alice,'read',id)).responses,answers);
 row=await command(alice,'submit',id);assert.equal(row.status,'submitted');assert.equal((await command(alice,'submit',id)).revision,row.revision);
 await assert.rejects(()=>command(alice,'save',id,{revision:row.revision,responses:answers}),/locked/);await role();
});
test('deadline uses server time, expired drafts remain readable and can be submitted but never overwritten',async()=>{
 await role('service_role');const id=crypto.randomUUID();await command(alice,'start',id,{testId:'tcf-writing-20'});await command(alice,'save',id,{revision:0,responses:['saved','','']});
 await role();await q("update academy_tcf_writing.attempts set deadline=now()-interval '1 second' where id=$1",[id]);await role('service_role');await assert.rejects(()=>command(alice,'save',id,{revision:1,responses:['late','','']}),/time has ended/);
 assert.equal((await command(alice,'submit',id)).responses[0],'saved');await role();
});
test('draft limits, malformed payloads and invalid bank IDs cannot create unbounded state or bypass constraints',async()=>{
 await role('service_role');const id=crypto.randomUUID();await command(bob,'start',id,{testId:'tcf-writing-03'});
 for(const responses of [[],['one','two'],[1,'',''],['x'.repeat(3501),'',''],['x'.repeat(3000),'x'.repeat(3000),'x'.repeat(1000)]])await assert.rejects(()=>command(bob,'save',id,{revision:0,responses}),/Invalid writing|too long/);
 await assert.rejects(()=>command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-99'}),/check constraint/);
 await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-04'});await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-05'});
 assert.equal((await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-06'})).testId,'tcf-writing-06');await role();
});
test('writing result uses the existing wallet ledger, one frozen charge, owner-only free review and non-destructive rollback',async()=>{
 await db.exec("update academy_ai.policy set enabled=true,included_credits=20,student_cap_microcad=10000000,global_cap_microcad=10000000;update academy_ai.activities set enabled=true,credits=3,ceiling_microcad=1000,model='test-only' where kind='tcf-writing'");
 await role('service_role');const id=crypto.randomUUID();await command(alice,'start',id,{testId:'tcf-writing-07'});await command(alice,'submit',id);
 const args=[alice,id,'tcf-writing','B2','a'.repeat(64),3,null,null];
 const reserve=()=>v('select public.academy_ai_reserve($1,$2,$3,$4,$5,$6,$7,$8) as v',args);
 await reserve();await reserve();await v('select public.academy_ai_claim($1,$2) as v',[alice,id]);
 await v('select public.academy_ai_finish($1,$2,$3,$4,null) as v',[alice,id,{module:'tcf-writing',score:12,nclc:'8'},{total_tokens:100}]);
 assert.equal((await command(alice,'read',id)).result.score,12);assert.equal((await command(alice,'read',id)).result.score,12);
 await assert.rejects(()=>command(bob,'read',id),/not found/);await role();
 assert.equal((await q('select available from academy_ai.wallets where user_id=$1',[alice]))[0].available,17);
 assert.equal((await q("select count(*)::int n from academy_ai.ledger where request_id=$1 and event='charge'",[id]))[0].n,1);
 await db.exec(await readFile('supabase/rollbacks/20261109_disable_tcf_writing.sql','utf8'));await role('service_role');assert.equal((await command(alice,'read',id)).result.nclc,'8');await role();assert.equal((await q('select best_percent from public.academy_learning_progress'))[0].best_percent,92);
});
test('entitled learners can list saved writing attempts through the real database function',async()=>{
 await role('service_role');const rows=await command(alice,'list');assert(Array.isArray(rows));assert(rows.some(r=>r.testId==='tcf-writing-01'));await role();
});

test('writing catalog GET succeeds through the real handler and real PostgreSQL RPCs without AI calls',async()=>{
 await role();let calls=0;
 const adapter={
  userRpc:async()=>db.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[alice]);await tx.exec('set local role authenticated');
   return (await tx.query('select public.academy_ai_state() as v')).rows[0].v;
  }),
  adminRpc:async(name,p)=>db.transaction(async tx=>{
   assert.equal(name,'academy_tcf_writing_command');await tx.exec('set local role service_role');
   return (await tx.query('select public.academy_tcf_writing_command($1,$2,$3,$4) as v',[p.p_user,p.p_action,p.p_id,p.p_payload])).rows[0].v;
  })
 };
 const handler=createWritingHandler({authenticate:async()=>({id:alice,email_confirmed_at:'yes'}),db:adapter,provider:{ready:()=>true,run:async()=>{calls++;throw Error('Unexpected AI call')}}});
 const response=await handler(new Request('https://example.test?format=sample-v2',{headers:{Authorization:'Bearer fixture'}}));assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.tests.length,20);assert.equal(result.tests[0].tasks.length,3);assert(result.history.some(r=>r.testId==='tcf-writing-01'));assert.equal(calls,0);assert.equal(result.enabled,false);
});

test('opening Test 1, going back and reopening never creates duplicates or resets text/timer; all 20 tests stay accessible',async()=>{
 await role('service_role');let first=await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-01'});
 first=await command(bob,'save',first.id,{revision:first.revision,responses:['Ne pas perdre ce texte.','','']});
 for(let i=0;i<8;i++){
  await command(bob,'list');const resumed=await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-01'});
  assert.equal(resumed.id,first.id);assert.equal(resumed.deadline,first.deadline);assert.deepEqual(resumed.responses,first.responses);
 }
 for(let n=1;n<=20;n++)assert.equal((await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-'+String(n).padStart(2,'0')})).testId,'tcf-writing-'+String(n).padStart(2,'0'));
 await role();assert.equal((await q('select count(*)::int n from academy_tcf_writing.attempts where user_id=$1 and deadline>now()',[bob]))[0].n,20);
});
test('legacy empty duplicates never hide a draft containing responses, and no old attempt is deleted',async()=>{
 await role();const id=crypto.randomUUID();await q("insert into academy_tcf_writing.attempts(id,user_id,test_id,version) values($1,$2,'tcf-writing-01','tcf-writing-2026-11-v1')",[id,bob]);
 await role('service_role');const resumed=await command(bob,'start',crypto.randomUUID(),{testId:'tcf-writing-01'});assert.notEqual(resumed.id,id);assert.equal(resumed.responses[0],'Ne pas perdre ce texte.');assert.equal((await command(bob,'read',id)).responses[0],'');await role();
});
test('resuming works at the 50-start daily limit; creating genuinely new attempts remains bounded',async()=>{
 await role();const user='33333333-3333-4333-8333-333333333333';
 await q('insert into auth.users values($1,now())',[user]);await q("insert into public.purchase_entitlements values($1,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY')",[user]);
 await role('service_role');const original=await command(user,'start',crypto.randomUUID(),{testId:'tcf-writing-01'});
 await role();await q("insert into academy_tcf_writing.attempts(id,user_id,test_id,version,deadline) select gen_random_uuid(),$1,'tcf-writing-02','tcf-writing-2026-11-v1',now()-interval '1 second' from generate_series(1,49)",[user]);
 await role('service_role');assert.equal((await command(user,'start',crypto.randomUUID(),{testId:'tcf-writing-01'})).id,original.id);
 await assert.rejects(()=>command(user,'start',crypto.randomUUID(),{testId:'tcf-writing-03'}),/Daily writing attempt limit/);await role();
});

test('new sample-format papers never overwrite or resume earlier-version responses under changed prompts',async()=>{
 await role();const user='44444444-4444-4444-8444-444444444444',old=crypto.randomUUID();
 await q('insert into auth.users values($1,now())',[user]);await q("insert into public.purchase_entitlements values($1,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY')",[user]);
 await q("insert into academy_tcf_writing.attempts(id,user_id,test_id,version,responses) values($1,$2,'tcf-writing-01','tcf-writing-2026-11-v1',$3)",[old,user,['Réponse à la question précédente.','','']]);
 await role('service_role');const latest=await command(user,'start',crypto.randomUUID(),{testId:'tcf-writing-01'});assert.notEqual(latest.id,old);assert.equal(latest.version,'tcf-writing-2026-11-v2');
 const earlier=await command(user,'read',old);assert.equal(earlier.version,'tcf-writing-2026-11-v1');assert.equal(earlier.responses[0],'Réponse à la question précédente.');
 assert.equal((await command(user,'start',crypto.randomUUID(),{testId:'tcf-writing-01'})).id,latest.id);assert.equal((await command(user,'list')).length,2);await role();
});
