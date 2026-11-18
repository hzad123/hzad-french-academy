import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BANK} from '../supabase/functions/academy-tef-speaking/bank.js';
import {createTefSpeakingProvider,normalizeTefSpeakingTurn} from '../supabase/functions/academy-tef-speaking/provider.js';
import {failureMetadata} from '../supabase/functions/academy-tcf-writing/failures.js';
const paper=BANK.tests[0];
const attempt=phase=>({test_id:paper.id,version:paper.version,phase,calls:[]});
const full={transcript:'Bonjour, pourriez-vous préciser les horaires ?',reply:'Nous ouvrons samedi matin.',intelligible:true,questionAsked:true,observations:['Articulation intelligible.']};
function fakeResponse(value,tool=true){
 return Response.json({model:'gpt-audio-mini',usage:{prompt_tokens:123,completion_tokens:84},choices:[{message:tool?
  {tool_calls:[{id:'call_fixture',type:'function',function:{name:'submit_tef_speaking_turn',arguments:JSON.stringify(value)}}]}:
  {content:JSON.stringify(value)}}]});
}
test('GPT Audio mini turn uses a forced named function and returns a grounded French transcript and reply',async()=>{
 let calls=0;
 const provider=createTefSpeakingProvider({key:'fixture',fetcher:async(_url,opts)=>{
  calls++;const body=JSON.parse(opts.body);
  assert.equal(body.tool_choice.function.name,'submit_tef_speaking_turn');
  assert.equal(body.tools[0].function.name,'submit_tef_speaking_turn');
  assert.deepEqual(body.tools[0].function.parameters.required,['transcript','reply','intelligible','questionAsked','observations']);
  assert.equal(body.parallel_tool_calls,false);
  assert.equal(body.modalities[0],'text');
  assert(body.messages.at(-1).content[0].input_audio);
  return fakeResponse(full,true);
 }});
 const res=await provider.run({kind:'turn',attempt:attempt(0),audio:'fixture'}, {model:'gpt-audio-mini',maxOutputTokens:2000});
 assert.equal(calls,1);
 assert.equal(res.result.transcript,full.transcript);
 assert.equal(res.result.reply,full.reply);
 assert.equal(res.result.questionAsked,true);
});
test('optional malformed or blank acoustic observations do not invalidate the entire paid TEF speaking turn',()=>{
 const res=normalizeTefSpeakingTurn({...full,observations:[null,'  ','Prononciation claire.',67,'Débit régulier.']},0);
 assert.deepEqual(res.observations,['Prononciation claire.','Débit régulier.']);
 assert.equal(normalizeTefSpeakingTurn({...full,observations:null},0).observations.length,0);
 assert.equal(normalizeTefSpeakingTurn({...full,questionAsked:'oui'},0).questionAsked,false);
 assert.equal(normalizeTefSpeakingTurn(full,2).questionAsked,false);
});
test('invalid model output is categorized precisely; no fabricated transcript or examiner reply',async()=>{
 for(const [bad,code] of [
  [{...full,intelligible:'yes'},'INVALID_TURN_SHAPE'],
  [{...full,transcript:''},'TRANSCRIPT_MISSING'],
  [{...full,reply:'  '},'EXAMINER_REPLY_MISSING'],
 ]){
  const provider=createTefSpeakingProvider({key:'fixture',fetcher:async()=>fakeResponse(bad)});
  let actual=null;
  try{await provider.run({kind:'turn',attempt:attempt(0),audio:'fixture'},{model:'gpt-audio-mini',maxOutputTokens:2000})}
  catch(error){actual=failureMetadata(error).code}
  assert.equal(actual,code);
 }
});
test('explicit silence result is saved without inventing words; examiner can ask to repeat',()=>{
 const result=normalizeTefSpeakingTurn({transcript:'',reply:'Pourriez-vous répéter, s’il vous plaît ?',intelligible:false,questionAsked:false,observations:[]},0);
 assert.equal(result.transcript,'');
 assert.equal(result.questionAsked,false);
});
test('JSON content-only legacy responses remain accepted without secondary billable AI requests',async()=>{
 let calls=0;
 const provider=createTefSpeakingProvider({key:'fixture',fetcher:async()=>{calls++;return fakeResponse(full,false)}});
 const result=await provider.run({kind:'turn',attempt:attempt(0),audio:'fixture'},{model:'gpt-audio-mini',maxOutputTokens:2000});
 assert.equal(calls,1);
 assert.equal(result.result.reply,full.reply);
});
