import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('answers are checked instantly and incorrect selections explain why',async()=>{
 const js=await readFile('src/learning/secure-a0.js','utf8');
 const store=await readFile('src/learning/supabase-store.js','utf8');
 const css=await readFile('src/styles/academy.css','utf8');
 assert.match(js,/store\.checkAnswer\(unitId,questionId,index\)/);
 assert.match(js,/field\.append\(notice\)/);
 assert.match(js,/options\.forEach\(input=>\{input\.disabled=true\}\)/);
 assert.doesNotMatch(js,/state\.pending\[q\.id\]=true;[\s\S]{0,100}render\(\)/);
 assert.match(js,/store\.submitQuiz\(unitId,state\.answers\)/);
 assert.doesNotMatch(js,/Submit quiz/);
 assert.match(js,/feedback\.explanation/);
 assert.match(js,/Correct answer:/);
 assert.match(js,/hz-answer-correct/);
 assert.match(js,/hz-answer-wrong/);
 assert.match(js,/hz-answer-icon/);
 assert.match(store,/academy_check_answer/);
 assert.match(css,/\.hz-quiz-feedback-bad/);
 assert.match(css,/\.hz-quiz-feedback-good/);
});
