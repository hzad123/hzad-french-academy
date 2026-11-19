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
test('iOS uses explicit tap, desktop retains automatic examiner playback',()=>{
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',maxTouchPoints:5}),true);
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)',maxTouchPoints:5}),true);
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',maxTouchPoints:5}),true);
 assert.equal(examinerVoiceNeedsTap({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',maxTouchPoints:0}),false);
 const tef=readFileSync('src/exams/tef-speaking/ui.js','utf8');
 const tcf=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert(tef.includes('beginAnswer(true)'));assert(tef.includes('examinerVoiceNeedsTap()&&!fromTap'));
 assert(tcf.includes('beginAnswer(true,true)'));assert(tcf.includes('examinerVoiceNeedsTap()&&!fromTap'));
 assert(tef.includes('Écouter l’interlocuteur puis répondre'));
 assert(tcf.includes('Écouter l’interlocuteur puis répondre'));
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
