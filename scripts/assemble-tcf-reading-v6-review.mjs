import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';

// This imports already recorded editorial judgments. It never selects an answer
// or derives an expected answer from the bank's current key.
const files=process.argv.slice(2);
assert(files.length,'Supply the completed independent review JSON files');
const items=files.flatMap(file=>{
  const source=JSON.parse(readFileSync(file,'utf8'));
  return Array.isArray(source)?source:source.items;
}).sort((a,b)=>a.test-b.test||a.number-b.number);
assert.equal(items.length,90);
assert.equal(new Set(items.map(x=>`${x.test}:${x.number}`)).size,90);
const papers=new Map(Array.from({length:6},(_,i)=>[i+1,JSON.parse(readFileSync(new URL(`../supabase/exams/tcf-reading-v6/test-${String(i+1).padStart(2,'0')}.json`,import.meta.url),'utf8'))]));
for(const item of items){
  const q=papers.get(item.test)?.questions.find(q=>q.number===item.number);
  assert(q&&item.number>=25&&item.number<=39,`Unexpected item ${item.test}:${item.number}`);
  assert.equal(item.fingerprint,createHash('sha256').update(JSON.stringify(q)).digest('hex'));
  assert.equal(item.independent_answer,q.correct);
  assert.equal(item.correct_option_text,q.options['ABCD'.indexOf(item.independent_answer)]);
  assert.equal(item.blind_pass,true);
  assert.equal(item.explanation_verified,true);
  assert.deepEqual(item.unresolved_issues,[]);
  assert(item.correct_evidence.length>0);
  assert.equal(item.rejected_options.length,3);
  assert.deepEqual(item.rejected_options.map(x=>x.option).sort(),[...'ABCD'].filter(x=>x!==item.independent_answer));
  for(const quote of [...item.correct_evidence,...item.rejected_options.flatMap(x=>x.passage_evidence)]){
    assert(typeof quote==='string'&&quote.length>0&&q.passage.includes(quote),`Evidence not in source: ${item.test}:${item.number} ${quote}`);
  }
}
const review={
  version:'tcf-reading-2026-11-close-reading-v6',
  method:'Separate question/options-only inspection, then passage-based answer selection before revealing stored keys or explanations; final explanation check against frozen selections.',
  scope:'Tests 01–06 Questions 25–39; direct editorial review, no external AI API or paid review pipeline.',
  limitation:'Editorial judgments are not student-based psychometric calibration. Test 01 Q30 was already identified by the owner as B before review; hiding key files does not erase that prior knowledge.',
  recovery:'Question files were restored exactly after workspace interruption and all six complete-file SHA-256 hashes matched their recorded final values. The item judgments below are recovered records of the earlier completed independent review, not new answer acceptances generated from restored keys.',
  items
};
const destination=new URL('../tests/fixtures/tcf-reading-v6-independent-review.json',import.meta.url);
writeFileSync(destination,JSON.stringify(review,null,2)+'\n');
console.log('Assembled 90 recovered independent decisions, 270 rejected-option reviews, and literal source evidence.');
