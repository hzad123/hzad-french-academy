import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../supabase/exams/tcf-writing-tests.json' with {type:'json'};
import {WRITING_RESPONSE_FORMAT,WRITING_RESPONSE_SCHEMA} from '../supabase/functions/academy-tcf-writing/response-schema.js';
import {createWritingProvider} from '../supabase/functions/academy-tcf-writing/provider.js';
import {failureMetadata} from '../supabase/functions/academy-tcf-writing/failures.js';
const testPaper=bank.tests[0],responses=[Array(70).fill('Bonjour').join(' '),Array(130).fill('voyage').join(' '),Array(130).fill('travail').join(' ')];
const configuration={model:'gpt-4o-mini',maxOutputTokens:2000};
function feedback(){return {score:12,scoreReason:'Recurring errors limit precision.',criteria:['linguistic','pragmatic','sociolinguistic'].map((id,i)=>({id,evidence:[{task:i+1,quote:responses[i].split(' ')[0]}],reason:'The response conveys the requested information.'})),tasks:[1,2,3].map(number=>({number,onTopic:true,mistakes:[],issues:[]}))}}
function responseFor(value){return Response.json({model:configuration.model,usage:{prompt_tokens:900,completion_tokens:300},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})}
test('native schema recursively requires every object field, forbids additional properties and uses compatible basic types/enums',()=>{
 assert.equal(WRITING_RESPONSE_FORMAT.type,'json_schema');assert.equal(WRITING_RESPONSE_FORMAT.json_schema.strict,true);assert.equal(WRITING_RESPONSE_FORMAT.json_schema.schema,WRITING_RESPONSE_SCHEMA);
 const visit=s=>{
  assert(['object','array','string','integer','boolean'].includes(s.type));
  for(const key of Object.keys(s))assert(['type','properties','required','additionalProperties','items','enum'].includes(key));
  if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(new Set(s.required),new Set(Object.keys(s.properties)));Object.values(s.properties).forEach(visit)}
  if(s.type==='array')visit(s.items);
 };
 visit(WRITING_RESPONSE_SCHEMA);
 assert.deepEqual(WRITING_RESPONSE_SCHEMA.properties.score.enum,Array.from({length:21},(_,i)=>i));
 assert.deepEqual(WRITING_RESPONSE_SCHEMA.properties.tasks.items.properties.number.enum,[1,2,3]);
 assert.deepEqual(WRITING_RESPONSE_SCHEMA.properties.criteria.items.properties.id.enum,['linguistic','pragmatic','sociolinguistic']);
});
test('provider requests strict native shape with the reserved model/output ceiling and processes a valid complete result once',async()=>{
 let calls=0;
 const provider=createWritingProvider({key:'fixture-only',fetcher:async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/chat/completions');const payload=JSON.parse(init.body);
  assert.deepEqual(payload.response_format,WRITING_RESPONSE_FORMAT);assert.equal(payload.model,configuration.model);assert.equal(payload.max_tokens,2000);assert.equal(payload.store,false);
  return responseFor(feedback());
 }});
 const out=await provider.run({test:testPaper,responses},configuration);
 assert.equal(calls,1);assert.equal(out.result.score,12);assert.equal(out.result.nclc,'8');assert.equal(out.result.tasks.length,3);assert.equal(out.usage.total_tokens,undefined);
});
test('native shape never bypasses exact learner evidence verification or triggers an automatic paid repair call',async()=>{
 let calls=0;const raw=feedback();raw.tasks[0].mistakes=[{original:'Never written by learner',corrected:'Different text',explanation:'A supposed rule.'}];
 const provider=createWritingProvider({key:'fixture-only',fetcher:async()=>{calls++;return responseFor(raw)}});
 await assert.rejects(()=>provider.run({test:testPaper,responses},configuration),e=>failureMetadata(e).code==='UNVERIFIED_QUOTE');assert.equal(calls,1);
});
test('missing fields in an unexpected native response still fail server checks without retry',async()=>{
 let calls=0;const raw=feedback();delete raw.tasks[0].onTopic;
 const provider=createWritingProvider({key:'fixture-only',fetcher:async()=>{calls++;return responseFor(raw)}});
 await assert.rejects(()=>provider.run({test:testPaper,responses},configuration),e=>failureMetadata(e).code==='FEEDBACK_FIELDS');assert.equal(calls,1);
});

test('provider reports bounded feedback/task/no-op classifications without retaining learner content',async()=>{
 for(const [mutate,expected] of [
  [r=>r.scoreReason='x'.repeat(601),'FEEDBACK_BOUNDS'],
  [r=>r.tasks[1].number=1,'FEEDBACK_TASKS'],
  [r=>r.criteria[0].id='other','FEEDBACK_CRITERIA'],
  [r=>r.tasks[0].mistakes=[{original:'Bonjour',corrected:'Bonjour',explanation:'No edit.'}],'UNCHANGED_CORRECTION']
 ]){
  const raw=feedback();mutate(raw);let calls=0;
  const provider=createWritingProvider({key:'fixture-only',fetcher:async()=>{calls++;return responseFor(raw)}});
  await assert.rejects(()=>provider.run({test:testPaper,responses},configuration),e=>{const meta=failureMetadata(e);assert.equal(meta.code,expected);assert(!JSON.stringify(meta).includes('Bonjour'));return true});assert.equal(calls,1);
 }
});
