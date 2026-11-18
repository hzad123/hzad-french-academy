import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile('supabase/migrations/20261118210000_tcf_reading_01_06_advanced_v5.sql','utf8');
const embedded=source.split('$paper$').filter((_,i)=>i%2===1).map(JSON.parse);
const papers=await Promise.all(Array.from({length:6},(_,i)=>
 readFile(`supabase/exams/tcf-reading-v5/test-${String(i+1).padStart(2,'0')}.json`,'utf8').then(JSON.parse)));
const evidence=JSON.parse(await readFile('tests/fixtures/tcf-reading-01-06-independent-evidence.json','utf8'));
test('published six-paper source is exactly independently reviewed v5 bank',()=>{
 assert.deepEqual(embedded,papers);
 assert.deepEqual(papers.map(p=>p.id),Array.from({length:6},(_,i)=>`tcf-reading-${String(i+1).padStart(2,'0')}`));
 assert(papers.every(p=>p.version==='tcf-reading-2026-11-advanced-v5'));
 assert.equal(evidence.items.length,90);
 for(const p of papers){
  assert.equal(p.questions.length,39);
  assert.equal(p.seconds,3600);
  assert.equal(p.maxPoints,699);
  assert.equal(p.questions.reduce((n,q)=>n+q.points,0),699);
  for(let i=0;i<39;i++){
   const q=p.questions[i];
   assert.equal(q.number,i+1);
   assert.equal(q.options.length,4);
   assert.equal(new Set(q.options).size,4);
   assert('ABCD'.includes(q.correct));
  }
 }
 for(const item of evidence.items){
  const q=papers[item.test-1].questions[item.question-1];
  assert(q.passage.includes(item.source_excerpt),`Evidence absent from T${item.test} Q${item.question}`);
  assert.equal(q.correct,item.independent_answer,`Educational key mismatch T${item.test} Q${item.question}`);
  assert.equal(q.options['ABCD'.indexOf(q.correct)],item.correct_option_text);
 }
 assert.equal(papers[0].questions[29].correct,'B');
});
test('release SQL inserts only immutable six v5 rows and switches only six paper pointers',()=>{
 assert.equal((source.match(/insert into academy_tcf_reading\.papers/g)||[]).length,1);
 assert.equal((source.match(/update academy_tcf_reading\.published_papers/g)||[]).length,6);
 assert(!/delete\s+from\s+academy_tcf_reading/i.test(source));
 assert(!/update\s+academy_tcf_reading\.attempts/i.test(source));
 assert(!/delete\s+from\s+auth\./i.test(source));
 for(let i=1;i<=6;i++){
  const id=`tcf-reading-${String(i).padStart(2,'0')}`;
  assert(source.includes(`where test_id='${id}' and version='`));
 }
 assert(source.includes("where test_id='tcf-reading-01' and version='tcf-reading-2026-11-editorial-v4'"));
 assert(source.includes("where test_id='tcf-reading-05' and version='tcf-reading-2026-11-editorial-v4'"));
 assert.equal((source.match(/\$paper\$/g)||[]).length,12);
});
