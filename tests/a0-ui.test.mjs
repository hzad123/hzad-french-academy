import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('A0 uses a numbered sidebar without changing the secure grading path', async()=>{
 const [ui,lesson,store,style]=await Promise.all([
   readFile('src/learning/a0-ui.js','utf8'),
   readFile('src/learning/secure-a0.js','utf8'),
   readFile('src/learning/supabase-store.js','utf8'),
   readFile('src/styles/academy.css','utf8')
 ]);
 assert.match(ui,/role','progressbar'/);
 assert.match(ui,/aria-current','step'/);
 assert.match(ui,/navOpen/);
 assert.match(ui,/navScroll/);
 assert.match(ui,/lessonNumber\(unit\)/);
 assert.match(ui,/is-complete/);
 assert.match(ui,/upcoming\(\)/);
 assert.match(ui,/renderVocabulary/);
 assert.match(ui,/showTranslations/);
 assert.match(ui,/aria-pressed/);
 assert.match(ui,/speakFrench\(french,audio,audioStatus\)/);
 assert.match(ui,/\bfr-FR\b/);
 assert.match(ui,/Longer listening practice/);
 assert.match(lesson,/renderA0Layout\(host,state,selectLesson\)/);
 assert.match(lesson,/renderVocabulary\(content,unit,state\)/);
 assert.match(lesson,/store\.checkAnswer\(unitId,questionId,index\)/);
 assert.match(lesson,/store\.submitQuiz\(unitId,/);
 assert.match(lesson,/chrome\.updateProgress\(\)/);
 assert.match(style,/\.hz-a0-layout/);
 assert.match(style,/@media\(max-width:800px\)/);
 assert.match(style,/\.hz-vocab-card/);
 assert.match(store,/academy_list_units/);
 assert.doesNotMatch(ui,/academy_check_answer|service_role|fetch\(/);
});
