import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../supabase/exams/tcf-writing-tests.json' with {type:'json'};
import {buildWritingSources,resolveWritingSources,NO_WRITING_EVIDENCE} from '../supabase/functions/academy-tcf-writing/sources.js';
import {createWritingResponseFormat} from '../supabase/functions/academy-tcf-writing/response-schema.js';
import {assessmentMessages} from '../supabase/functions/academy-tcf-writing/scoring.js';
import {createWritingProvider} from '../supabase/functions/academy-tcf-writing/provider.js';
import {failureMetadata} from '../supabase/functions/academy-tcf-writing/failures.js';
const paper=bank.tests[0],configuration={model:'gpt-4o-mini',maxOutputTokens:2000};
const responses=["J’ai déjà visité Montréal. Je suis aller au musée. "+Array(62).fill('bonjour').join(' '),Array(125).fill('voyage').join(' '),Array(125).fill('travail').join(' ')];
function feedback(answers=responses){
 const groups=buildWritingSources(answers),sourceId=groups.flatMap(g=>g.sources)[0]?.sourceId||NO_WRITING_EVIDENCE;
 return {score:answers.some(s=>s.trim())?12:0,scoreReason:'The comparison and agreement errors limit the band.',criteria:['linguistic','pragmatic','sociolinguistic'].map(id=>({id,evidence:{sourceId},reason:'The cited response contains a criterion-specific gap.',improvement:'Make the cited change in this task.'})),tasks:[1,2,3].map(number=>({number,onTopic:true,mistakes:[],issues:[]}))};
}
function providerFor(value,onCall=()=>{}){return createWritingProvider({key:'source-fixture-only',fetcher:async(_url,init)=>{onCall(JSON.parse(init.body));return Response.json({model:configuration.model,usage:{prompt_tokens:900,completion_tokens:300},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})}})}

test('source segmentation is deterministic, bounded and exactly preserves Unicode, repetition and source order',()=>{
 const text=('a'.repeat(159)+'😀’e\u0301 '+('bonjour '.repeat(460))).slice(0,3500);
 const other=('x'.repeat(120)+' ').repeat(30).slice(0,3000),groups=buildWritingSources([text,other,'']);
 assert.deepEqual(groups,buildWritingSources([text,other,'']));
 assert(groups.flatMap(g=>g.sources).length<=60);
 for(const [index,original] of [text,other].entries()){
  assert.equal(groups[index].sources.map(s=>s.text).join(''),original);
  for(const s of groups[index].sources){assert(s.text.length<=160);assert(original.includes(s.text));assert(!/[\uD800-\uDBFF]$/.test(s.text));assert.match(s.sourceId,new RegExp('^t'+(index+1)+'-s[1-9][0-9]*$'))}
 }
 assert.deepEqual(groups[2].sources,[]);
 const repeated=buildWritingSources(['abc '.repeat(100),'abc '.repeat(100),''])[0].sources;
 assert.equal(new Set(repeated.map(s=>s.sourceId)).size,repeated.length);
 const spaced=' '.repeat(320)+'Bonjour'+ ' '.repeat(320),spacedSources=buildWritingSources([spaced,'',''])[0].sources;assert.equal(spacedSources.map(s=>s.text).join(''),spaced);
 const eligible=createWritingResponseFormat([spaced,'','']).json_schema.schema.properties.criteria.items.properties.evidence.properties.sourceId.enum;assert(spacedSources.filter(s=>!s.text.trim()).every(s=>!eligible.includes(s.sourceId))); 
});

test('the native prompt includes exact source chunks once rather than duplicate raw responses, with raw word counts retained',()=>{
 const message=JSON.parse(assessmentMessages(paper,responses)[1].content);
 assert.deepEqual(message.responses,buildWritingSources(responses));assert.equal(message.wordCounts[0].words,responses[0].trim().split(/\s+/u).length);
 assert.equal(message.responses[0].sources.map(s=>s.text).join(''),responses[0]);
 assert(!message.responses.some(r=>typeof r==='string'));
 const format=createWritingResponseFormat(responses),ids=buildWritingSources(responses).flatMap(g=>g.sources.map(s=>s.sourceId));
 assert.deepEqual(format.json_schema.schema.properties.criteria.items.properties.evidence.properties.sourceId.enum,ids);
 assert.deepEqual(format.json_schema.schema.properties.tasks.items.properties.mistakes.items.properties.sourceId.enum,ids);
 assert.equal(format.json_schema.schema.properties.criteria.items.properties.evidence.type,'object');
});

