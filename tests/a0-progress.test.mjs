import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withSavedQuizCompletion} from '../src/learning/progress.js';

test('a fully answered, server-saved lesson completes even below 70%',()=>{
 const original={'a0-01':{completed:false,attempts:1,best:60}};
 const next=withSavedQuizCompletion(original,'a0-02',{percent:40,passed:false});
 assert.equal(next['a0-02'].completed,true);
 assert.equal(next['a0-02'].best,40);
 assert.equal(next['a0-02'].attempts,1);
 assert.equal(next['a0-01'].completed,false);
 assert.equal(original['a0-02'],undefined);
});

test('repeated attempts retain highest score and only one completed lesson',()=>{
 const original={'a0-01':{completed:false,attempts:10,best:67},'a0-02':{completed:true,attempts:1,best:60}};
 const next=withSavedQuizCompletion(original,'a0-01',{percent:33,passed:false});
 assert.equal(next['a0-01'].completed,true);
 assert.equal(next['a0-01'].attempts,11);
 assert.equal(next['a0-01'].best,67);
 assert.equal(Object.values(next).filter(x=>x.completed).length,2);
});

test('invalid or missing server receipt cannot mark a lesson complete',()=>{
 for(const receipt of [undefined,null,{}, {percent:-1},{percent:101},{percent:'100'}]){
  assert.throws(()=>withSavedQuizCompletion({},'a0-01',receipt));
 }
});

test('UI updates bar only after successful server submit and avoids extra progress request',async()=>{
 const js=await readFile('src/learning/secure-a0.js','utf8');
 const start=js.indexOf('const submission=await store.submitQuiz');
 const update=js.indexOf('state.progress=withSavedQuizCompletion(',start);
 const bar=js.indexOf('currentChrome?.updateProgress()',update);
 assert.ok(start>0&&update>start&&bar>update);
 assert.doesNotMatch(js.slice(start,bar),/store\.readProgress\(/);
 assert.match(js,/Lesson completed!/);
});
