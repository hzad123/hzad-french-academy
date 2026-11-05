import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {AUDIO_ASSETS,scriptHash} from '../supabase/functions/academy-exam-audio/manifest.js';
import {createAudioAdminHandler} from '../supabase/functions/academy-exam-audio/handler.js';
import {createAudioRenderer} from '../supabase/functions/academy-exam-audio/provider.js';
import {makeAudioAdminStore} from '../src/exams/audio-admin.js';
let db;const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
async function role(name='postgres'){await db.exec('reset role');if(name!=='postgres')await db.exec('set role '+name)}
const cmd=async(user,action,path=null,hash=null,claim=null,data={})=>{await role('service_role');return (await q('select public.academy_exam_audio_command($1,$2,$3,$4,$5,$6) v',[user,action,path,hash,claim,data]))[0].v};
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create schema academy_exams;create table academy_exams.catalog(exam text primary key,version text,audio_reviewed boolean default false,enabled boolean default false,credits integer);
 insert into auth.users values('${owner}',now()),('${student}',now());
 insert into academy_exams.catalog(exam,version) values('tef-canada','tef-canada-hzad-01-20261105'),('tcf-canada','tcf-canada-hzad-01-20261105');`);
 await db.exec(await readFile('supabase/migrations/20261105001400_exam_audio_admin.sql','utf8'));
 await q('insert into academy_exams.audio_operators(user_id) values($1)',[owner]);
});
after(async()=>db?.close());
beforeEach(async()=>{await role();await db.exec("update auth.users set email_confirmed_at=now();update academy_exams.audio_assets set status='pending',claim_id=null,claimed_by=null,claimed_at=null,audio_hash=null,bytes=null,previewed_by=null,previewed_at=null,reviewed_by=null,reviewed_at=null;update academy_exams.catalog set audio_reviewed=false");});
test('the fixed manifest has exactly 79 unique jobs and the seeded hashes match actual provider inputs',async()=>{
 const snapshot=await cmd(owner,'state');assert.equal(snapshot.assets.length,79);assert.equal(AUDIO_ASSETS.length,79);assert.equal(new Set(AUDIO_ASSETS.map(a=>a.path)).size,79);
 for(const asset of AUDIO_ASSETS)assert.equal(snapshot.assets.find(row=>row.path===asset.path).scriptHash,await scriptHash(asset));
});
test('operator capability is pinned server-side; students, anonymous callers and unverified accounts cannot grant it',async()=>{
 await assert.rejects(()=>cmd(student,'state'),/operator permission/);
 for(const roleName of ['anon','authenticated']){await role(roleName);await assert.rejects(()=>q('select * from academy_exams.audio_operators'),/permission denied/);await assert.rejects(()=>q('insert into academy_exams.audio_operators(user_id) values($1)',[student]),/permission denied/);await assert.rejects(()=>q('select public.academy_exam_audio_command($1,$2)',[owner,'state']),/permission denied/)}
 await role();await q('update auth.users set email_confirmed_at=null where id=$1',[owner]);await assert.rejects(()=>cmd(owner,'state'),/operator permission/);
});
test('one claim per asset and one active generation prevent repeat paid calls, even after failures',async()=>{
 const a=AUDIO_ASSETS[0],b=AUDIO_ASSETS[1],hash=await scriptHash(a);await assert.rejects(()=>cmd(owner,'claim',a.path,'a'.repeat(64)),/changed/);
 const claim=await cmd(owner,'claim',a.path,hash);assert.equal(claim.claimed,true);assert.equal((await cmd(owner,'claim',a.path,hash)).claimed,false);assert.equal((await cmd(owner,'claim',b.path,await scriptHash(b))).claimed,false);
 await assert.rejects(()=>cmd(owner,'finish',a.path,hash,crypto.randomUUID(),{sha256:'a'.repeat(64),bytes:1000}),/Invalid recording claim/);
 await cmd(owner,'fail',a.path,hash,claim.id);assert.equal((await cmd(owner,'claim',a.path,hash)).claimed,false);assert.equal((await cmd(owner,'claim',b.path,await scriptHash(b))).claimed,true);
});
test('review requires the immutable audio hash and a preview; all audio approvals alone never enable or price exams',async()=>{
 for(const asset of AUDIO_ASSETS.filter(a=>a.exam==='tcf-canada')){
  const hash=await scriptHash(asset),claim=await cmd(owner,'claim',asset.path,hash);await cmd(owner,'finish',asset.path,hash,claim.id,{sha256:'a'.repeat(64),bytes:2000});
  await assert.rejects(()=>cmd(owner,'review',asset.path,'a'.repeat(64)),/preview/);await assert.rejects(()=>cmd(owner,'preview',asset.path,'b'.repeat(64)),/changed/);
  await cmd(owner,'preview',asset.path,'a'.repeat(64));await cmd(owner,'review',asset.path,'a'.repeat(64));
 }
 await role();const rows=await q('select * from academy_exams.catalog order by exam');assert.equal(rows[0].audio_reviewed,true);assert.equal(rows[1].audio_reviewed,false);assert.ok(rows.every(r=>!r.enabled&&r.credits===null));
});
function fixture({denied=false,fail=false}={}){
 const asset=AUDIO_ASSETS[0];let generated=0,saved=0,status='pending';
 const snapshot=async()=>({assets:[{path:asset.path,exam:asset.exam,ordinal:1,scriptHash:await scriptHash(asset),status,audioHash:status==='ready'?'a'.repeat(64):null,reviewed:false}]});
 const db={command:async args=>{if(denied)throw Error('Audio operator permission required');if(args.p_action==='state')return snapshot();if(args.p_action==='claim'){if(status!=='pending')return {claimed:false};status='generating';return {claimed:true,id:'claim'}}if(args.p_action==='finish'){status='ready';return {saved:true}}if(args.p_action==='fail'){status='failed';return {saved:true}}return {ready:true}}};
 const handler=createAudioAdminHandler({authenticate:async token=>token==='owner'?{id:owner,email_confirmed_at:'yes'}:null,db,storage:{save:async()=>{saved++},signedUrl:async()=> 'https://private.invalid/clip.mp3'},renderer:{ready:()=>true,render:async()=>{generated++;if(fail)throw Error('provider');return new Uint8Array(2000)}},assets:[asset]});
 async function send(input,token='owner'){const response=await handler(new Request('https://test.invalid/audio',{method:input?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://hzad123.github.io'},body:input?JSON.stringify(input):undefined}));return {status:response.status,body:await response.json()}}
 return {send,counts:()=>({generated,saved})};
}
test('handler requires authenticated operator access before touching a model and accepts no custom prompt/key/path jobs',async()=>{
 const denied=fixture({denied:true});assert.equal((await denied.send({action:'generate-next'})).status,403);assert.deepEqual(denied.counts(),{generated:0,saved:0});
 const f=fixture();assert.equal((await f.send(null,'invalid')).status,401);assert.equal((await f.send({action:'generate-next',prompt:'Generate arbitrary content'})).status,400);
 assert.equal((await f.send({action:'generate-next'})).status,200);assert.equal((await f.send({action:'generate-next'})).status,200);assert.deepEqual(f.counts(),{generated:1,saved:1});
});
test('provider failures remain visible and never automatically dispatch or save another paid request',async()=>{
 const f=fixture({fail:true});const failed=await f.send({action:'generate-next'});assert.equal(failed.status,502);assert.equal(failed.body.state.assets[0].status,'failed');await f.send({action:'generate-next'});assert.deepEqual(f.counts(),{generated:1,saved:0});
});
test('TTS uses the fixed model/script, returns bounded audio bytes and never sends learner records',async()=>{
 let input;const renderer=createAudioRenderer({key:'test-placeholder',fetcher:async(_url,init)=>{input=JSON.parse(init.body);return new Response(new Uint8Array(2000),{headers:{'Content-Type':'audio/mpeg'}})}});
 assert.equal((await renderer.render(AUDIO_ASSETS[0])).length,2000);assert.equal(input.model,'gpt-4o-mini-tts');assert.equal(input.input,AUDIO_ASSETS[0].script);assert.ok(!('user' in input));
 const bad=createAudioRenderer({key:'test',fetcher:async()=>new Response('{}',{headers:{'Content-Type':'application/json'}})});await assert.rejects(()=>bad.render(AUDIO_ASSETS[0]),/no recording/);
});
test('admin browser transport uses the existing signed-in session and surfaces permission failures without embedding identities',async()=>{
 let sent;const client={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{access_token:'fixture',expires_at:Date.now()/1000+3600}}})}};
 const call=makeAudioAdminStore(client,async(url,init)=>{sent={url,init};return new Response(JSON.stringify({assets:[],providerReady:true}))});await call({action:'generate-next'});
 assert.equal(sent.init.headers.Authorization,'Bearer fixture');assert.deepEqual(JSON.parse(sent.init.body),{action:'generate-next'});assert.ok(sent.url.endsWith('/academy-exam-audio'));
});
