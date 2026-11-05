import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db;const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
const val=async(sql,args=[])=> (await q(sql,args))[0].v;
async function role(name='postgres',id=''){await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);if(name!=='postgres')await db.exec('set role '+name)}
const command=async(user,action,id,payload={})=>{await role('service_role');return val('select public.academy_exam_command($1,$2,$3,$4) v',[user,action,id,payload])};
const state=(id,user=alice)=>({id,userId:user,version:'tef-canada-hzad-01-20261105',status:'active',section:0});
const start=(id=crypto.randomUUID(),user=alice,extra={})=>command(user,'start',id,{exam:'tef-canada',credits:50,version:'tef-canada-hzad-01-20261105',state:state(id,user),...extra});
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid references auth.users(id),status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${alice}',now()),('${bob}',now());insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const file of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy broad_legacy_access on storage.objects for all to anon,authenticated using(true) with check(true);`);
 await db.exec(await readFile('supabase/migrations/20261105001300_exam_audio_storage.sql','utf8'));
 await db.exec("insert into storage.objects(bucket_id,name) values('academy-exam-listening','private.mp3'),('academy-exam-recordings','private.wav'),('unrelated','public.txt')");
 await db.exec(`insert into public.academy_units(id,level,position,title,published) values('a0-01','A0',1,'Existing lesson',true);
 insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed) values('${alice}','a0-01',3,90,true);`);
});
after(async()=>db?.close());
beforeEach(async()=>{
 await role();await db.exec(`truncate academy_exams.ledger,academy_exams.calls,academy_exams.attempts,academy_ai.wallets restart identity cascade;
 update academy_ai.policy set enabled=true,included_credits=500,allowed_users=null,student_cap_microcad=10000000,global_cap_microcad=null,spent_microcad=0,reserved_microcad=0;
 update academy_exams.catalog set enabled=false,audio_reviewed=false,editorial_reviewed=false,credits=null,budget_microcad=null,call_microcad=null;
 update auth.users set email_confirmed_at=now();update public.purchase_entitlements set status='active',verified_at=now();`);
});
async function enable(){await role();await db.exec('update academy_exams.catalog set credits=50,budget_microcad=640000,call_microcad=10000,audio_reviewed=true,editorial_reviewed=true,enabled=true')}
test('release requires reviewed audio/content and complete prices; disabled exams never charge',async()=>{
 await assert.rejects(()=>start(),/being prepared/);await role();assert.equal(await val('select count(*)::int v from academy_ai.wallets'),0);
 await assert.rejects(()=>q('update academy_exams.catalog set enabled=true'),/check constraint/);
 await assert.rejects(()=>q('update academy_exams.catalog set audio_reviewed=true,editorial_reviewed=true,credits=50,enabled=true'),/check constraint/);
});
test('full access charges once, freezes the quote, and isolates independent student budgets',async()=>{
 await enable();const a=await start();await start(a.id);await start(crypto.randomUUID(),bob);
 await role();const wallets=await q('select available,reserved,reserved_microcad from academy_ai.wallets order by user_id');assert.deepEqual(wallets,[{available:450,reserved:50,reserved_microcad:640000},{available:450,reserved:50,reserved_microcad:640000}]);
 assert.equal(await val("select count(*)::int v from academy_exams.ledger where event='access'"),2);
 await assert.rejects(()=>start(),/current mock/);await assert.rejects(()=>start(crypto.randomUUID(),alice,{credits:1}),/price or version changed/);
});
test('anonymous and authenticated browsers cannot set state, scores, credits or read private exam tables',async()=>{
 await enable();const a=await start();await role('anon');await assert.rejects(()=>q('select public.academy_exam_catalog()'),/permission denied/);
 await role('authenticated',alice);
 await assert.rejects(()=>q('select * from academy_exams.attempts'),/permission denied/);
 await assert.rejects(()=>q('select public.academy_exam_command($1,$2,$3,$4)',[alice,'read',a.id,{}]),/permission denied/);
 await assert.rejects(()=>command(bob,'read',a.id),/not found/);
 await role();await q('update auth.users set email_confirmed_at=null where id=$1',[alice]);await assert.rejects(()=>command(alice,'read',a.id),/active academy access/);
});
test('revision checks prevent concurrent answer overwrites and model calls claim/charge only once',async()=>{
 await enable();const a=await start();const saved=await command(alice,'save',a.id,{revision:0,state:{...a.state,section:1}});assert.equal(saved.revision,1);
 await assert.rejects(()=>command(alice,'save',a.id,{revision:0,state:a.state}),/Exam changed/);
 const callId=crypto.randomUUID(),payload={callId,hash:'a'.repeat(64),purpose:'turn'};
 assert.equal((await command(alice,'claim-call',a.id,payload)).claimed,true);assert.equal((await command(alice,'claim-call',a.id,payload)).claimed,false);
 await assert.rejects(()=>command(alice,'claim-call',a.id,{...payload,hash:'b'.repeat(64)}),/already used/);
 await command(alice,'finish-call',a.id,{callId,result:{kind:'turn',taskId:'s1',recordingId:callId,transcript:'Bonjour',reply:'Bonjour !',observations:['Clear greeting.']},usage:{prompt_tokens:10}});
 const loaded=await command(alice,'read',a.id);assert.equal(loaded.callResults.length,1);
 await role();const wallet=(await q('select * from academy_ai.wallets where user_id=$1',[alice]))[0];assert.equal(wallet.spent_microcad,10000);assert.equal(wallet.reserved_microcad,630000);
});
test('timeouts consume the reviewed cost, close releases unused budget once, and review is free',async()=>{
 await enable();const a=await start(),callId=crypto.randomUUID();await command(alice,'claim-call',a.id,{callId,hash:'a'.repeat(64),purpose:'assessment'});
 await command(alice,'finish-call',a.id,{callId,result:null,usage:{outcome:'timeout'}});
 await command(alice,'close',a.id);await command(alice,'close',a.id);await command(alice,'read',a.id);
 await assert.rejects(()=>command(alice,'claim-call',a.id,{callId:crypto.randomUUID(),hash:'b'.repeat(64),purpose:'assessment'}),/closed/);
 await role();const wallet=(await q('select * from academy_ai.wallets'))[0];assert.equal(wallet.available,450);assert.equal(wallet.reserved,0);assert.equal(wallet.reserved_microcad,0);assert.equal(wallet.spent_microcad,10000);
 assert.equal(await val("select count(*)::int v from academy_exams.ledger where event='release'"),1);
 assert.equal(await val('select best_percent v from public.academy_learning_progress'),90);
});
test('the CAD 10 learner ceiling applies alongside existing trainers without any shared cap',async()=>{
 await enable();const a=await start();await command(alice,'close',a.id);await role();await db.exec('update academy_ai.wallets set spent_microcad=9900000');
 await assert.rejects(()=>start(),/allowance cannot cover/);await start(crypto.randomUUID(),bob);
 await role();await db.exec("update academy_ai.activities set enabled=true,credits=1,ceiling_microcad=100,model='test' where kind='writing'");
 await role('service_role');const r=await val('select public.academy_ai_reserve($1,$2,$3,$4,$5,1) v',[bob,crypto.randomUUID(),'writing','A1','a'.repeat(64)]);assert.equal(r.status,'reserved');
});
test('private exam buckets resist broad pre-existing storage policies while unrelated buckets retain access',async()=>{
 await role('authenticated',alice);assert.equal((await q('select * from storage.objects')).length,1);
 await assert.rejects(()=>q("insert into storage.objects(bucket_id,name) values('academy-exam-recordings','forged.wav')"),/row-level security/);
 await q("update storage.objects set name='stolen.mp3' where bucket_id='academy-exam-listening'");
 await role();assert.equal(await val("select name v from storage.objects where bucket_id='academy-exam-listening'"),'private.mp3');
 await role('anon');assert.equal((await q('select * from storage.objects')).length,1);
});
