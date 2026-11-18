import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=async p=>JSON.parse(await readFile(p,'utf8'));
const letters=['A','B','C','D'];
const wc=s=>s.trim().split(/\s+/).length;
const originals=await Promise.all(Array.from({length:6},(_,i)=>{
  const n=i+1,base=n===1||n===5?'v4':'v3';
  return load(`supabase/exams/tcf-reading-${base}/test-${String(n).padStart(2,'0')}.json`);
}));
const revised=await Promise.all(Array.from({length:6},(_,i)=>
  load(`supabase/exams/tcf-reading-v5/test-${String(i+1).padStart(2,'0')}.json`)));
test('all six candidates retain the exact originals, topics, timing, points and 39-question structure',()=>{
 for(let i=0;i<6;i++){
  const a=originals[i],b=revised[i];
  assert.equal(b.version,'tcf-reading-2026-11-advanced-v5');
  assert.equal(b.id,a.id);
  assert.equal(b.seconds,3600);
  assert.equal(b.maxPoints,699);
  assert.equal(b.questions.length,39);
  assert.equal(b.questions.reduce((s,q)=>s+q.points,0),699);
  for(let j=0;j<39;j++){
   const old=a.questions[j],q=b.questions[j];
   for(const prop of ['number','points','passage']) assert.deepEqual(q[prop],old[prop],`${b.id} Q${j+1} ${prop}`);
   assert.equal(q.correct,old.correct,`${b.id} Q${j+1} key`);
   assert.equal(q.options.length,4);
   assert.equal(new Set(q.options.map(o=>o.toLocaleLowerCase('fr'))).size,4);
   assert(q.options.every(o=>typeof o==='string'&&o.trim().length>0));
   assert(q.explanation.length>45);
   if(j<24){
    assert.equal(q.question,old.question,`${b.id} Q${j+1} early question changed`);
    assert.deepEqual(q.options,old.options,`${b.id} Q${j+1} early options changed`);
   }else{
    assert.notDeepEqual(q.options,old.options,`${b.id} Q${j+1} advanced distractors unchanged`);
   }
  }
  const freq=Object.fromEntries(letters.map(l=>[l,b.questions.filter(q=>q.correct===l).length]));
  assert(Math.min(...Object.values(freq))>=9&&Math.max(...Object.values(freq))<=10,
    `${b.id} keys distribution ${JSON.stringify(freq)}`);
 }
});
test('all 90 advanced items have source evidence and a changed discriminator',()=>{
 const advanced=revised.flatMap(p=>p.questions.slice(24));
 assert.equal(advanced.length,90);
 assert.equal(new Set(advanced.map(q=>q.passage)).size,90,'advanced passages duplicate');
 assert(advanced.every(q=>q.question&&q.explanation&&letters.includes(q.correct)));
 assert(advanced.every(q=>!(/cela justifie la réponse/i.test(q.explanation))));
});
test('Test 05 three owner-reported items require distinctions rather than absurd alternatives',()=>{
 const questions=revised[4].questions;
 const examples=[30,37,39].map(n=>questions[n-1]);
 assert.deepEqual(examples.map(q=>q.correct),['D','B','A']);
 assert(examples.every(q=>q.question.includes('?')&&q.options.every(o=>o.length>=45)));
 assert(!/poubelle|jamais|sans information|aucune observation|abandonn/i.test(examples.flatMap(q=>q.options).join('|')));
});
test('blind reviewer receives no keys or passages in the first stage',async()=>{
 const source=await readFile('scripts/review-tcf-reading-ai.mjs','utf8');
 const start=source.indexOf('const response=await reviewer(blindSystem,');
 const end=source.indexOf('const chosen=',start);
 assert(start>=0&&end>start);
 const invocation=source.slice(start,end);
 assert(!/q\.passage|q\.correct|q\.explanation/.test(invocation));
 assert(source.includes("if(!key)"));
 assert(source.includes('process.exit(2)'));
 assert(source.includes('for(let round=0;round<3;round++)'));
});
