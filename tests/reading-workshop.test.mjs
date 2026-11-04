import test from 'node:test';
import assert from 'node:assert/strict';
import {countFrenchWords,readingGuidance,renderReadingWorkshop} from '../src/learning/reading-workshop.js';

test('French reading word count accepts missing and multiline content',()=>{
  assert.equal(countFrenchWords(null),0);
  assert.equal(countFrenchWords('  Bonjour   tout le monde.\nComment ça va ? '),7);
});
test('all seven levels have intentional, level-specific reading strategies',()=>{
  const levels=['A0','A1','A2','B1','B2','C1','C2'];
  const prompts=levels.map(readingGuidance);
  assert.equal(new Set(prompts).size,7);
  assert.ok(prompts.every(x=>x.length>20));
});
test('missing reading content does not require a DOM or render a panel',()=>{
  assert.equal(renderReadingWorkshop(null,null,'A1'),undefined);
  assert.equal(renderReadingWorkshop(null,{},'B1'),undefined);
  assert.equal(renderReadingWorkshop(null,{french:'   '},'C2'),undefined);
});
