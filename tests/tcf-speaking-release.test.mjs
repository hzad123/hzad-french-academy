import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const files=['20261112002400_tcf_speaking_test01.sql','20261112002500_activate_tcf_speaking_test01.sql','20261112002600_speaking_final_upload_grace.sql'];
function transaction(pending,commit=false){const p=spawnSync('python3',['-c',`import importlib.util,json
s=importlib.util.spec_from_file_location('release','scripts/release/tcf-speaking.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
print(json.dumps(m.transaction(${JSON.stringify(pending)},${commit?'True':'False'})))`],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout)}
test('speaking release rehearses then activates exact source rates without changing progress, wallets, writing or old prices',async()=>{
 const db=new PGlite(),uid='11111111-1111-4111-8111-111111111111';const q=async s=>(await db.query(s)).rows;
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${uid}',now());insert into purchase_entitlements values('${uid}','active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY');create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 await db.exec(`update academy_ai.policy set enabled=true,included_credits=500;update academy_ai.activities set enabled=true,credits=10,model='gpt-audio-mini',ceiling_microcad=200000,max_output_tokens=1200 where kind='conversation';update academy_ai.activities set enabled=true,credits=1,model='gpt-4o-mini',ceiling_microcad=20000,max_output_tokens=2000 where kind='tcf-writing';select academy_ai.ensure_wallet('${uid}');insert into academy_units(id,level,position,title,published) values('a0-01','A0',1,'Preserve',true);insert into academy_learning_progress(user_id,unit_id,attempts,best_percent,completed) values('${uid}','a0-01',1,90,true);`);
 const before=await q('select * from academy_ai.wallets');
 await db.exec(transaction(files));assert.equal((await q("select count(*)::int n from information_schema.schemata where schema_name='academy_tcf_speaking'"))[0].n,0);
 await db.exec(transaction(files.filter(n=>n!==files[1]),true));assert.equal((await q("select count(*)::int n from academy_ai.activities where kind like 'tcf-speaking-%' and enabled"))[0].n,0);
 await db.exec(transaction([files[1]],true));assert.deepEqual(await q('select * from academy_ai.wallets'),before);
 const settings=await q("select kind,credits,model,ceiling_microcad,enabled from academy_ai.activities where kind like 'tcf-speaking-%' order by kind");assert.deepEqual(settings.map(s=>[s.kind,s.credits,s.enabled]),[['tcf-speaking-feedback',1,true],['tcf-speaking-turn',10,true]]);
 assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,3);await db.exec(transaction([],true));assert.deepEqual(await q('select * from academy_ai.wallets'),before);
 // A buffer stopped at zero can upload briefly afterward; late turns are denied.
 const attempt='22222222-2222-4222-8222-222222222222',call='33333333-3333-4333-8333-333333333333';
 await q(`select academy_tcf_speaking_command('${uid}','start','${attempt}')`);
 await db.exec(`update academy_tcf_speaking.attempts set deadline=now()-interval '1 second' where id='${attempt}'`);
 await q(`select academy_tcf_speaking_command('${uid}','lock','${attempt}','{"callId":"${call}","hash":"final-buffer","kind":"turn"}')`);
 await q(`select academy_tcf_speaking_command('${uid}','unlock','${attempt}','{"callId":"${call}"}')`);
 await db.exec(`update academy_tcf_speaking.attempts set deadline=now()-interval '11 seconds' where id='${attempt}'`);
 await assert.rejects(()=>q(`select academy_tcf_speaking_command('${uid}','lock','${attempt}','{"callId":"44444444-4444-4444-8444-444444444444","hash":"late-buffer","kind":"turn"}')`),/Speaking time ended/);
 await db.exec("update academy_ai.activities set enabled=false where kind='conversation'");await assert.rejects(()=>db.exec(transaction([files[1]])),/voice model/);await db.exec('rollback');
 }finally{await db.close()}
});
