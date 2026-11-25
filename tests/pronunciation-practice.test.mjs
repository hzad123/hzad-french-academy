import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pronunciationPhrases,nextPronunciationPhrase} from '../src/ai/pronunciation-practice.js';
test('all seven levels have ten distinct local practice sentences',()=>{
 assert.deepEqual(Object.keys(pronunciationPhrases),['A0','A1','A2','B1','B2','C1','C2']);
 for(const [level,bank] of Object.entries(pronunciationPhrases)){
  assert.equal(bank.length,10,level);assert.equal(new Set(bank).size,10,level);
  assert.ok(bank.every(x=>x.length<=240),level);
  const used=[];let current=bank[0];
  for(let i=0;i<9;i++){used.push(current);const next=nextPronunciationPhrase(level,current,current,used);assert.ok(!used.includes(next),level);current=next}
  assert.notEqual(nextPronunciationPhrase(level,current,current,bank),current);
 }
});
test('prefer fresh feedback-based exercises, reject repeated or malformed suggestions',()=>{
 const old=pronunciationPhrases.A1[0],suggestion='Les amis arrivent ensemble.';
 assert.equal(nextPronunciationPhrase('A1',old,suggestion),suggestion);
 for(const bad of [old,old.toUpperCase(),'',null,'a'.repeat(241),suggestion]){
  const next=nextPronunciationPhrase('A1',old,bad,[suggestion]);
  assert.notEqual(next,old);assert.notEqual(next,suggestion);assert.ok(pronunciationPhrases.A1.includes(next));
 }
});
