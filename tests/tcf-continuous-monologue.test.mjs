import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpeakingRecorder} from '../src/exams/tcf-speaking/recorder.js';
import {inspectAudio} from '../supabase/functions/academy-ai/contracts.js';
import {createSpeakingHandler} from '../supabase/functions/academy-tcf-speaking/handler.js';
import {validateSpeakingScore} from '../supabase/functions/academy-tcf-speaking/provider.js';
test('continuous270second PCM capture has no30second callback; one WAV accepted only for Task3',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldContext=globalThis.AudioContext;let processor,submitted=[],stopped=false;
 const node=()=>({connect(){},disconnect(){},gain:{value:0}});
 globalThis.AudioContext=class {sampleRate=16000;resume=async()=>{};close=async()=>{};createMediaStreamSource=node;createGain=node;createScriptProcessor(){processor=node();return processor}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped=true}}]})}}});
 const recorder=createSpeakingRecorder({onLimit:data=>submitted.push(data)});
 try{
 await recorder.start(270);const samples=Float32Array.from({length:16000},(_,i)=>.2*Math.sin(i/8));
 for(let i=0;i<31;i++)processor.onaudioprocess({inputBuffer:{getChannelData:()=>samples}});
 assert(recorder.isRecording());assert.equal(submitted.length,0);
 for(let i=31;i<270;i++)processor.onaudioprocess({inputBuffer:{getChannelData:()=>samples}});
 await Promise.resolve();assert.equal(submitted.length,1);assert.equal(inspectAudio(submitted[0],270).seconds,270);assert.throws(()=>inspectAudio(submitted[0]),/30 seconds/);
 let phase=3;const user='11111111-1111-4111-8111-111111111111';
 const handler=createSpeakingHandler({authenticate:async()=>({id:user,email_confirmed_at:'yes'}),db:{adminRpc:async name=>name==='academy_ai_reserve'?{status:'completed'}:{id:user,phase,calls:[]}},provider:{ready:()=>true}});
 const send=()=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({kind:'turn',id:user,callId:crypto.randomUUID(),expectedCredits:10,audio:submitted[0]})}));
 assert.equal((await send()).status,200);phase=2;assert.notEqual((await send()).status,200);
 }finally{recorder.dispose();globalThis.AudioContext=oldContext;if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator}
 assert(stopped);
});
test('blank transcripts identify missing tasks instead of silently hiding total scores',()=>{
 const turns=[0,2,3].map((phase,i)=>({id:String(i),phase,transcript:phase===3?'':'Je présente mon avis.',intelligible:true,observations:[]}));
 const raw={score:12,summary:'Task3 could not be assessed.',criteria:['linguistic','pragmatic','sociolinguistic'].map(id=>({id,turnId:'0',reason:'Missing argument evidence.',improvement:''}))};
 const missing=validateSpeakingScore(raw,turns);assert.equal(missing.score,null);assert.deepEqual(missing.missingTasks,[3]);
 turns[2].transcript='Je défends cette opinion avec un exemple.';const complete=validateSpeakingScore(raw,turns);assert.equal(complete.score,12);assert.equal(complete.nclc,'8');
});
