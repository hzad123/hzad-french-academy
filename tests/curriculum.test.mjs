import test from 'node:test';
import assert from 'node:assert/strict';
import {a0Lessons,gradeQuiz} from '../src/curriculum/a0.js';
import {recordPreviewAttempt,readPreviewProgress,progressPercent} from '../src/progress/local.js';
test('unique lesson and question IDs',()=>{
 assert.equal(new Set(a0Lessons.map(l=>l.id)).size,a0Lessons.length);
 const ids=a0Lessons.flatMap(l=>l.quiz.map(q=>q.id));
 assert.equal(new Set(ids).size,ids.length);
 for(const l of a0Lessons)for(const q of l.quiz)assert.ok(q.answer>=0&&q.answer<q.options.length);
});
test('deterministic grading and explanation',()=>{
 const l=a0Lessons[0],answers=Object.fromEntries(l.quiz.map(q=>[q.id,q.answer]));
 const result=gradeQuiz(l,answers);
 assert.equal(result.percent,100);assert.equal(result.passed,true);assert.equal(result.feedback.length,l.quiz.length);
});
test('preview progress tracks best result',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 recordPreviewAttempt('a0-01',{percent:100,passed:true},storage);
 recordPreviewAttempt('a0-01',{percent:33,passed:false},storage);
 assert.equal(readPreviewProgress(storage)['a0-01'].best,100);
 assert.equal(progressPercent(a0Lessons,readPreviewProgress(storage)),33);
});