test('source IDs produce exact saved evidence and genuine corrections despite smart apostrophes and decomposed accents',async()=>{
 const native=feedback(),source=buildWritingSources(responses)[0].sources[0];
 native.tasks[0].mistakes=[{sourceId:source.sourceId,corrected:source.text.trim().replace('aller','allé'),explanation:'Use the past participle after être.'}];
 let calls=0;const provider=providerFor(native,payload=>{calls++;assert.deepEqual(payload.response_format,createWritingResponseFormat(responses));assert.equal(payload.max_tokens,2000);assert.equal(payload.model,configuration.model);assert.equal(payload.store,false)});
 const result=await provider.run({test:paper,responses},configuration);
 assert.equal(calls,1);assert.equal(result.result.score,12);assert.equal(result.result.nclc,'8');
 assert.equal(result.result.criteria[0].evidence[0].quote,source.text.trim());
 assert.equal(result.result.tasks[0].mistakes[0].original,source.text.trim());
 assert(result.result.tasks[0].mistakes[0].original.includes('J’ai déjà'));
 assert(result.result.tasks[0].mistakes[0].corrected.includes('allé'));
});

test('unknown, wrong-task and AI-copied quote fallbacks are rejected without paid repair calls',async()=>{
 const otherId=buildWritingSources(responses)[1].sources[0].sourceId;
 const cases=[
  raw=>{raw.criteria[0].evidence.sourceId='made-up-source'},
  raw=>{raw.criteria[0].evidence={task:1,quote:'J’ai déjà'}},
  raw=>{raw.criteria[0].evidence.quote='AI-copied text'},
  raw=>{raw.tasks[0].mistakes=[{sourceId:otherId,corrected:'Wrong task edit.',explanation:'Not the original task.'}]},
  raw=>{raw.tasks[0].mistakes=[{original:'J’ai déjà',corrected:'Changed excerpt',explanation:'No source ID supplied.'}]}
 ];
 for(const mutate of cases){const raw=feedback();mutate(raw);let calls=0;const provider=providerFor(raw,()=>calls++);
  await assert.rejects(()=>provider.run({test:paper,responses},configuration),e=>failureMetadata(e).code==='UNVERIFIED_QUOTE');assert.equal(calls,1);
 }
});

test('no-op correction checks remain authoritative after source resolution',async()=>{
 const raw=feedback(),source=buildWritingSources(responses)[0].sources[0];raw.tasks[0].mistakes=[{sourceId:source.sourceId,corrected:source.text.trim(),explanation:'No actual correction.'}];
 await assert.rejects(()=>providerFor(raw).run({test:paper,responses},configuration),e=>failureMetadata(e).code==='UNCHANGED_CORRECTION');
});

test('blank-only sentinel cannot be used to omit evidence for nonblank or positive-scored work',async()=>{
 const blank=['','  ','\n'];const raw=feedback(blank);let calls=0;
 const result=await providerFor(raw,()=>calls++).run({test:paper,responses:blank},configuration);
 assert.equal(calls,1);assert.equal(result.result.score,null);assert(result.result.criteria.every(c=>c.evidence.length===0));
 assert.deepEqual(createWritingResponseFormat(blank).json_schema.schema.properties.criteria.items.properties.evidence.properties.sourceId.enum,[NO_WRITING_EVIDENCE]);
 const positive=feedback(blank);positive.score=1;
 assert.throws(()=>resolveWritingSources(positive,blank),/source evidence/);
 const nonblank=feedback();nonblank.criteria[0].evidence.sourceId=NO_WRITING_EVIDENCE;
 assert.throws(()=>resolveWritingSources(nonblank,responses),/source evidence/);
 const partial=['',responses[1],''];assert(!createWritingResponseFormat(partial).json_schema.schema.properties.criteria.items.properties.evidence.properties.sourceId.enum.includes(NO_WRITING_EVIDENCE));
 const partialResult=await providerFor(feedback(partial)).run({test:paper,responses:partial},configuration);
 assert.equal(partialResult.result.criteria[0].evidence[0].task,2);
});
