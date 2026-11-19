import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examinerVoiceNeedsTap,createFrenchVoicePlayer} from '../src/exams/tef-speaking/voice.js';
import {transcribeFrenchLearnerWav} from '../supabase/functions/academy-ai/verbatim-transcription.js';
import {failureMetadata} from '../supabase/functions/academy-tcf-writing/failures.js';
const audio=Buffer.from('a valid French speech WAV fixture').toString('base64');

test('Rejected gpt-transcribe request retries once using compatible mini ASR without changing student words',async()=>{
 const words='Je aller au magasin et euh je...';
 const models=[];
 const result=await transcribeFrenchLearnerWav({audio,key:'test-only',fetcher:async(url,opts)=>{
  assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');
  const form=opts.body,model=form.get('model');models.push(model);
  assert.equal(form.get('prompt').includes('ne corrigez pas la grammaire'),true);
  if(model==='gpt-transcribe'){
   assert.equal(form.get('languages[]'),'fr');assert.equal(form.get('language'),null);
   return Response.json({error:{code:'invalid_request_error'}},{status:400});
  }
  assert.equal(model,'gpt-4o-mini-transcribe');assert.equal(form.get('language'),'fr');
  assert.equal(form.get('languages[]'),null);
  return Response.json({text:words});
 }});
 assert.deepEqual(models,['gpt-transcribe','gpt-4o-mini-transcribe']);
 assert.equal(result.model,'gpt-4o-mini-transcribe');
 assert.equal(result.transcript,words);
});
test('Rate limits and provider 5xx never trigger a second billable transcription request',async()=>{
 for(const status of [401,403,429,500,503]){
  let count=0;
  await assert.rejects(
   ()=>transcribeFrenchLearnerWav({audio,key:'test-only',fetcher:async()=>{count++;return Response.json({error:{code:'rate_limit_exceeded'}},{status})}}),
   error=>failureMetadata(error).code==='PROVIDER_HTTP'
  );
  assert.equal(count,1);
 }
});
test('mobile speaking primes voice on Start, attempts auto-play and retains replay only as recovery',()=>{
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',maxTouchPoints:5}),true);
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',maxTouchPoints:0}),false);
 const tef=readFileSync('src/exams/tef-speaking/ui.js','utf8');
 const tcf=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert(!tef.includes('examinerVoiceNeedsTap()&&!fromTap'),'TEF must not require tap on each turn');
 assert(!tcf.includes('examinerVoiceNeedsTap()&&!fromTap'),'TCF must not require tap on each turn');
 assert(tef.includes('voiceInstance().unlock();void startTest()'));
 assert(tcf.includes('voice().unlock(); // synchronous'));
 assert(tef.includes('Réécouter l’interlocuteur'));
 assert(tcf.includes('Réécouter l’interlocuteur'));
 assert(tcf.includes('played=await speak(question)'));
});
test('Task 2 shows dedicated preparation before examiner questions/recording and advances after 120 seconds',()=>{
 const ui=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert(ui.includes('else if(attempt.phase===1)'));
 assert(ui.includes("prep.dataset.tcfPreparation='true'"));
 assert(ui.includes("progress.max=120"));
 assert(ui.includes("if(n===0&&!switching)"));
 assert(ui.includes("switching=true;clearInterval(timer);advance()"));
 assert(ui.includes('No examiner questions, audio or microphone recording occur during this preparation.'));
 assert(ui.includes('Read the instructions before you begin'));
 const tests=readFileSync('supabase/functions/academy-tcf-speaking/test.js','utf8');
 assert(tests.includes("name:'Task 2 · Preparation',seconds:120"));
 assert(tests.includes("name:'Task 2 · Information role-play',seconds:210"));
});
test('One initial tap synchronously unlocks speech synthesis and later spoken turns can play without more taps',async()=>{
 const calls=[];
 class FakeUtterance {constructor(v){this.text=v}}
 const synth={cancel(){},resume(){},getVoices:()=>[],speak(u){calls.push(u.text);queueMicrotask(()=>u.onend?.())}};
 const player=createFrenchVoicePlayer({synthesis:synth,Utterance:FakeUtterance});
 assert.equal(player.unlock(),true);
 assert.equal(calls.length,1,'Silent unlock should run directly in the Start click');
 const pending=player.speak('Bonjour. Quelles questions avez-vous ?');
 assert.equal(calls.length,2);
 assert.equal(await pending,true);
 assert.equal(player.unlock(),true);
 assert.equal(calls.length,2,'Do not prime and interrupt on every new turn');
 player.dispose();
});
test('iPhone speaker is invoked synchronously before the first await',async()=>{
 let started=false;
 class FakeUtterance {constructor(v){this.text=v}}
 const synth={cancel(){},resume(){},getVoices:()=>[],speak(utterance){started=true;queueMicrotask(()=>utterance.onend())}};
 const player=createFrenchVoicePlayer({synthesis:synth,Utterance:FakeUtterance});
 const pending=player.speak('Bonjour, comment allez-vous ?');
 assert.equal(started,true,'Speech must start inside the tap event stack');
 assert.equal(await pending,true);
 player.dispose();
});
