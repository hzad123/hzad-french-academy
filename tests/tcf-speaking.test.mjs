import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {TEST,speakingNclc} from '../supabase/functions/academy-tcf-speaking/test.js';
import {createSpeakingProvider,validateSpeakingScore} from '../supabase/functions/academy-tcf-speaking/provider.js';
import {createSpeakingHandler} from '../supabase/functions/academy-tcf-speaking/handler.js';
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const turns=[0,2,3].map((phase,i)=>({id:'turn-'+i,phase,transcript:'Je présente mon avis avec un exemple.',reply:'Pourquoi ?',intelligible:true,observations:['The /y/ vowel was audibly rounded.']}));
const raw=()=>({score:12,summary:'The argument needs a developed example.',criteria:['linguistic','pragmatic','sociolinguistic'].map((id,i)=>({id,turnId:turns[i].id,reason:'The observed error limits precision.',improvement:'Develop the concrete example in Task3.'}))});
test('TCF Test01 has correct interaction roles,720seconds and speaking-specific NCLC boundaries',()=>{
 assert.deepEqual(TEST.phases.map(p=>p.seconds),[120,120,210,270]);assert.equal(TEST.phases.reduce((n,p)=>n+p.seconds,0),720);assert.match(TEST.phases[2].role,/CANDIDATE leads/);assert.match(TEST.phases[3].role,/Do not interrupt/);
 const values=['Below 4','Below 4','Below 4','Below 4','4','4','5','6','6','6','7','7','8','8','9','9','10+','10+','10+','10+','10+'];for(let n=0;n<=20;n++)assert.equal(speakingNclc(n),values[n]);assert.throws(()=>speakingNclc(12.5));
});
test('holistic score and criterion feedback derive evidence from actual saved voice observations, not model quotes',()=>{
 const out=validateSpeakingScore(raw(),turns);assert.equal(out.score,12);assert.equal(out.nclc,'8');assert.equal(out.criteria[0].evidence,turns[0].transcript);assert.deepEqual(out.criteria[0].audioEvidence,turns[0].observations);
 const invalid=raw();invalid.criteria[0].turnId='invented';assert.throws(()=>validateSpeakingScore(invalid,turns));const partial=raw();partial.criteria.forEach(c=>c.turnId=turns[0].id);assert.equal(validateSpeakingScore(partial,turns.map(t=>t.phase===2?{...t,intelligible:false}:t)).score,null);
});
test('audio interlocutor receives real WAV input and suppresses early Task3 interruptions without retry',async()=>{
 let calls=0;const provider=createSpeakingProvider({key:'fixture',fetcher:async(url,init)=>{calls++;const p=JSON.parse(init.body);assert.equal(p.store,false);assert.equal(p.model,'audio-test');assert(p.messages.at(-1).content[0].input_audio);return Response.json({choices:[{message:{content:JSON.stringify({transcript:'Je pense que les langues sont utiles.',reply:'Pourquoi ?',intelligible:true,observations:['The liaison is audible.']})}}]})}});
 const out=await provider.run({kind:'turn',audio:'fixture',attempt:{phase:3,calls:[]}},{model:'audio-test',maxOutputTokens:1200});assert.equal(out.result.reply,'');assert.equal(calls,1);
});
test('speaking handler rejects unauthenticated, cross-origin, forged score and fake audio before dispatch',async()=>{
 let dispatch=0;const handler=createSpeakingHandler({authenticate:async()=>({id:alice,email_confirmed_at:'yes'}),db:{adminRpc:async()=>({phase:0,calls:[]})},provider:{ready:()=>true,run:()=>{dispatch++}}});
 const request=(payload,headers={Authorization:'Bearer fixture'})=>handler(new Request('https://example.test',{method:'POST',headers,body:JSON.stringify(payload)}));
 assert.equal((await request({},{})).status,401);assert.equal((await request({},{Origin:'https://evil.test'})).status,403);
 assert.equal((await request({kind:'feedback',id:alice,score:20})).status,400);await request({kind:'turn',id:alice,callId:bob,expectedCredits:10,audio:'not audio'});assert.equal(dispatch,0);
});
test('speaking migration preserves writing/progress, restricts ownership, enforces prep/timers and reconciles a paid result once',async()=>{
 const db=new PGlite();const q=async(s,p=[])=> (await db.query(s,p)).rows;const cmd=async(user,action,id,payload={})=>(await q('select public.academy_tcf_speaking_command($1,$2,$3,$4) v',[user,action,id,payload]))[0].v;
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);insert into auth.users values('${alice}',now()),('${bob}',now());insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users;`);
 for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 const before=await q('select * from academy_ai.activities order by kind');await db.exec(await readFile('supabase/migrations/20261112002400_tcf_speaking_test01.sql','utf8'));
 assert.deepEqual(await q("select * from academy_ai.activities where kind not like 'tcf-speaking-%' order by kind"),before);
 assert.equal((await q("select count(*)::int n from academy_ai.activities where kind like 'tcf-speaking-%' and enabled"))[0].n,0);
 assert.equal((await q("select has_function_privilege('authenticated','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') allowed"))[0].allowed,false);
 const id=crypto.randomUUID();let a=await cmd(alice,'start',id);assert.equal(a.phase,0);await assert.rejects(()=>cmd(bob,'read',id),/not found/);await assert.rejects(()=>cmd(alice,'advance',id),/Record/);
 await q("update academy_tcf_speaking.attempts set deadline=now()-interval'1 second' where id=$1",[id]);a=await cmd(alice,'advance',id);assert.equal(a.phase,1);await assert.rejects(()=>cmd(alice,'advance',id),/preparation/);
 await q("update academy_tcf_speaking.attempts set deadline=now()-interval'1 second' where id=$1",[id]);a=await cmd(alice,'advance',id);assert.equal(a.phase,2);
 await db.exec("update academy_ai.policy set enabled=true,included_credits=500;update academy_ai.activities set enabled=true,credits=10,ceiling_microcad=200000,model='fixture',max_output_tokens=1200 where kind='tcf-speaking-turn'");
 const call=crypto.randomUUID(),hash='a'.repeat(64);await cmd(alice,'lock',id,{callId:call,kind:'turn',hash});await assert.rejects(()=>cmd(alice,'advance',id),/pending/);
 await q('select public.academy_ai_reserve($1,$2,$3,$4,$5,$6,null,null)',[alice,call,'tcf-speaking-turn','B2',hash,10]);await q('select public.academy_ai_claim($1,$2)',[alice,call]);
 await q('select public.academy_ai_finish($1,$2,$3,$4,null)',[alice,call,{transcript:'Bonjour',reply:'Bienvenue',intelligible:true,observations:['Clear audible greeting.']},{total_tokens:100}]);
 a=await cmd(alice,'read',id);assert.equal(a.pending,null);assert.equal(a.calls[0].result.reply,'Bienvenue');const deadline=a.deadline;a=await cmd(alice,'read',id);assert.equal(a.deadline,deadline);assert.equal((await q("select count(*)::int n from academy_ai.ledger where request_id=$1 and event='charge'",[call]))[0].n,1);
 await cmd(alice,'advance',id);await assert.rejects(()=>cmd(alice,'lock',id,{callId:call,kind:'turn',hash:'b'.repeat(64)}),/already used/);
 }finally{await db.close()}
});
test('public speaking catalogue excludes examiner role briefs and fixed answer facts',async()=>{
 const handler=createSpeakingHandler({authenticate:async()=>({id:alice,email_confirmed_at:'yes'}),db:{userRpc:async()=>({enabled:true,activities:{},wallet:{}}),adminRpc:async()=>[]},provider:{ready:()=>true}});
 const response=await handler(new Request('https://example.test',{headers:{Authorization:'Bearer fixture'}}));assert.equal(response.status,200);const catalog=await response.json();assert.equal(catalog.test.phases.length,4);assert(catalog.test.phases.every(p=>!Object.hasOwn(p,'role')));assert(!JSON.stringify(catalog).includes('CAD240'));
});
test('server derives WAV duration, rejects excess speaking seconds, and permits a cached replay without dispatch',async()=>{
 const {encodeWav}=await import('../src/ai/audio.js');const samples=Float32Array.from({length:16000},(_,i)=>Math.sin(i/5)*.2);const audio=Buffer.from(encodeWav(samples,16000)).toString('base64');
 let calls=0,used=120,replay=false;const callId=crypto.randomUUID();const attempt=()=>({id:alice,phase:0,calls:[{id:replay?callId:bob,phase:0,kind:'turn',status:'completed',result:{seconds:used}}]});
 const handler=createSpeakingHandler({authenticate:async()=>({id:alice,email_confirmed_at:'yes'}),db:{adminRpc:async name=>{if(name==='academy_tcf_speaking_command')return attempt();if(name==='academy_ai_reserve')return {status:'completed'};throw Error('Unexpected dispatch')}},provider:{ready:()=>true,run:async()=>{calls++}}});
 const send=()=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({kind:'turn',id:alice,callId,audio,expectedCredits:10})}));
 assert.equal((await send()).status,409);assert.equal(calls,0);replay=true;assert.equal((await send()).status,200);assert.equal(calls,0);
});
