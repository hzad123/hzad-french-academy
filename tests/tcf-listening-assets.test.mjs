import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
const base='assets/tcf-listening/v1/';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const manifest=JSON.parse(await readFile(base+'manifest.json','utf8'));
test('every listening recording matches its published hash, measured duration and original spoken script',async()=>{
 assert.equal(manifest.version,paper.version);assert.equal(manifest.seconds,2100);assert.equal(manifest.files.length,39);
 assert.equal((await readdir(base+'audio')).filter(n=>n.endsWith('.mp3')).length,40);
 for(const [i,q] of paper.questions.entries()){
  const info=manifest.files[i],bytes=await readFile(base+'audio/'+q.audio),meta=JSON.parse(await readFile(base+'audio/'+q.audio.replace('.mp3','.json'),'utf8'));
  assert.equal(info.file,q.audio);assert.equal(info.seconds,q.audioSeconds);assert.equal(info.slotSeconds,q.slotSeconds);assert(q.slotSeconds-q.audioSeconds>=10,'Time needed to answer after listening');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),info.sha256);assert.equal(meta.sha256,info.sha256);assert.equal(meta.seconds,info.seconds);
  // Python builder uses ensure_ascii=False, sort_keys=True and default separators.
  const source='['+q.segments.map(s=>'{'+Object.keys(s).sort().map(k=>JSON.stringify(k)+': '+JSON.stringify(s[k])).join(', ')+'}').join(', ')+']';
  assert.equal(createHash('sha256').update(source).digest('hex'),meta.sourceHash,`Spoken script ${q.number} must match the generated recording`);
  assert.equal(q.transcript,q.segments.map(s=>s.text).join('\n'));
 }
});
