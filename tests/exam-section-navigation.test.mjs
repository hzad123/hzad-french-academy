import test from 'node:test';
import assert from 'node:assert/strict';
import {examSections,canSelectQuestion,itemLabel} from '../src/exams/sections.js';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
import {createAttempt,publicAttempt,applyEvent,tick} from '../supabase/functions/academy-exams/engine.js';
test('both exams expose four ordered categories with their exact question/task counts, no prompts or keys in outlines',()=>{
 for(const bank of Object.values(BANKS)){
  const state=createAttempt(bank,{id:'a',userId:'u',paidAccessId:'paid',now:0}),view=publicAttempt(state,bank,{userId:'u',now:0});
  const sections=examSections(null,view);assert.deepEqual(sections.map(s=>s.skill),['reading','listening','writing','speaking']);
  assert.deepEqual(sections.map(s=>s.items),bank.exam==='tef-canada'?[40,40,2,2]:[39,39,3,3]);
  assert.ok(!JSON.stringify(view.sections).includes('answer"'));assert.ok(!JSON.stringify(view.sections).includes('prompt'));assert.ok(!JSON.stringify(view.sections).includes('transcript'));
 }
 assert.equal(itemLabel('reading',0),'Question 1');assert.equal(itemLabel('writing',1),'Task 2');
});
test('section navigation permits reading revisions but cannot jump to another section or reset clocks',()=>{
 const bank=BANKS['tef-canada'];let state=createAttempt(bank,{id:'a',userId:'u',paidAccessId:'paid',now:0});
 state=applyEvent(state,bank,{userId:'u',now:1000,event:{kind:'answer',section:0,itemId:bank.sections[0].items[0].id,choice:2}});
 let view=publicAttempt(state,bank,{userId:'u',now:1000});assert.deepEqual(view.sections[0].answered,[0]);
 assert.equal(canSelectQuestion(view,'reading',20),true);assert.equal(canSelectQuestion(view,'listening',0),false);assert.equal(canSelectQuestion(view,'reading',40),false);
 state=applyEvent(state,bank,{userId:'u',now:2000,event:{kind:'move',section:0,itemId:bank.sections[0].items[0].id,index:20}});assert.equal(state.deadline,3600000);
 view=publicAttempt(tick(state,bank,{userId:'u',now:3600000}),bank,{userId:'u',now:3600000});assert.equal(canSelectQuestion(view,'listening',1),false);assert.equal(canSelectQuestion(view,'reading',0),false);
});
test('TCF writing permits task selection; TEF timed writing and oral tasks keep their sequential timing',()=>{
 for(const bank of Object.values(BANKS)){
  const initial=createAttempt(bank,{id:'a',userId:'u',paidAccessId:'paid',now:0}),start=(bank.sections[0].seconds+bank.sections[1].seconds)*1000;
  const state=tick(initial,bank,{userId:'u',now:start}),view=publicAttempt(state,bank,{userId:'u',now:start});assert.equal(view.skill,'writing');
  assert.equal(canSelectQuestion(view,'writing',1),bank.exam==='tcf-canada');
  const speech=tick(initial,bank,{userId:'u',now:start+3600000}),oral=publicAttempt(speech,bank,{userId:'u',now:start+3600000});assert.equal(canSelectQuestion(oral,'speaking',1),false);
 }
});
