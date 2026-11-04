import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('instant feedback explains both outcomes, preserves inputs and handles throttling',async()=>{
 const js=await readFile('src/learning/secure-a0.js','utf8');
 const store=await readFile('src/learning/supabase-store.js','utf8');
 assert.match(js,/store\.checkAnswer\(unitId,questionId,index\)/);
 assert.match(js,/store\.submitQuiz\(unitId,/);
 assert.doesNotMatch(js,/Submit quiz/);
 assert.match(js,/result\.explanation/);
 assert.match(js,/Correct answer:/);
 assert.match(js,/hz-answer-correct/);assert.match(js,/hz-answer-wrong/);
 assert.match(js,/hz-answer-icon/);assert.match(js,/field\.append\(notice\)/);
 assert.match(js,/state\.saving/);assert.match(js,/showCooldown/);
 assert.doesNotMatch(js,/auth\.getUser/);
 assert.match(store,/academy_check_answer/);
});
