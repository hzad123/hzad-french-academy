import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync('src/exams/tef-speaking/ui.js','utf8');
const styles=readFileSync('src/styles/academy.css','utf8');
const catalog=ui.split(' function renderCatalog(){')[1]?.split(' function renderPreflight(){')[0];
const inTest=ui.split(' function renderActive(){')[1]?.split(' function renderBreak(){')[0];

test('TEF Speaking home shows only test selection and saved history, not both task documents',()=>{
 assert(catalog,'Home renderer must exist');
 assert.match(catalog,/Choisir un test/);
 assert.match(catalog,/hz-tef-speaking-select/);
 assert.match(catalog,/Consulter les consignes/);
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
 assert.match(catalog,/start\.textContent='Consulter les consignes/);
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


test('TEF preflight shows student document before timer and explicit button starts server clock',()=>{
 const preview=ui.split(' function renderPreflight(){')[1]?.split(' function renderActive(){')[0];
 assert(preview,'Preflight renderer exists');
 assert.match(preview,/Lisez les consignes à votre rythme/);
 assert.match(preview,/Le chronomètre ne démarre pas/);
 assert.match(preview,/paper\.sections\[0\]/);
 assert.match(preview,/a\.document/);
 assert.match(preview,/a\.instructions/);
 assert.match(preview,/Démarrer la section A/);
 assert.match(preview,/startTest\(\)/);
 assert.match(preview,/Retour aux tests/);
 assert.doesNotMatch(preview,/store\.send\(/,'Preflight must not create a server attempt');
 const start=ui.split(' async function startTest(){')[1]?.split(' function renderCatalog(){')[0];
 assert.match(start,/await recorderInstance\(\)\.prepare\(\)/);
 assert.match(start,/kind:'start'/);
 assert.match(start,/preflight=false;accept\(next\);render\(\)/);
 assert.match(ui,/if\(!attempt\)\{if\(preflight\)renderPreflight\(\);else renderCatalog\(\)\}/);
 assert.match(ui,/const b=attempt\.test\.sections\[1\]/,'Section B also has untimed preview before its clock');
 assert.match(styles,/hz-tef-speaking-preflight-actions/);
});
