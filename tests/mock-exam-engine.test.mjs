import test from 'node:test';
import assert from 'node:assert/strict';
import {createAttempt,validateBank,applyEvent,tick,publicAttempt,completedReview,wordCount} from '../supabase/functions/academy-exams/engine.js';
import {assessmentMessages,validateAssessment} from '../supabase/functions/academy-exams/feedback.js';
// Synthetic tiny specification for transition tests; never a published exam.
function bank(){
 const q=(id,extra={})=>({id,prompt:'Choisissez la réponse.',options:['lundi','mardi','mercredi','jeudi'],answer:1,explanation:'Le document précise mardi.',...extra});
 return {exam:'tef-canada',version:'synthetic-v1',specification:{verified:true,verifiedAt:'2026-11-05',sources:['synthetic-format-source','synthetic-assessment-source'],sections:{reading:{seconds:60,items:2},listening:{seconds:60,items:1},writing:{seconds:60,items:1},speaking:{seconds:60,items:1}}},sections:[
  {skill:'reading',seconds:60,navigation:'review',items:[q('r1'),q('r2')]},
  {skill:'listening',seconds:60,navigation:'forward',items:[q('l1',{audioPath:'synthetic-v1/l1.mp3',transcript:'Nous ouvrons mardi.'})]},
  {skill:'writing',seconds:60,navigation:'review',items:[{id:'w1',prompt:'Invitez votre ami.',minWords:60,maxWords:120,criteria:['task_fulfilment','grammar','coherence']}]},
  {skill:'speaking',seconds:60,navigation:'forward',items:[{id:'s1',prompt:'Parlez de votre ville.',responseSeconds:60,examinerRole:'Listen.',criteria:['task_fulfilment','grammar','pronunciation']}]}
 ]};
}
const options={id:'attempt',userId:'alice',paidAccessId:'paid-once',now:1000};
test('unverified or incomplete banks cannot be presented as full exams',()=>{
 const b=bank();b.specification.verified=false;assert.throws(()=>validateBank(b),/must be verified/);
 const missing=bank();missing.sections[0].items.pop();assert.throws(()=>validateBank(missing),/does not match/);
 const duplicate=bank();duplicate.sections[0].items[1].id='r1';assert.throws(()=>validateBank(duplicate),/Duplicate/);
 assert.throws(()=>createAttempt(bank(),{...options,paidAccessId:null}),/Paid/);
});
test('active delivery contains no objective key, explanation or listening transcript',()=>{
 const b=bank();const a=createAttempt(b,options),view=publicAttempt(a,b,{userId:'alice',now:1000});
 assert.ok(!('answer' in view.question));assert.ok(!('explanation' in view.question));assert.equal(view.remainingSeconds,60);
 const listening=tick(a,b,{userId:'alice',now:61000});const l=publicAttempt(listening,b,{userId:'alice',now:61000});assert.equal(l.skill,'listening');assert.equal(l.question.audioPath,'synthetic-v1/l1.mp3');assert.ok(!('transcript' in l.question));
});
test('reading revisions stay in the active section; cross-account and stale actions are rejected',()=>{
 const b=bank();let a=createAttempt(b,options);
 a=applyEvent(a,b,{userId:'alice',now:2000,event:{kind:'answer',section:0,itemId:'r1',choice:0}});
 a=applyEvent(a,b,{userId:'alice',now:3000,event:{kind:'answer',section:0,itemId:'r1',choice:1}});assert.equal(a.answers.r1,1);
 assert.throws(()=>publicAttempt(a,b,{userId:'bob',now:3000}),/not found/);
 assert.throws(()=>applyEvent(a,b,{userId:'alice',now:61000,event:{kind:'answer',section:0,itemId:'r1',choice:1}}),/section has ended/);
});
test('timers are server-authoritative and elapsed time is not reset by a resumed view',()=>{
 const b=bank(),a=createAttempt(b,options);
 assert.equal(publicAttempt(a,b,{userId:'alice',now:31000}).remainingSeconds,30);
 const finished=tick(a,b,{userId:'alice',now:241000});assert.equal(finished.status,'completed');assert.equal(finished.sectionResults.length,4);assert.equal(finished.finishedAt,241000);
 assert.equal(a.status,'active','transitions do not mutate the loaded original before transaction commit');
});
test('completed review provides deterministic marking and explanations with no fabricated scale conversion',()=>{
 const b=bank();let a=createAttempt(b,options);a=applyEvent(a,b,{userId:'alice',now:2000,event:{kind:'answer',section:0,itemId:'r1',choice:1}});
 assert.throws(()=>completedReview(a,b,{userId:'alice'}),/Finish the exam/);
 a=tick(a,b,{userId:'alice',now:241000});assert.deepEqual(a.sectionResults[0],{skill:'reading',correct:1,total:2});
 const review=completedReview(a,b,{userId:'alice'});assert.equal(review[0].items[0].correct,1);assert.equal(review[1].items[0].transcript,'Nous ouvrons mardi.');assert.ok(!('officialScore' in a.sectionResults[0]));
});
test('speaking evidence is task-owned, bounded and idempotent',()=>{
 const b=bank();let a=tick(createAttempt(b,options),b,{userId:'alice',now:181000});
 const event={kind:'recording',section:3,itemId:'s1',recording:{id:'clip1',storagePath:'alice/attempt/s1/clip1.wav',seconds:20}};
 a=applyEvent(a,b,{userId:'alice',now:202000,event});a=applyEvent(a,b,{userId:'alice',now:202500,event});assert.equal(a.speaking.s1.length,1);
 assert.throws(()=>applyEvent(a,b,{userId:'alice',now:183000,event:{...event,recording:{...event.recording,storagePath:'bob/attempt/s1/clip1.wav'}}}),/not owned/);
 assert.throws(()=>applyEvent(a,b,{userId:'alice',now:183000,event:{...event,recording:{...event.recording,id:'clip2',storagePath:'alice/attempt/s1/clip2.wav',seconds:31}}}),/up to 30/);
});
test('speaking preparation and response clocks survive resume and advance between tasks',()=>{
 const b=bank();b.sections[3].items=[{...b.sections[3].items[0],responseSeconds:20,preparationSeconds:10},{...b.sections[3].items[0],id:'s2',responseSeconds:30}];b.specification.sections.speaking.items=2;
 const a=tick(createAttempt(b,options),b,{userId:'alice',now:181000});
 assert.equal(publicAttempt(a,b,{userId:'alice',now:185000}).question.phase,'preparation');
 assert.throws(()=>applyEvent(a,b,{userId:'alice',now:185000,event:{kind:'recording',section:3,itemId:'s1',recording:{id:'c',seconds:1,storagePath:'alice/attempt/s1/c.wav'}}}),/Preparation/);
 const second=tick(a,b,{userId:'alice',now:212000});assert.equal(second.item,1);assert.equal(publicAttempt(second,b,{userId:'alice',now:212000}).question.responseRemainingSeconds,29);
});
test('word count and writing drafts remain separate from criterion grading',()=>{
 assert.equal(wordCount('  Bonjour\nmon ami.  '),3);
 const b=bank();let a=tick(createAttempt(b,options),b,{userId:'alice',now:121000});a=applyEvent(a,b,{userId:'alice',now:122000,event:{kind:'writing',section:2,itemId:'w1',text:'Bonjour mon ami.'}});
 assert.equal(publicAttempt(a,b,{userId:'alice',now:123000}).question.savedText,'Bonjour mon ami.');assert.deepEqual(a.feedback,{});
});
const task={prompt:'Invitez votre ami.',criteria:['task_fulfilment','grammar','coherence']};
const response='Bonjour mon ami, viens dîner samedi.';
const good=()=>({summary:'The invitation is clear; develop the practical details.',criteria:task.criteria.map(id=>({id,rating:2,evidence:['viens dîner samedi'],strength:'A clear invitation.',improvement:'Add the time and place, then connect the details.'})),corrections:[],improvedResponse:'Bonjour ! Viens dîner chez moi samedi à 19 h.',priorities:['Add the time.','Add the place.','Use a clear closing.'],practice:[{instruction:'Write a second invitation.',example:'Peux-tu venir dimanche ?'}]});
test('criteria feedback requires complete dimensions, accurate excerpts and actionable priorities',()=>{
 const result=validateAssessment(good(),{task,response});assert.equal(result.criteria.length,3);assert.equal(result.priorities.length,3);
 const fake=good();fake.criteria[0].evidence=['invented words'];assert.throws(()=>validateAssessment(fake,{task,response}),/invented/);
 const absent=good();absent.criteria.pop();assert.throws(()=>validateAssessment(absent,{task,response}),/Missing/);
 const inflated=good();inflated.criteria[0].rating=5;assert.throws(()=>validateAssessment(inflated,{task,response}),/Invalid criterion/);
});
test('a blank response cannot earn positive ratings and speech cannot be graded from transcript alone',()=>{
 assert.throws(()=>validateAssessment(good(),{task,response:''}));
 assert.throws(()=>assessmentMessages({task,response,skill:'speaking'}),/actual audio/);
 const prompts=assessmentMessages({task,response,skill:'writing'});assert.match(prompts[0].content,/do not invent official scaled/);assert.equal(JSON.parse(prompts[1].content).learnerResponse,response);
});
