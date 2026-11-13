import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const draft=JSON.parse(await readFile('curriculum/tcf-listening-test01-v2-draft.json','utf8'));
test('Test 01 v2 listening rewrites are safely staged, not silently substituted for audio',()=>{
 assert.equal(paper.version,'tcf-listening-2026-11-v1');
 assert.equal(draft.status,'AUDIO_NOT_PRODUCED_DO_NOT_PUBLISH');
 assert.equal(draft.basePaper,paper.version);
 assert.notEqual(draft.targetVersion,paper.version);
 assert.deepEqual(draft.replacements.map(x=>x.number),[15,18,23,25,29,31,34,38]);
 const formats=new Set(draft.replacements.map(x=>x.kind));
 for(const type of ['radio-news','telephone','panel-discussion','television-report','debate','academic-monologue','roundtable','public-lecture'])assert(formats.has(type));
 for(const item of draft.replacements){
  assert.equal(item.options.length,4);
  assert.equal(new Set(item.options).size,4);
  assert.match(item.correct,/^[ABCD]$/);
  assert(item.transcript.length>350);
  assert(item.explanation.length>60);
  assert(item.speakers.length>=3);
  const unchanged=paper.questions[item.number-1];
  assert.notEqual(item.transcript,unchanged.transcript);
 }
});
