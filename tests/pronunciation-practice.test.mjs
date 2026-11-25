import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pronunciationPhrases,nextPronunciationPhrase,validPronunciationPhrase,pronunciationWordCount} from '../src/ai/pronunciation-practice.js';
import {boundedAiRequest} from '../src/ai/store.js';
test('105 level-based prompts: no overlength or immediate repeats, even after exhausting the bank',()=>{
 assert.deepEqual(Object.keys(pronunciationPhrases),['A0','A1','A2','B1','B2','C1','C2']);
 for(const [level,bank] of Object.entries(pronunciationPhrases)){
  assert.equal(bank.length,15,level);assert.equal(new Set(bank).size,15,level);
  assert.ok(bank.every(validPronunciationPhrase),level);
  assert.ok(bank.some(x=>pronunciationWordCount(x)<=5));assert.ok(bank.some(x=>pronunciationWordCount(x)>=6));
  const used=[];let current=bank[0];
  for(let i=0;i<45;i++){used.push(current);const next=nextPronunciationPhrase(level,current,current,used);assert.notEqual(next,current,level);assert.ok(validPronunciationPhrase(next));if(i<14)assert.ok(!used.includes(next),level);current=next}
 }
});
test('prefer fresh feedback-based exercises with varied lengths; reject repeated, overlength and malformed suggestions',()=>{
 const old=pronunciationPhrases.A1[0],suggestion='Les amis arrivent ensemble.';
 assert.equal(nextPronunciationPhrase('A1',old,suggestion),suggestion);
 for(const bad of [old,old.toUpperCase(),'',null,'a'.repeat(241),'Nous allons faire une très longue promenade dans la forêt demain matin.',suggestion]){
  const next=nextPronunciationPhrase('A1',old,bad,[suggestion]);assert.notEqual(next,old);assert.notEqual(next,suggestion);assert.ok(pronunciationPhrases.A1.includes(next));assert.ok(validPronunciationPhrase(next));
 }
 assert.equal(validPronunciationPhrase('Un deux trois quatre cinq six sept huit neuf dix'),false);
 assert.equal(validPronunciationPhrase('Un deux trois quatre cinq six sept huit neuf'),true);
});
test('request deadline rejects even if underlying session or response never settles',async()=>{
 await assert.rejects(boundedAiRequest(()=>new Promise(()=>{}),undefined,5),{name:'AbortError'});
 const controller=new AbortController();const pending=boundedAiRequest(()=>new Promise(()=>{}),controller.signal,1000);controller.abort();await assert.rejects(pending,{name:'AbortError'});
 assert.equal(await boundedAiRequest(async()=>42,undefined,1000),42);
});
