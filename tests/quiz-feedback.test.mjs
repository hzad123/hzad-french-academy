import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('secure quizzes highlight selected options without extra result panels',async()=>{
 const js=await readFile('src/learning/secure-a0.js','utf8');
 const css=await readFile('src/styles/academy.css','utf8');
 assert.match(js,/hz-answer-correct/);
 assert.match(js,/hz-answer-wrong/);
 assert.match(js,/hz-answer-icon/);
 assert.match(js,/feedback\.correct/);
 assert.doesNotMatch(js,/hz-quiz-feedback-good/);
 assert.doesNotMatch(js,/Correct answer:/);
 assert.doesNotMatch(js,/Score: /);
 assert.match(css,/\.hz-answer-correct/);
 assert.match(css,/\.hz-answer-wrong/);
});
