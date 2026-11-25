import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const t=String(Number(process.argv[2])).padStart(2,'0');
const {clips}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-08-20/test-'+t+'.mjs').href);
const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+t+'-v1.json','utf8'));
assert.equal(bank.questions.length,40);
for(const clip of clips)for(const [i,item] of clip.questions.entries()){
 const q=bank.questions[clip.start+i-1];
 assert.equal(q.question,item.stem);assert.equal(q.transcript,clip.script.trim());assert.equal(q.explanation,item.explanation);
 assert.equal(q.options[q.correct.charCodeAt(0)-65],item.correct);
 assert.deepEqual(q.options.filter((_,j)=>j!==q.correct.charCodeAt(0)-65).sort(),[...item.wrong].sort());
}
console.log('Source and measured bank match for Test '+t);
