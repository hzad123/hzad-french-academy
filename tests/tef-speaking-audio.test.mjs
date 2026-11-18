import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/ai/audio.js';
import {inspectAudio} from '../supabase/functions/academy-ai/contracts.js';
import {createSpeakingRecorder} from '../src/exams/tcf-speaking/recorder.js';
import {createFrenchVoicePlayer} from '../src/exams/tef-speaking/voice.js';
const wav=seconds=>Buffer.from(encodeWav(Float32Array.from({length:Math.round(16000*seconds)},(_,i)=>Math.sin(i/7)*.12),16000)).toString('base64');
test('TEF section clips use safe WAV audio; silent, missing or overlong clips cannot be sent as paid turns',()=>{
 assert(Math.abs(inspectAudio(wav(10),30).seconds-10)<.01);
 assert.throws(()=>inspectAudio(wav(31),30),/30 seconds/);
 assert.throws(()=>inspectAudio('not wav',30));
 assert.throws(()=>inspectAudio(Buffer.from(encodeWav(new Float32Array(16000),16000)).toString('base64'),30),/quiet/);
});
test('Microphone denied: clean failure with closed AudioContext, no expensive inference',async()=>{
 const prevNav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),prevContext=globalThis.AudioContext;
 let closed=false;
 globalThis.AudioContext=class{resume=async()=>{};close=async()=>{closed=true}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{throw Error('Permission denied')}}}});
 const recorder=createSpeakingRecorder();
 try{await assert.rejects(()=>recorder.prepare(),/Permission denied/);assert.equal(closed,true);assert.equal(recorder.isRecording(),false)}
 finally{recorder.dispose();globalThis.AudioContext=prevContext;
  if(prevNav)Object.defineProperty(globalThis,'navigator',prevNav);else delete globalThis.navigator}
});
test('TEF browser voice prefers fr-CA and returns a visible fallback when speech is unavailable',async()=>{
 let selectedVoice=null;
 class FakeUtterance{constructor(text){this.text=text}}
 const voices=[{name:'English',lang:'en-US'},{name:'French France',lang:'fr-FR'},{name:'French Canada',lang:'fr-CA'}];
 const synth={getVoices:()=>voices,cancel(){},speak(utterance){selectedVoice=utterance.voice;queueMicrotask(()=>utterance.onend())}};
 const voice=createFrenchVoicePlayer({synthesis:synth,Utterance:FakeUtterance});
 assert.equal(voice.selectedVoice(),'French Canada');
 assert.equal(await voice.speak('Bonjour, pouvez-vous préciser le tarif ?'),true);
 assert.equal(selectedVoice.name,'French Canada');voice.dispose();
 const unavailable=createFrenchVoicePlayer({synthesis:null,Utterance:null});
 assert.equal(await unavailable.speak('Bonjour'),false);unavailable.dispose();
});


test('a real 30-second French speaking WAV reaches the AI provider without counting audio against text-only 54 KB limit',async()=>{
 const {createTefSpeakingProvider}=await import('../supabase/functions/academy-tef-speaking/provider.js');
 const {BANK}=await import('../supabase/functions/academy-tef-speaking/bank.js');
 const {audioBase64}=await import('../src/ai/audio.js');
 const samples=Float32Array.from({length:16000*30},(_,i)=>Math.sin(i/13)*0.18);
 const audio=audioBase64(encodeWav(samples,16000));
 assert(audio.length>1_000_000,'Real 30-second WAV exceeds 1 MB in base64');
 assert.equal(inspectAudio(audio,30).seconds,30);
 let calls=0;
 const provider=createTefSpeakingProvider({key:'fixture',fetcher:async(url,opts)=>{
  calls++;
  if(url.endsWith('/audio/transcriptions')){
   assert.equal(opts.body.get('model'),'gpt-transcribe');
   assert.equal(opts.body.get('file').size,960044);
   return Response.json({text:'Bonjour, pourriez-vous préciser les horaires de la visite ?'});
  }
  assert.equal(url,'https://api.openai.com/v1/chat/completions');
  const body=JSON.parse(opts.body);
  assert(!JSON.stringify(body).includes('input_audio'));
  assert(body.messages[0].content.includes('français'));
  assert.equal(body.max_tokens,1500);
  return Response.json({model:'gpt-audio-mini',usage:{prompt_tokens:350,completion_tokens:120},
   choices:[{message:{content:JSON.stringify({
    transcript:'Fabricated transcript must be ignored',
    reply:'Les visites ont lieu le samedi matin.',
    intelligible:true,questionAsked:true,observations:[]})}}]});
 }});
 const attempt={test_id:BANK.tests[0].id,version:BANK.version,phase:0,calls:[]};
 const result=await provider.run({kind:'turn',audio,attempt},{model:'gpt-audio-mini',maxOutputTokens:1500});
 assert.equal(calls,2,'Dedicated ASR and one examiner call');
 assert.equal(result.result.transcript,'Bonjour, pourriez-vous préciser les horaires de la visite ?');
 assert.equal(result.result.intelligible,true);
 assert.equal(result.result.questionAsked,true);
 assert.match(result.result.reply,/samedi/);
});
test('large transcript history still triggers a safe text-context error without sending private audio',async()=>{
 const {createTefSpeakingProvider}=await import('../supabase/functions/academy-tef-speaking/provider.js');
 const {BANK}=await import('../supabase/functions/academy-tef-speaking/bank.js');
 const {failureMetadata}=await import('../supabase/functions/academy-tcf-writing/failures.js');
 let calls=0;
 const provider=createTefSpeakingProvider({key:'fixture',fetcher:async()=>{calls++;throw Error('Should not call provider');}});
 const prior=Array.from({length:8},(_,i)=>({
  id:'11111111-1111-4111-8111-'+String(i).padStart(12,'0'),
  kind:'turn',status:'completed',phase:0,
  result:{transcript:'Parole longue '.repeat(650),reply:'Réponse en français.',intelligible:true,questionAsked:true}
 }));
 const attempt={test_id:BANK.tests[0].id,version:BANK.version,phase:0,calls:prior};
 let code=null;
 try{await provider.run({kind:'turn',audio:'fixture',attempt},{model:'gpt-audio-mini',maxOutputTokens:1500})}
 catch(err){code=failureMetadata(err).code}
 assert.equal(code,'CONTEXT_LIMIT');
 assert.equal(calls,0);
});
