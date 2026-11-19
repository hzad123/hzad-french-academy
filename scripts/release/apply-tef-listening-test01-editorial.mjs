// Replay the manually reviewed written-choice revisions after any source-bank rebuild.
// Does not alter recordings, transcripts, answer positions, timing, questions or media.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const file='supabase/exams/tef-listening-test01.json';
const bank=JSON.parse(await readFile(file,'utf8'));
const edits=JSON.parse(await readFile('curriculum/tef-listening-test01-editorial-overrides.json','utf8'));
assert.equal(bank.id,edits.testId);assert.equal(bank.version,edits.version);assert.equal(bank.questions.length,40);
let updated=0;
for(const [n,change] of Object.entries(edits.overrides)){
 const q=bank.questions[Number(n)-1];
 assert.equal(q.number,Number(n));assert.equal(q.correct,change.correct);
 assert.equal(change.options.length,4);assert.equal(new Set(change.options).size,4);
 q.options=[...change.options];updated++;
}
await writeFile(file,JSON.stringify(bank,null,2)+'\n');
console.log('Restored '+updated+' TEF listening source-specific option improvements; audio untouched.');
