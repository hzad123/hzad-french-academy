import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {TEST} from '../supabase/functions/academy-tcf-speaking/test.js';
import {TESTS,resolveTest,publicTest} from '../supabase/functions/academy-tcf-speaking/bank.js';
import {createSpeakingProvider} from '../supabase/functions/academy-tcf-speaking/provider.js';
import {createSpeakingHandler} from '../supabase/functions/academy-tcf-speaking/handler.js';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
test('20 immutable papers preserve approved Test01, distinct interviews/scenarios/opinions and private briefs',()=>{
 assert.equal(TESTS.length,20);assert.equal(TESTS[0],TEST);
 for(const phase of [0,2,3]){assert.equal(new Set(TESTS.map(t=>t.phases[phase].prompt)).size,20);assert.equal(new Set(TESTS.map(t=>t.phases[phase].opening)).size,20)}
 for(const [i,t] of TESTS.entries()){
  assert.equal(t.id,'tcf-speaking-'+String(i+1).padStart(2,'0'));assert.deepEqual(t.phases.map(p=>p.seconds),[120,120,210,270]);
  assert.match(t.phases[2].role,/CANDIDATE leads/);assert.match(t.phases[3].role,/Do not interrupt/);
  const safe=publicTest(t);assert(!JSON.stringify(safe).includes(t.phases[2].role));assert(safe.phases.every(p=>!('role' in p)));assert.equal(resolveTest(t.id,t.version),t);
 }
 assert.throws(()=>resolveTest('tcf-speaking-21'));assert.throws(()=>resolveTest(TESTS[1].id,TEST.version));
});
test('all20 saved identities select original private scenario for conversation and original paper for grading',async()=>{
 for(const paper of TESTS){let payload;
 const provider=createSpeakingProvider({key:'fixture',fetcher:async(url,init)=>{payload=JSON.parse(init.body);return Response.json({choices:[{message:{content:JSON.stringify({transcript:'Je demande les horaires.',reply:'Bonjour.',intelligible:true,observations:['Audible liaison.']})}}]})}});
 const attempt={test_id:paper.id,version:paper.version,phase:2,calls:[]};await provider.run({kind:'turn',audio:'fixture',attempt},{model:'fixture',maxOutputTokens:2000});
 assert(payload.messages[0].content.includes(paper.phases[2].role));assert.equal(JSON.parse(payload.messages[1].content).task,paper.phases[2].prompt);
 const turns=[0,2,3].map((phase,i)=>({id:'t'+i,phase,kind:'turn',status:'completed',result:{transcript:'Je présente une idée.',intelligible:true,observations:['Clear vowel.']}}));
 let marked;const marker=createSpeakingProvider({key:'fixture',fetcher:async(url,init)=>{marked=JSON.parse(JSON.parse(init.body).messages[1].content);return Response.json({choices:[{message:{content:JSON.stringify({score:12,summary:'Argument incomplete.',criteria:['linguistic','pragmatic','sociolinguistic'].map(id=>({id,turnId:'t0',reason:'Agreement error.',improvement:''}))})}}]})}});
 await marker.run({kind:'feedback',attempt:{...attempt,phase:4,calls:turns}},{model:'fixture',maxOutputTokens:2000});assert.deepEqual(marked.test,paper);
 }
});
test('catalog and saved reads contain only public paper content; request cannot replace saved identity',async()=>{
 const paper=TESTS[19],db={userRpc:async()=>({enabled:true}),adminRpc:async(name,args)=>args.p_action==='list'?[]:{test_id:paper.id,version:paper.version,phase:2,calls:[]}};
 const handler=createSpeakingHandler({authenticate:async()=>({id:alice,email_confirmed_at:'yes'}),db,provider:{ready:()=>true}});
 const get=async(query='')=>(await handler(new Request('https://example.test/'+query,{headers:{Authorization:'Bearer fixture'}}))).json();
 const catalog=await get();assert.equal(catalog.tests.length,20);assert(!JSON.stringify(catalog).includes('Fixed facts'));assert(!JSON.stringify(catalog).includes('private fictional brief'));
 assert.deepEqual((await get('?attempt='+alice)).test,JSON.parse(JSON.stringify(publicTest(paper))));
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({kind:'turn',id:alice,testId:TEST.id,callId:bob,expectedCredits:1,audio:'fixture'})}));assert.equal(response.status,400);
});
test('versioned migration preserves old results and budgets, fixes identity on start/replay/read and protects ownership/prices',async()=>{
 const db=new PGlite();const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
 const cmd=async(user,action,id,payload={})=>(await q('select public.academy_tcf_speaking_command($1,$2,$3,$4) v',[user,action,id,payload]))[0].v;
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now());insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const file of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql','20261109001700_resume_tcf_writing_drafts.sql','20261112002400_tcf_speaking_test01.sql','20261112002600_speaking_final_upload_grace.sql','20261112002700_ai_total_credits_only.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.exec("update academy_ai.activities set enabled=true,credits=10,ceiling_microcad=200000,model='gpt-audio-mini',max_output_tokens=1200 where kind='tcf-speaking-turn'");
 await db.exec(await readFile('supabase/migrations/20261112002800_continuous_speaking_monologue.sql','utf8'));
 const oldId=crypto.randomUUID();await cmd(alice,'start',oldId);const oldCall=crypto.randomUUID();await q("insert into academy_tcf_speaking.calls(id,attempt_id,phase,kind,hash) values($1,$2,3,'turn',$3)",[oldCall,oldId,'b'.repeat(64)]);const before=await q('select to_jsonb(t) v from academy_tcf_speaking.attempts t');const settings=await q('select * from academy_ai.activities order by kind');
 await db.exec('create table academy_ai.testing_grants(reference text,user_id uuid)');
 const snapshotSql=execFileSync('python3',['-c',"import importlib.util;s=importlib.util.spec_from_file_location('papers','scripts/release/speaking-papers.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(m.SNAPSHOT)"],{encoding:'utf8'});const releaseBefore=await q(snapshotSql);
 const file=(await readdir('supabase/migrations')).find(n=>n.endsWith('_speaking_twenty_papers.sql'));const migration=await readFile('supabase/migrations/'+file,'utf8');
 await db.exec(migration.replace('commit;','rollback;'));assert.equal((await q("select count(*)::int n from information_schema.columns where table_schema='academy_tcf_speaking' and table_name='attempts' and column_name='test_id'"))[0].n,0);
 await db.exec(migration);assert.deepEqual(await q(snapshotSql),releaseBefore);
 assert.deepEqual(await q("select to_jsonb(t)-'test_id' v from academy_tcf_speaking.attempts t"),before);assert.deepEqual(await q('select * from academy_ai.activities order by kind'),settings);
 assert.equal((await cmd(alice,'read',oldId)).test_id,TEST.id);
 for(const paper of TESTS){const id=crypto.randomUUID(),payload={testId:paper.id,version:paper.version};const a=await cmd(alice,'start',id,payload);assert.equal(a.test_id,paper.id);assert.equal(a.version,paper.version);assert.equal((await cmd(alice,'start',id,payload)).deadline,a.deadline);await assert.rejects(()=>cmd(bob,'read',id),/not found/);await assert.rejects(()=>cmd(bob,'start',id,payload),/not found/);await assert.rejects(()=>cmd(alice,'start',id,{testId:'tcf-speaking-99',version:paper.version}),/identity/);
 if(paper.id!==TEST.id)await assert.rejects(()=>cmd(alice,'start',id,{testId:TEST.id,version:TEST.version}),/another paper/);
 await assert.rejects(()=>q('update academy_tcf_speaking.attempts set test_id=$1,version=$2 where id=$3',[paper.id===TEST.id?TESTS[1].id:TEST.id,paper.id===TEST.id?TESTS[1].version:TEST.version,id]),/immutable/);
 }
 assert.equal((await cmd(alice,'read',oldId)).calls[0].id,oldCall);
 const list=await cmd(alice,'list');assert(list.every(a=>a.test_id&&a.version));
 const id=crypto.randomUUID();await cmd(alice,'start',id,{testId:TESTS[1].id,version:TESTS[1].version});await db.exec('update academy_ai.policy set enabled=true,included_credits=500');
 await q("update academy_tcf_speaking.attempts set phase=3,deadline=now()+interval'5 seconds' where id=$1",[id]);const armed=await cmd(alice,'begin_monologue',id);assert.equal((await cmd(alice,'begin_monologue',id)).deadline,armed.deadline);assert.equal((await cmd(alice,'read',id)).deadline,armed.deadline);
 const call=crypto.randomUUID(),hash='a'.repeat(64);await cmd(alice,'lock',id,{callId:call,kind:'turn',hash});
 await assert.rejects(()=>q('select public.academy_ai_reserve($1,$2,$3,$4,$5,$6,null,null)',[alice,call,'tcf-speaking-turn','B2',hash,1]),/price|credit|changed/i);
 assert.equal((await q('select count(*)::int n from academy_ai.requests where id=$1',[call]))[0].n,0);
 for(const role of ['anon','authenticated'])assert.equal((await q(`select has_function_privilege('${role}','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') v`))[0].v,false);
 }finally{await db.close()}
});
