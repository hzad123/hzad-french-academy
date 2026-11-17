import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = async path=>JSON.parse(await readFile(path,'utf8'));
const old1=await read('supabase/exams/tcf-reading-test01.json');
const old5=await read('supabase/exams/tcf-reading-v3/test-05.json');
const next1=await read('supabase/exams/tcf-reading-v4/test-01.json');
const next5=await read('supabase/exams/tcf-reading-v4/test-05.json');
const migration=await readFile('supabase/migrations/20261117225800_tcf_reading_two_editorial.sql','utf8');
const versions=[next1,next5];

test('only Tests 01 and 05 are prepared for immutable v4 publication',()=>{
 assert.deepEqual(versions.map(p=>p.id),['tcf-reading-01','tcf-reading-05']);
 assert(versions.every(p=>p.version==='tcf-reading-2026-11-editorial-v4'));
 assert.deepEqual(migration.split('$paper$').filter((_,i)=>i%2===1).map(JSON.parse),versions);
 assert.equal((migration.match(/update academy_tcf_reading\.published_papers/g)||[]).length,2);
 assert(!/delete\s+from\s+academy_tcf_reading/i.test(migration));
 assert(!/update\s+academy_tcf_reading\.attempts/i.test(migration));
});

for(const [old,updated] of [[old1,next1],[old5,next5]]) {
 test(`Test ${updated.id}: 39 questions, same passages/stems/points, balanced correct letters`,()=>{
  assert.equal(updated.id,old.id);
  assert.equal(updated.seconds,3600);
  assert.equal(updated.maxPoints,699);
  assert.equal(updated.questions.length,39);
  const positions={A:0,B:0,C:0,D:0};
  for(let i=0;i<39;i++){
   const a=old.questions[i],b=updated.questions[i];
   for(const field of ['number','points','passage','question'])assert.deepEqual(b[field],a[field],`${updated.id} Q${i+1} changed ${field}`);
   assert.equal(b.options.length,4);
   assert.equal(new Set(b.options).size,4);
   assert('ABCD'.includes(b.correct));
   assert(b.options.every(v=>v.trim()&&typeof v==='string'));
   positions[b.correct]++;
  }
  assert.equal(updated.questions.reduce((n,q)=>n+q.points,0),699);
  assert(Math.min(...Object.values(positions))>=9);
  assert(Math.max(...Object.values(positions))<=10);
 });
}
test('Test 01 previously absent key A now appears 10 times; unchanged items retain source answer',()=>{
 assert.equal(old1.questions.filter(q=>q.correct==='A').length,0);
 assert.equal(next1.questions.filter(q=>q.correct==='A').length,10);
 const changed=new Set([1,2,3,4,5,6,7,8,9,10,11,12,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39]);
 for(let i=0;i<39;i++){
  if(changed.has(i+1))continue;
  assert.equal(next1.questions[i].options['ABCD'.indexOf(next1.questions[i].correct)],
    old1.questions[i].options['ABCD'.indexOf(old1.questions[i].correct)]);
 }
});
test('Test 05 deposit and ecological restoration distractors no longer contain prior absurd foils',()=>{
 const deposit=next5.questions[8],river=next5.questions[36];
 assert.equal(deposit.correct,'B');
 assert.equal(deposit.options[1],'Rapporter le gobelet avant la fermeture');
 assert(deposit.options.every(o=>!/(poubelle|souvenir|second billet)/i.test(o)));
 assert.equal(river.correct,'B');
 assert(river.options.every(o=>!/(n.influencent jamais|aucune observation|sans information)/i.test(o)));
 assert.equal(river.options[1],'Les effets écologiques se manifestent à des rythmes différents');
});
