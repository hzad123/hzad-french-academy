import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
const value=async(sql,args=[])=> (await q(sql,args))[0].v;
async function role(name='postgres',id=''){await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(name!=='postgres')await db.exec('set role '+name)}
const state=()=>value('select public.academy_ai_state() as v');
const row=async(table)=>{await role();return (await q('select * from academy_ai.'+table))[0]};
const base=(extra={})=>({id:crypto.randomUUID(),user:alice,kind:'writing',level:'A1',hash:'a'.repeat(64),credits:4,session:null,scenario:null,...extra});
async function reserve(r){await role('service_role');return value('select public.academy_ai_reserve($1,$2,$3,$4,$5,$6,$7,$8) as v',[r.user,r.id,r.kind,r.level,r.hash,r.credits,r.session,r.scenario])}
async function claim(r){await role('service_role');return value('select public.academy_ai_claim($1,$2) as v',[r.user,r.id])}
async function finish(r,result={correctedText:'Bonjour.'},student=null){await role('service_role');return value('select public.academy_ai_finish($1,$2,$3,$4,$5) as v',[r.user,r.id,result,{prompt_tokens:10},student])}
async function fail(r){await role('service_role');return q('select public.academy_ai_fail($1,$2)',[r.user,r.id])}
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid references auth.users(id),status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 await db.exec(await readFile('supabase/migrations/20261029_academy_learning.sql','utf8'));
 await db.exec(`insert into public.academy_units(id,level,position,title,published) values('a0-01','A0',1,'Existing lesson',true);
 insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed) values('${alice}','a0-01',2,83,true);`);
 await db.exec(await readFile('supabase/migrations/20261105001000_ai_learning.sql','utf8'));
});
after(async()=>db?.close());
beforeEach(async()=>{
 await role();await db.exec(`truncate academy_ai.paid_topups,academy_ai.ledger,academy_ai.requests,academy_ai.conversations,academy_ai.wallets restart identity cascade;
 update academy_ai.policy set enabled=true,allowed_users=null,included_credits=20,student_cap_microcad=1000,global_cap_microcad=5000,spent_microcad=0,reserved_microcad=0,daily_limit=20;
 update academy_ai.activities set enabled=true,credits=case kind when 'writing' then 4 when 'conversation' then 2 else 3 end,ceiling_microcad=100,model='tested-model',max_output_tokens=1200;
 update auth.users set email_confirmed_at=now();update public.purchase_entitlements set status='active',verified_at=now(),access_starts_at=now()-interval '1 day',access_ends_at=null;`);
});
test('AI defaults can be disabled without initializing wallets or affecting lesson progress',async()=>{
 await db.exec('update academy_ai.policy set enabled=false,included_credits=null');await role('authenticated',alice);
 const s=await state();assert.equal(s.enabled,false);assert.equal(s.wallet,null);assert.deepEqual(s.history,[]);
 await assert.rejects(()=>reserve(base()),/not available/);await role();assert.equal((await q('select count(*)::int n from academy_ai.wallets'))[0].n,0);
 assert.equal((await q('select best_percent from public.academy_learning_progress'))[0].best_percent,83);
});
test('deployment allowlists restrict AI spending without granting course access or allocating other wallets',async()=>{
 await q('update academy_ai.policy set allowed_users=array[$1]::uuid[]',[alice]);
 await role('authenticated',bob);const s=await state();assert.equal(s.enabled,false);assert.equal(s.wallet,null);
 await assert.rejects(()=>reserve(base({user:bob})),/not available/);
 const r=base();await reserve(r);await role();await q('update academy_ai.policy set allowed_users=array[$1]::uuid[]',[bob]);
 await assert.rejects(()=>claim(r),/paused/);await fail(r);
});
test('only verified entitled identities read AI data; students cannot reserve, claim, change credits or access private tables',async()=>{
 await role('anon');await assert.rejects(state,/permission denied/);
 await role('authenticated',alice);await state();
 for(const sql of ['select * from academy_ai.wallets','update academy_ai.policy set enabled=true',`select public.academy_ai_claim('${alice}','${crypto.randomUUID()}')`,`select academy_ai.ensure_wallet('${alice}')`])await assert.rejects(()=>q(sql),/permission denied/);
 await role();await db.exec(`update auth.users set email_confirmed_at=null where id='${alice}'`);await role('authenticated',alice);await assert.rejects(state,/Verified email/);
 await role();await db.exec(`update auth.users set email_confirmed_at=now();update public.purchase_entitlements set verified_at=null`);await role('authenticated',alice);await assert.rejects(state,/active academy access/);
 await role();await db.exec(`update public.purchase_entitlements set verified_at=now(),access_ends_at=now()-interval '1 second'`);await assert.rejects(()=>reserve(base()),/active academy access/);
});
test('reservation is idempotent, frozen to the displayed price/model, and dispatch can be claimed only once',async()=>{
 const r=base();await reserve(r);await reserve(r);let w=await row('wallets');assert.equal(w.available,16);assert.equal(w.reserved,4);
 await assert.rejects(()=>reserve({...r,hash:'b'.repeat(64)}),/already used/);await assert.rejects(()=>reserve({...r,user:bob}),/already used/);
 await role();await db.exec("update academy_ai.activities set model='changed-model',credits=9 where kind='writing'");
 assert.equal((await claim(r)).model,'tested-model');assert.equal((await claim(r)).claimed,false);
 const result=await finish(r);assert.equal(result.status,'completed');await finish(r);
 w=await row('wallets');assert.equal(w.available,16);assert.equal(w.reserved,0);assert.equal(w.spent_microcad,100);
 assert.equal((await q("select count(*)::int n from academy_ai.ledger where event='charge'"))[0].n,1);
});
test('stale or forged credit prices, insufficient balances and overlapping requests fail before spending',async()=>{
 await assert.rejects(()=>reserve(base({credits:1})),/price changed/);
 const r=base();await reserve(r);await assert.rejects(()=>reserve(base()),/already in progress/);await fail(r);
 await role();await db.exec('update academy_ai.wallets set available=1');await assert.rejects(()=>reserve(base()),/Not enough AI credits/);
 const w=await row('wallets');assert.equal(w.available,1);assert.equal(w.reserved,0);assert.equal(w.spent_microcad,0);
});
test('provider failure refunds learner credits; dispatched timeouts still consume their full budget ceiling',async()=>{
 let r=base();await reserve(r);await fail(r);let w=await row('wallets');assert.equal(w.available,20);assert.equal(w.spent_microcad,0);
 r=base();await reserve(r);await claim(r);await fail(r);await fail(r);w=await row('wallets');assert.equal(w.available,20);assert.equal(w.reserved,0);assert.equal(w.spent_microcad,100);
 assert.equal((await row('policy')).spent_microcad,100);await assert.rejects(()=>finish(r),/Invalid AI completion/);
});
test('student and global budgets cap repeat spending, including failures; daily limits count every new activity',async()=>{
 await db.exec('update academy_ai.policy set student_cap_microcad=200,global_cap_microcad=200');
 for(let i=0;i<2;i++){const r=base();await reserve(r);await claim(r);await fail(r)}
 await assert.rejects(()=>reserve(base()),/allowance reached/);await assert.rejects(()=>reserve(base({user:bob})),/allowance reached/);
 await role();await db.exec('update academy_ai.policy set global_cap_microcad=5000,daily_limit=1');
 const r=base({user:bob});await reserve(r);await fail(r);await assert.rejects(()=>reserve(base({user:bob})),/Daily AI practice limit/);
});
test('six-month credits start at verified purchase, never refill on visits, and do not shorten course entitlement',async()=>{
 await role('authenticated',alice);let s=await state();assert.equal(s.wallet.available,20);
 await role();await db.exec(`update academy_ai.wallets set available=7,expires_at=now()-interval '1 second' where user_id='${alice}'`);
 await role('authenticated',alice);s=await state();assert.equal(s.wallet.available,0);assert.equal(await value('select public.academy_has_access() as v'),true);
 await assert.rejects(()=>reserve(base()),/period has ended/);
 await role();await db.exec(`update public.purchase_entitlements set access_starts_at=now()-interval '7 months' where user_id='${bob}'`);await role('authenticated',bob);assert.equal((await state()).wallet.available,0);
});
test('conversations resume server-owned turns, reject cross-account access and stop after twelve replies',async()=>{
 await db.exec('update academy_ai.policy set included_credits=100,student_cap_microcad=10000,global_cap_microcad=50000');
 let session;
 for(let i=0;i<12;i++){
  const r=base({kind:'conversation',credits:2,session:session||null,scenario:'cafe'}),reserved=await reserve(r);session=reserved.conversationId;
  assert.equal((await claim(r)).messages.length,i*2);
  await finish(r,{reply:'Bonjour ! Que souhaitez-vous ?',transcript:'',englishHelp:'Hello!',corrections:[],suggestedReplies:[]},'Un café, s’il vous plaît.');
 }
 await role('authenticated',alice);const s=await value('select public.academy_ai_conversation($1) as v',[session]);assert.equal(s.messages.length,24);assert.equal(s.messages[0].role,'user');
 await role('authenticated',bob);await assert.rejects(()=>value('select public.academy_ai_conversation($1) as v',[session]),/not found/);
 await assert.rejects(()=>reserve(base({user:bob,kind:'conversation',credits:2,session,scenario:'cafe'})),/not found/);
 await assert.rejects(()=>reserve(base({kind:'conversation',credits:2,session,scenario:'cafe'})),/Conversation complete/);
});
test('maintenance refunds stale work conservatively and purges old content without resetting balances',async()=>{
 let r=base();await reserve(r);await claim(r);await role();await db.exec("update academy_ai.requests set updated_at=now()-interval '16 minutes'");
 await role('authenticated',alice);await assert.rejects(()=>value('select public.academy_ai_maintenance() as v'),/permission denied/);
 await role('service_role');assert.equal((await value('select public.academy_ai_maintenance() as v')).reconciled,1);
 assert.equal((await row('wallets')).available,20);assert.equal((await row('wallets')).spent_microcad,100);
 r=base();await reserve(r);await claim(r);await finish(r);await role();await db.exec("update academy_ai.requests set created_at=now()-interval '91 days' where status='completed'");
 await role('service_role');assert.equal((await value('select public.academy_ai_maintenance() as v')).feedbackPurged,1);
 await role('authenticated',alice);assert.equal((await state()).history.length,1);assert.equal((await row('wallets')).available,16);
});
test('the included cap cannot exceed CAD 10 and only verified administrative payments can add more AI credit',async()=>{
 await assert.rejects(()=>q('update academy_ai.policy set student_cap_microcad=10000001'),/check constraint/);
 const r=base();await reserve(r);await fail(r);await role('authenticated',alice);
 const expiry=new Date(Date.now()+86400000*30).toISOString();
 const topup=()=>value('select public.academy_ai_paid_topup($1,$2,20,1000,$3) as v',[alice,'verified-test-payment',expiry]);
 await assert.rejects(topup,/permission denied/);await role('service_role');await assert.rejects(topup,/current AI allowance/);
 await role();await db.exec('update academy_ai.wallets set available=0');await role('service_role');
 assert.equal((await topup()).credited,true);assert.equal((await topup()).alreadyRecorded,true);
 await role('authenticated',alice);const s=await state();assert.equal(s.wallet.available,20);assert.equal(s.wallet.funding,'paid');
 await role('authenticated',bob);await assert.rejects(()=>q('select * from academy_ai.paid_topups'),/permission denied/);
});
test('saved feedback and pending activity are owner-only; rollback preserves them and existing progress',async()=>{
 const r=base();await reserve(r);await claim(r);await finish(r);
 await role('authenticated',alice);assert.equal((await state()).history[0].id,r.id);assert.equal((await value('select public.academy_ai_request($1) as v',[r.id])).result.correctedText,'Bonjour.');
 await role('authenticated',bob);await assert.rejects(()=>value('select public.academy_ai_request($1) as v',[r.id]),/not found/);assert.equal((await state()).history.length,0);
 await role();await db.exec(await readFile('supabase/rollbacks/20261104_disable_ai_learning.sql','utf8'));
 await role('authenticated',alice);assert.equal((await state()).history.length,1);assert.equal((await state()).enabled,false);
 await assert.rejects(()=>reserve(base()),/permission denied/);
 await role();const progress=(await q('select attempts,best_percent,completed from public.academy_learning_progress'))[0];assert.deepEqual(progress,{attempts:2,best_percent:83,completed:true});
});
