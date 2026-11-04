import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessmentBreakdown} from '../src/learning/assessment.js';

test('A0 final categories count checked answers without inventing a writing grade',()=>{
 const unit={assessmentDomains:[
  {questionId:'q1',domain:'Listening'},{questionId:'q2',domain:'Listening'},
  {questionId:'q3',domain:'Reading'},{questionId:'q4',domain:'Practical writing knowledge'}
 ]};
 const feedback={q1:{correct:true},q2:{correct:false},q3:{correct:true},q4:{correct:false}};
 const r=assessmentBreakdown(unit,feedback);
 assert.equal(r.length,3);
 assert.deepEqual(r[0],{name:'Listening',correct:1,total:2,percent:50});
 assert.deepEqual(r[1],{name:'Reading',correct:1,total:1,percent:100});
 assert.equal(r[2].name,'Practical writing knowledge');
 assert.equal(r[2].percent,0);
});

test('Incomplete attempt cannot claim all final questions were assessed',()=>{
 const unit={assessmentDomains:[{questionId:'q1',domain:'Listening'},{questionId:'q2',domain:'Listening'}]};
 assert.deepEqual(assessmentBreakdown(unit,{q1:{correct:true}}),[{name:'Listening',correct:1,total:1,percent:100}]);
 assert.deepEqual(assessmentBreakdown(unit,{}),[]);
});

test('Final quiz feedback stays concise, and all data stays in Supabase',async()=>{
 const [a,store,secure,courses]=await Promise.all([
  readFile('src/learning/assessment.js','utf8'),
  readFile('src/learning/supabase-store.js','utf8'),
  readFile('src/learning/secure-a0.js','utf8'),
  readFile('src/dashboard/courses.js','utf8')
 ]);
 assert.match(a,/title.textContent='Your final A0 practice breakdown'/);
 assert.doesNotMatch(a,/note.textContent=.*self-assessed/);
 assert.match(secure,/showAssessmentBreakdown\(info,unit,state.feedback\)/);
 assert.match(store,/assessmentDomains:row.content\?\.assessment_domains/);
 assert.match(courses,/30 interactive lessons/);
});
