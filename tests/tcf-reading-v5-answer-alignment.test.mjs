import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The 90 ground-truth decisions were derived from each passage BEFORE
// comparing with existing answer keys, explanations or former regression assertions.
const fixture=JSON.parse(await readFile('tests/fixtures/tcf-reading-01-06-independent-evidence.json','utf8'));
test('all 90 source-derived educational answers have distinct passage evidence',()=>{
 assert.equal(fixture.items.length,90);
 assert.equal(new Set(fixture.items.map(x=>x.test+':'+x.question)).size,90);
});
for(let n=1;n<=6;n++){
 test(`Test ${n}: independently established answers, passages and scoring letters agree`,async()=>{
  const file=`supabase/exams/tcf-reading-v5/test-${String(n).padStart(2,'0')}.json`;
  const paper=JSON.parse(await readFile(file,'utf8'));
  const expected=fixture.items.filter(x=>x.test===n);
  assert.equal(expected.length,15);
  for(const check of expected){
   const q=paper.questions[check.question-1];
   assert.equal(q.number,check.question);
   assert(q.passage.includes(check.source_excerpt),
     `T${n} Q${check.question}: independent supporting passage excerpt not present`);
   assert.equal(q.correct,check.independent_answer,
     `T${n} Q${check.question}: wrong answer key; inspect passage, NOT the old test`);
   assert.equal(q.options['ABCD'.indexOf(q.correct)],check.correct_option_text,
     `T${n} Q${check.question}: selected option does not match independent interpretation`);
   assert(q.explanation&&q.explanation.length>45,
     `T${n} Q${check.question}: explanation missing`);
  }
 });
}
test('Test 01 Q30 is B because carbon uptake both regulates climate and acidifies oceans',async()=>{
 const p=JSON.parse(await readFile('supabase/exams/tcf-reading-v5/test-01.json','utf8'));
 const q=p.questions[29];
 assert.equal(q.correct,'B');
 assert.match(q.passage,/absorption entraîne l.acidification/);
 assert.match(q.options[1],/modère l'effet du CO₂ atmosphérique/);
 assert.match(q.options[1],/modifiant défavorablement l'eau de mer/);
 assert.match(q.explanation,/acidifi/);
});
