import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transcribeFrenchLearnerWav,FRENCH_VERBATIM_PROMPT} from '../supabase/functions/academy-ai/verbatim-transcription.js';
import {transcribeTefWav} from '../supabase/functions/academy-tef-speaking/transcription.js';
import {failureMetadata} from '../supabase/functions/academy-tcf-writing/failures.js';

const audio=Buffer.from('the learner microphone recording').toString('base64');
const examples=[
 'Moi je aller au magasin, euh...',
 'Les école est très important et les personne...',
 'J’ai été, non, je été... je voulais',
 'Si on pouvait euh si je...'
];

test('TEF and TCF speech recognition send only WAV and a neutral verbatim instruction, never task-answer cues',async()=>{
 for(const spoken of examples){
  let requests=0;
  const fetcher=async(url,init)=>{
   requests++;
   assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');
   assert.equal(init.method,'POST');
   assert(init.body instanceof FormData);
   assert.equal(init.body.get('model'),'gpt-transcribe');
   assert.equal(init.body.get('languages[]'),'fr');
   assert.equal(init.body.get('response_format'),'json');
   assert.equal(init.body.get('prompt'),FRENCH_VERBATIM_PROMPT);
   assert.match(init.body.get('prompt'),/ne corrigez pas la grammaire/);
   assert.match(init.body.get('prompt'),/ne complétez jamais/);
   assert.match(init.body.get('prompt'),/hésitations/);
   assert.equal(init.body.get('file').name,'student-response.wav');
   assert.equal(init.body.get('file').size,Buffer.from(audio,'base64').length);
   assert(!init.body.has('task'));assert(!init.body.has('history'));assert(!init.body.has('expected_answer'));
   return Response.json({text:spoken,languages:[{code:'fr'}],usage:{input_tokens:3,output_tokens:5}});
  };
  const raw=await transcribeFrenchLearnerWav({audio,key:'fixture',fetcher});
  assert.equal(raw.transcript,spoken,'Do not complete or fix the returned learner words');
  assert.equal(raw.usage.output_tokens,5);
  const tef=await transcribeTefWav({audio,key:'fixture',fetcher});
  assert.equal(tef.transcript,spoken);
  assert.equal(requests,2);
 }
});

test('Blank/silent recognitions stay blank; no improvised French sentences',async()=>{
 const fetcher=async()=>Response.json({text:'   ',languages:[]});
 assert.equal((await transcribeFrenchLearnerWav({audio,key:'fixture',fetcher})).transcript,'');
});

test('No confidently detected language or oversized transcript cannot be graded as reliable French speech',async()=>{
 const uncertain=async()=>Response.json({text:'Phrase inventée',languages:[]});
 await assert.rejects(()=>transcribeFrenchLearnerWav({audio,key:'fixture',fetcher:uncertain}),err=>failureMetadata(err).code==='TRANSCRIPT_UNCERTAIN');
 const tooLong=async()=>Response.json({text:'mot '.repeat(400)});
 await assert.rejects(()=>transcribeTefWav({audio,key:'fixture',fetcher:tooLong}),err=>failureMetadata(err).code==='TRANSCRIPT_LIMIT');
});

test('Provider failure is never silently replaced with model-corrected or fabricated speech',async()=>{
 await assert.rejects(()=>transcribeFrenchLearnerWav({audio,key:'fixture',fetcher:async()=>Response.json({error:'bad'},{status:400})}),
  err=>failureMetadata(err).code==='PROVIDER_HTTP');
});
