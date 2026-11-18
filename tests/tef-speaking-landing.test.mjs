import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync('src/exams/tef-speaking/ui.js','utf8');
const styles=readFileSync('src/styles/academy.css','utf8');
const catalog=ui.split(' function renderCatalog(){')[1]?.split(' function renderActive(){')[0];
const inTest=ui.split(' function renderActive(){')[1]?.split(' function renderBreak(){')[0];

test('TEF Speaking home shows only test selection and saved history, not both task documents',()=>{
 assert(catalog,'Home renderer must exist');
 assert.match(catalog,/Choisir un test/);
 assert.match(catalog,/hz-tef-speaking-select/);
 assert.match(catalog,/Commencer le test/);
 assert.match(catalog,/Mes tests sauvegardés/);
 assert.match(catalog,/Reprendre le test/);
 assert.match(catalog,/Voir les résultats/);
 assert.doesNotMatch(catalog,/\.sections|\.document|\.instructions|\.heading/);
 assert.doesNotMatch(catalog,/for\(const s of chosen\.sections\)/);
 assert.doesNotMatch(catalog,/Préparez votre microphone|20 épreuves originales/);
});
test('TEF speaking scenario and exact French instructions appear inside the active session only',()=>{
 assert(inTest,'Active session renderer must exist');
 assert.match(inTest,/attempt\.test\.sections/);
 assert.match(inTest,/section\.document/);
 assert.match(inTest,/section\.instructions/);
 assert.match(inTest,/hz-tef-speaking-clock/);
 assert.match(inTest,/historyBlock\(attempt\.phase\)/);
 assert.match(ui,/function renderBreak/);
 assert.match(ui,/function renderFinal/);
});
test('The selected test determines the live start request and saved rows reopen the same attempt',()=>{
 assert.match(catalog,/selectedTestId=select\.value/);
 assert.match(catalog,/start\.textContent='Commencer le test '/);
 assert.match(catalog,/open\(row\.id\)/);
 assert.match(ui,/testId:paper\.id,version:paper\.version/);
 assert.match(ui,/hz-tef-speaking-header-compact/);
});
test('TEF speaking compact picker is styled responsively, without changing the TCF module',()=>{
 assert.match(styles,/hz-tef-speaking-picker-controls/);
 assert.match(styles,/hz-tef-speaking-history-item/);
 assert.match(styles,/@media\(max-width:640px\)/);
 const tcf=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert(!tcf.includes('hz-tef-speaking-picker'));
});
