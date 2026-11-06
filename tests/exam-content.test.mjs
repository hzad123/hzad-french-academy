import test from 'node:test';
import assert from 'node:assert/strict';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
import {DEBRIEFS} from '../supabase/exams/debriefs.js';
import {createExamHandler} from '../supabase/functions/academy-exams/handler.js';
import {reviewQuestion} from '../supabase/functions/academy-exams/content.js';
import {assessmentMessages} from '../supabase/functions/academy-exams/feedback.js';
import {createAttempt,publicAttempt,wordCount} from '../supabase/functions/academy-exams/engine.js';
const owner='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222';
function fixture(){
 let storageCalls=0,paidCommands=0;
 const recorded=BANKS['tcf-canada'].sections[1].items[0].audioPath;
 const handler=createExamHandler({
  authenticate:async token=>({id:token==='owner'?owner:student,email_confirmed_at:token==='unverified'?null:'yes'}),
  db:{userRpc:async()=>({exams:Object.values(BANKS).map(b=>({exam:b.exam,version:b.version,enabled:false,credits:null})),history:[]}),adminRpc:async(name,args)=>{if(name==='academy_exam_audio_command'){if(args.p_user!==owner)throw Error('Audio operator permission required');return {assets:[{path:recorded,status:'ready',reviewed:false}]}}paidCommands++;throw Error('No paid command expected in content review');}},
  storage:{listeningUrl:async path=>{storageCalls++;assert.equal(path,recorded);return 'https://private.invalid/one.mp3'}},provider:{ready:()=>false,run:()=>{throw Error('No inference expected')}}
 });
 async function send(input,token='owner'){const response=await handler(new Request('https://test.invalid/academy-exams',{method:input?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://hzad123.github.io'},body:input?JSON.stringify(input):undefined}));return {status:response.status,data:await response.json()}}
 return {send,counts:()=>({storageCalls,paidCommands})};
}
test('owner can inspect every authored question/task before activation without spending credits or invoking a model',async()=>{
 const f=fixture();assert.equal((await f.send()).data.canReviewContent,true);let objectives=0,productive=0;
 for(const bank of Object.values(BANKS))for(const section of bank.sections)for(const [index,item] of section.items.entries()){
  const r=await f.send({kind:'content-review',exam:bank.exam,skill:section.skill,index});assert.equal(r.status,200);assert.equal(r.data.question.id,item.id);assert.equal(r.data.question.prompt,item.prompt);
  if(['reading','listening'].includes(section.skill)){objectives++;assert.equal(r.data.question.options.length,4);assert.equal(r.data.question.answer,item.answer);assert.ok(r.data.question.explanation);if(section.skill==='listening')assert.equal(r.data.question.transcript,item.transcript)}
  else{productive++;assert.ok(r.data.debrief.checklist.length>=4);assert.ok(r.data.debrief.modelResponse||r.data.debrief.exampleTurns?.length>=6);assert.equal(r.data.question.criteria.length,item.criteria.length)}
 }
 assert.equal(objectives,158);assert.equal(productive,10);assert.deepEqual(f.counts(),{storageCalls:0,paidCommands:0});
});
test('students cannot retrieve content, keys, scripts or debriefs by posting an owner identity or a guessed question',async()=>{
 const f=fixture();assert.equal((await f.send(null,'student')).data.canReviewContent,false);
 for(const kind of ['content-review','content-audio']){const r=await f.send({kind,exam:'tcf-canada',skill:'listening',index:0,ownerId:owner},'student');assert.equal(r.status,403);assert.ok(!('question' in r.data));assert.ok(!('audioUrl' in r.data));assert.ok(!('debrief' in r.data))}
 assert.equal((await f.send({kind:'content-review',exam:'tef-canada',skill:'reading',index:0},'unverified')).status,401);assert.deepEqual(f.counts(),{storageCalls:0,paidCommands:0});
});
test('review validates exact bank/skill/ordinal and signs only an existing recorded listening asset',async()=>{
 const f=fixture();for(const index of [-1,39,1.5,'0',null])assert.equal((await f.send({kind:'content-review',exam:'tcf-canada',skill:'reading',index})).status,409);
 assert.equal((await f.send({kind:'content-review',exam:'constructor',skill:'reading',index:0})).status,409);
 const ready=await f.send({kind:'content-review',exam:'tcf-canada',skill:'listening',index:0});assert.equal(ready.data.audioReady,true);assert.equal((await f.send({kind:'content-audio',exam:'tcf-canada',skill:'listening',index:0})).status,200);
 assert.equal((await f.send({kind:'content-audio',exam:'tcf-canada',skill:'listening',index:1})).status,409);assert.equal((await f.send({kind:'content-audio',exam:'tcf-canada',skill:'reading',index:0})).status,400);assert.deepEqual(f.counts(),{storageCalls:1,paidCommands:0});
});
test('all writing models satisfy their actual word constraints and all ten debriefs have specific revision material',()=>{
 assert.equal(Object.keys(DEBRIEFS).length,10);
 for(const bank of Object.values(BANKS))for(const section of bank.sections.filter(s=>['writing','speaking'].includes(s.skill)))for(const task of section.items){
  const d=DEBRIEFS[task.id];assert.ok(d.title);assert.ok(d.checklist.length>=4);assert.ok(d.whyItWorks.length>=3);assert.ok(d.pitfalls.length>=3);assert.ok(d.practice.instruction);assert.ok(d.practice.example);
  if(section.skill==='writing'){const words=wordCount(d.modelResponse);assert.ok(words>=task.minWords,task.id);assert.ok(task.maxWords==null||words<=task.maxWords,task.id)}
 }
});
test('reference material stays outside active candidate delivery and model prompts receive requirements without copying fixed examples',()=>{
 for(const bank of Object.values(BANKS)){
  const state=createAttempt(bank,{id:'a',userId:'u',paidAccessId:'p',now:0});const view=publicAttempt(state,bank,{userId:'u',now:0});assert.ok(!('debrief' in view));assert.ok(!JSON.stringify(view).includes('modelResponse'));
  const task=bank.sections[2].items[0],messages=assessmentMessages({task,response:'Bonjour.',skill:'writing'}),payload=JSON.parse(messages[1].content);assert.deepEqual(payload.task.requiredPoints,DEBRIEFS[task.id].checklist);assert.ok(!JSON.stringify(messages).includes(DEBRIEFS[task.id].modelResponse));
 }
 assert.throws(()=>reviewQuestion(BANKS['tef-canada'],'unknown',0),/Invalid/);
});
