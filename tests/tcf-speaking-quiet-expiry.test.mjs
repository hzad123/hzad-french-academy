import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createSpeakingRecorder} from '../src/exams/tcf-speaking/recorder.js';
import {inspectAudio} from '../supabase/functions/academy-ai/contracts.js';
import {encodeWav,audioBase64} from '../src/ai/audio.js';

test('TCF-only energy tolerance accepts quiet genuine French audio and still rejects silence',()=>{
 const samples=Float32Array.from({length:16000},(_,i)=>Math.sin(i*.13)*.0017);
 const quiet=audioBase64(encodeWav(samples,16000));
 assert.throws(()=>inspectAudio(quiet,30),/too quiet/,'Other audio modules keep the existing threshold');
 assert.equal(inspectAudio(quiet,30,{minimumRms:.0007}).seconds,1);
 const silence=audioBase64(encodeWav(new Float32Array(16000),16000));
 assert.throws(()=>inspectAudio(silence,30,{minimumRms:.0007}),/too quiet/);
 const handler=readFileSync('supabase/functions/academy-tcf-speaking/handler.js','utf8');
 assert(handler.includes('minimumRms:.0007'),'Only TCF speaking lowers its server threshold');
});

test('Mobile recorder captures quiet real samples using automatic gain and does not drop them as silence',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const previousAudioContext=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 let processor=null,requested=null,ended=null;
 const node=()=>({connect(){},disconnect(){}});
 class FakeAudioContext {
  sampleRate=16000;
  resume(){return Promise.resolve()}
  close(){return Promise.resolve()}
  createMediaStreamSource(){return node()}
  createScriptProcessor(){processor={...node(),onaudioprocess:null};return processor}
  createGain(){return {...node(),gain:{value:1}}}
  get destination(){return node()}
 }
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeAudioContext});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{
  mediaDevices:{getUserMedia:async options=>{
   requested=options;
   return {getTracks:()=>[{stop(){}}]};
  }}
 }});
 try{
  let result='not called';
  const recorder=createSpeakingRecorder({onLimit:audio=>{result=audio}});
  await recorder.start(1);
  assert.equal(requested.audio.autoGainControl,true);
  assert.equal(requested.audio.noiseSuppression,false);
  for(let frame=0;frame<4;frame++){
   const samples=Float32Array.from({length:4096},(_,i)=>Math.sin((frame*4096+i)*.14)*.0017);
   processor.onaudioprocess({inputBuffer:{getChannelData:()=>samples}});
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert(typeof result==='string'&&result.length>20000,'quiet speech should yield a WAV');
  assert(inspectAudio(result,30,{minimumRms:.0007}).seconds>=.9);
  recorder.dispose();
 }finally{
  if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;
  if(previousAudioContext)Object.defineProperty(globalThis,'AudioContext',previousAudioContext);else delete globalThis.AudioContext;
 }
});

test('TCF task expiry never depends on a successful mic capture or finished examiner request',()=>{
 const ui=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert(ui.includes('function expireTask()'));
 assert(ui.includes('if(!remaining&&!expiring){expiring=true;clearInterval(timer);expireTask()}'));
 assert(ui.includes('if(n===0&&!switching)'),'Two-minute preparation also expires automatically');
 assert(!ui.includes('!remaining&&!busy&&!attempt.pending&&!expiring&&!capture'));
 assert(ui.includes("if(!left()){expireTask();return}"),'Null or silent WAV must advance at zero');
 assert(ui.includes('void beginAnswer(false,true);return;'),'Silent 30-second turn restarts the mic if time remains');
 assert(ui.includes('if(capture&&/too quiet|audible speech|recording too quiet/i.test(e.message'));
 assert(ui.includes('void submit(false,finalWav);'),'End-of-task audio must be saved before advancing');
 assert(ui.includes("store.send({kind:'advance',id:attemptId})"),'Deadline progresses independent of grading');
});

test('Server allows expired TCF phase to advance even with old pending AI call, without clearing its audit row',async()=>{
 const db=new PGlite();
 const alice='11111111-1111-4111-8111-111111111111';
 const q=async(sql,params=[])=> (await db.query(sql,params)).rows;
 const command=async(action,id,payload={})=>(await q('select public.academy_tcf_speaking_command($1,$2,$3,$4) v',
  [alice,action,id,payload]))[0].v;
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
   insert into auth.users values('${alice}',now());
   insert into purchase_entitlements values('${alice}','active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY');`);
  for(const name of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261105001200_mock_exams.sql','20261109001500_tcf_writing.sql','20261112002400_tcf_speaking_test01.sql'])
   await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261119220419_tcf_speaking_expiry_no_audio_deadlock.sql','utf8'));
  const id=crypto.randomUUID(),callId=crypto.randomUUID();
  let result=await command('start',id);
  assert.equal(result.phase,0);
  await command('lock',id,{callId,kind:'turn',hash:'a'.repeat(64)});
  await assert.rejects(()=>command('advance',id),/pending/,'Cannot skip while the clock is running');
  await q("update academy_tcf_speaking.attempts set deadline=now()-interval '2 seconds' where id=$1",[id]);
  result=await command('advance',id);
  assert.equal(result.phase,1,'Expired Task 1 advances despite missing recognized speech');
  assert.equal(result.pending,null);
  assert.equal((await q('select count(*)::int n from academy_tcf_speaking.calls where attempt_id=$1 and id=$2',[id,callId]))[0].n,1);
  await assert.rejects(()=>command('advance',id),/preparation/,'Task 2 preparation cannot be skipped');
  await q("update academy_tcf_speaking.attempts set deadline=now()-interval '2 seconds' where id=$1",[id]);
  result=await command('advance',id);
  assert.equal(result.phase,2);
  await q("update academy_tcf_speaking.attempts set deadline=now()-interval '2 seconds' where id=$1",[id]);
  result=await command('advance',id);
  assert.equal(result.phase,3,'Expired Task 2 moves to Task 3 without a transcript');
  await q("update academy_tcf_speaking.attempts set deadline=now()-interval '2 seconds' where id=$1",[id]);
  result=await command('advance',id);
  assert.equal(result.phase,4,'Test completes even with no recognized audio');
  assert.equal((await q('select count(*)::int n from academy_tcf_speaking.calls where attempt_id=$1',[id]))[0].n,1);
  assert.equal((await q("select has_function_privilege('authenticated','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') flag"))[0].flag,false);
 }finally{await db.close()}
});
