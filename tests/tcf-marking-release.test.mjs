import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
const pending=['20261110002000_owner_testing_budget.sql','20261110002100_tcf_saved_assessment_retry.sql','20261111002200_tcf_feedback_diagnostic_codes.sql'];
function transaction(files,commit=false){
 const result=spawnSync('python3',['-c',`import importlib.util,json
s=importlib.util.spec_from_file_location('release','scripts/release/tcf-marking.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
print(json.dumps(m.transaction(${JSON.stringify(files)},${commit?'True':'False'})))`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
test('release transaction rehearses without writes, preserves student data, grants once, records exact migrations and rejects ambiguous owners',async()=>{
 const db=new PGlite();const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
 insert into auth.users values('${owner}',now()),('${student}',now());
 insert into public.purchase_entitlements select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;
 create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql','20261109001600_fix_tcf_writing_history.sql','20261109001700_resume_tcf_writing_drafts.sql','20261109001800_tcf_writing_sample_format.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 await db.exec(`create table academy_exams.audio_operators(user_id uuid primary key references auth.users(id));alter table academy_exams.audio_operators enable row level security;revoke all on academy_exams.audio_operators from public,anon,authenticated,service_role;insert into academy_exams.audio_operators values('${owner}');
 insert into public.academy_units(id,level,position,title,published) values('a0-01','A0',1,'Preserve',true);
 insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed) values('${owner}','a0-01',3,92,true);
 update academy_ai.policy set enabled=true,included_credits=500,student_cap_microcad=10000000,global_cap_microcad=null;
 select academy_ai.ensure_wallet('${owner}');select academy_ai.ensure_wallet('${student}');`);
 await db.exec(await readFile('supabase/migrations/20261109001900_activate_tcf_writing.sql','utf8'));
 const id=crypto.randomUUID();await q("insert into academy_tcf_writing.attempts(id,user_id,test_id,version,status,responses) values($1,$2,'tcf-writing-01','tcf-writing-2026-11-v2','submitted',$3)",[id,owner,['Keep first answer.','Keep narrative.','Keep opinion.']]);
 await q('select public.academy_ai_reserve($1,$2,$3,$4,$5,$6,null,null)',[owner,id,'tcf-writing','B2','a'.repeat(64),1]);
 await q('select public.academy_ai_claim($1,$2)',[owner,id]);await q('select public.academy_ai_fail($1,$2)',[owner,id]);
 const wallets=await q('select * from academy_ai.wallets order by user_id'),writing=await q('select * from academy_tcf_writing.attempts'),progress=await q('select * from public.academy_learning_progress');
 // Ambiguous private operators stop before migration/account changes.
 await q('insert into academy_exams.audio_operators values($1)',[student]);
 await assert.rejects(()=>db.exec(transaction(pending)),/Resolve the intended owner privately/);await db.exec('rollback');
 await q('delete from academy_exams.audio_operators where user_id=$1',[student]);
 await db.exec(transaction(pending));assert.deepEqual(await q('select * from academy_ai.wallets order by user_id'),wallets);assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n,0);
 assert.equal((await q("select count(*)::int n from information_schema.columns where table_schema='academy_tcf_writing' and column_name='review_id'"))[0].n,0);
 await db.exec(transaction(pending,true));
 const after=await q('select * from academy_ai.wallets order by user_id');assert.equal(after[0].cap_microcad,100000000);assert.equal(after[0].available,wallets[0].available+4500);assert.equal(after[0].spent_microcad,wallets[0].spent_microcad);assert.equal(after[0].expires_at.toISOString(),wallets[0].expires_at.toISOString());
 const {testing_budget_microcad:otherTesting,...other}=after[1];assert.equal(otherTesting,0);assert.deepEqual(other,wallets[1]);
 const newWriting=await q('select * from academy_tcf_writing.attempts');assert.equal(newWriting[0].review_id,null);delete newWriting[0].review_id;assert.deepEqual(newWriting,writing);assert.deepEqual(await q('select * from public.academy_learning_progress'),progress);
 const records=await q('select * from supabase_migrations.schema_migrations order by version');assert.equal(records.length,pending.length);
 for(let i=0;i<pending.length;i++)assert.deepEqual(records[i].statements,[await readFile('supabase/migrations/'+pending[i],'utf8')]);
 await q('select public.academy_tcf_writing_note_failure($1,$2,$3)',[owner,id,{code:'FEEDBACK_BOUNDS'}]);assert.equal((await q('select usage from academy_ai.requests where id=$1',[id]))[0].usage.failure.code,'FEEDBACK_BOUNDS');
 await db.exec(transaction([],true));assert.deepEqual(await q('select * from academy_ai.wallets order by user_id'),after);assert.equal((await q('select count(*)::int n from academy_ai.testing_grants'))[0].n,1);
 }finally{await db.close()}
});
