import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const plan=JSON.parse(await readFile('curriculum/tcf-listening-20-paper-blueprint.json','utf8'));
const pilot=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
test('twenty listening paper plan retains exact first-pilot navigation, question times and marked structure',()=>{
 assert.equal(pilot.id,'tcf-listening-01');
 assert.equal(plan.papers.length,19);
 assert.equal(plan.rules.questions,39);
 assert.equal(plan.rules.totalSeconds,2100);
 assert.equal(plan.rules.recordingsHeardOnce,true);
 assert.equal(plan.rules.forwardOnly,true);
 assert.equal(plan.rules.manualNextQuestions,'1-38');
 assert.equal(plan.rules.submitOnlyQuestion,39);
 assert.equal(plan.rules.automaticAdvance,true);
 assert.deepEqual(plan.rules.questionSlots,pilot.questions.map(q=>q.slotSeconds));
 assert.equal(plan.papers.reduce((n,p)=>n+p.questions.length,0),741);
 const ids=plan.papers.map(p=>p.id);
 assert.equal(new Set(ids).size,19);
 for(const p of plan.papers){
  assert.equal(p.status,'EDITORIAL_BRIEFS_ONLY_NOT_PUBLISHED');
  assert.equal(p.questions.length,39);
  assert.equal(p.questions.reduce((n,q)=>n+q.slotSeconds,0),2100);
  for(const format of ['radio-news','telephone','panel-discussion','television-report','debate','academic-monologue','roundtable','public-lecture']){
   assert(p.questions.some(q=>q.format===format),p.id+' missing '+format);
  }
 }
});
test('editorial briefs cannot masquerade as complete papers; finished papers require real media',async()=>{
 const out=execFileSync('node',['scripts/check-tcf-listening-twenty.mjs'],{encoding:'utf8'});
 assert.match(out,/NOT playable tests/i);
 const lastPaper=await readFile('supabase/exams/tcf-listening-test20.json','utf8').catch(()=>null);
 if(lastPaper){
  // After final audio production the original release validator must pass,
  // rather than continue expecting the 18 independent test files to be absent.
  const verified=execFileSync('node',['scripts/check-tcf-listening-twenty.mjs','--verify-release'],{encoding:'utf8'});
  assert.match(verified,/Ready for independent human audio\/editorial review/);
 }else{
  assert.throws(()=>execFileSync('node',['scripts/check-tcf-listening-twenty.mjs','--verify-release'],{encoding:'utf8',stdio:'pipe'}),/Missing complete listening bank/);
 }
});
