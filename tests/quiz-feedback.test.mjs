import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('secure quizzes show answer-state markers and explanations',async()=>{
 const js=await readFile('src/learning/secure-a0.js','utf8');
 const css=await readFile('src/styles/academy.css','utf8');
 assert.match(js,/hz-answer-correct/);
 assert.match(js,/hz-answer-wrong/);
 assert.match(js,/hz-answer-icon/);
 assert.match(js,/feedback\.explanation/);
 assert.match(js,/Correct answer:/);
 assert.match(js,/aria-hidden/);
 assert.match(css,/\.hz-quiz-feedback-bad/);
 assert.match(css,/\.hz-quiz-feedback-good/);
 assert.match(css,/prefers-reduced-motion/);
});
