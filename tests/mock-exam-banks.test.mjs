import test from 'node:test';
import assert from 'node:assert/strict';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
import {validateBank,createAttempt,tick,applyEvent} from '../supabase/functions/academy-exams/engine.js';
test('both original banks have full source-backed counts, clocks and distinct authored questions',()=>{
 const all=[];
 for(const bank of Object.values(BANKS)){
  assert.equal(validateBank(bank),true);
  const [r,l,w,s]=bank.sections,n=bank.exam==='tef-canada'?40:39;
  assert.equal(r.items.length,n);assert.equal(l.items.length,n);
  assert.equal(w.items.length,bank.exam==='tef-canada'?2:3);assert.equal(s.items.length,w.items.length);
  assert.equal(s.items.reduce((sum,t)=>sum+t.responseSeconds+(t.preparationSeconds||0),0),s.seconds);
  assert.equal(bank.sections.reduce((sum,t)=>sum+t.seconds,0),bank.exam==='tef-canada'?10500:10020);
  const distribution=[0,0,0,0];for(const q of [...r.items,...l.items]){distribution[q.answer]++;all.push(q.prompt);assert.ok(q.explanation.length>20)}
  assert.ok(Math.max(...distribution)-Math.min(...distribution)<=2);
  assert.equal(new Set(l.items.map(q=>q.audioPath)).size,n);
  assert.ok(r.items.at(-1).passage.split(/\s+/).length>150);
  assert.ok(l.items.at(-1).transcript.split(/\s+/).length>40);
 }
 assert.equal(all.length,158);assert.equal(new Set(all).size,158);
});
test('TEF writing sections enforce 25 and 35 minutes; no move action resets a timed task',()=>{
 const bank=BANKS['tef-canada'];let state=createAttempt(bank,{id:'a',userId:'u',paidAccessId:'p',now:0});
 state=tick(state,bank,{userId:'u',now:6000000});assert.equal(state.section,2);assert.equal(state.item,0);
 assert.throws(()=>applyEvent(state,bank,{userId:'u',now:6001000,event:{kind:'move',section:2,itemId:bank.sections[2].items[0].id,index:1}}),/timer ends/);
 state=tick(state,bank,{userId:'u',now:7500000});assert.equal(state.item,1);assert.equal(state.section,2);
 state=tick(state,bank,{userId:'u',now:9600000});assert.equal(state.section,3);
});
test('TCF keeps the three writing tasks revisable and only uses supplied overall word ranges',()=>{
 const bank=BANKS['tcf-canada'];const writing=bank.sections[2];assert.equal(writing.navigation,'review');
 assert.deepEqual(writing.items.map(t=>[t.minWords,t.maxWords]),[[60,120],[120,150],[120,180]]);
 assert.ok(!('summaryMinWords' in writing.items[2]));
});
