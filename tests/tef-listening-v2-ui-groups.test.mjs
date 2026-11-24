import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile('src/exams/tef-listening/ui.js','utf8');
const v2=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v2.json','utf8'));
test('TEF interview and report share one recording and show both questions simultaneously',()=>{
 for(const first of [23,25,27,29]){
  const q=v2.questions[first-1],next=v2.questions[first];
  assert.equal(q.groupEnd,first+1);assert.equal(next.groupStart,first);
  assert.equal(q.audio,next.audio);assert.equal(next.slotSeconds,0);
  assert.notDeepEqual(q.options,next.options);
 }
 assert(src.includes("visibleQuestions=paired?[item,attempt.paper.questions[item.groupEnd-1]]:[item]"));
 assert(src.includes("for(const current of visibleQuestions)"));
 assert(src.includes("input.name='listening-'+current.number"));
 assert(src.includes('choose(current.number,letter)'));
 assert(src.includes("const nextIndex=(current.groupEnd&&current.groupEnd>current.number)?current.groupEnd:current.number"));
 assert(src.includes("const next=attempt.paper.questions[(item.groupEnd&&item.groupEnd>item.number)?item.groupEnd:item.number]"));
});
test('TEF new version honours pre-audio reading window without breaking historical v1 audio',()=>{
 assert(src.includes("const officialPreview=()=>/^tef-listening-2026-11-test01-v(?:2|3)$/.test(attempt?.version||'')||/^tef-listening-2026-11-test0[2-7]-v1$/.test(attempt?.version||'');"));
 assert(src.includes("if(officialPreview()&&elapsed()<item.previewSeconds)return"));
 assert(src.includes("if(!officialPreview()||elapsed()>=item.previewSeconds)playCurrent()"));
 assert(src.includes("if(officialPreview())"));
 assert(src.includes("Lecture des questions : "));
 assert.equal(v2.questions[22].previewSeconds,20);
 assert.equal(v2.questions[24].previewSeconds,20);
 assert.equal(v2.questions[26].previewSeconds,20);
 assert.equal(v2.questions[28].previewSeconds,10);
});

test('TEF tests 02–07 retain reading countdown and dynamic isolated audio URLs',()=>{
 assert(src.includes("/^tef-listening-2026-11-test0[2-7]-v1$/"));
 assert(src.includes("encodeURIComponent(version)"));
 assert(src.includes("if(officialPreview()&&elapsed()<item.previewSeconds)return"));
});
