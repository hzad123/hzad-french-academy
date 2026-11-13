import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const old=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const assets=join('assets/tcf-listening',paper.version);
const manifest=JSON.parse(await readFile(join(assets,'manifest.json'),'utf8'));
test('finished TCF listening Test02 has 39 distinct recorded/illustrated questions and retains the 35-minute exam contract',async()=>{
 assert.equal(paper.id,'tcf-listening-02');
 assert.equal(paper.questions.length,39);
 assert.equal(paper.seconds,2100);
 assert.equal(paper.questions.reduce((n,q)=>n+q.slotSeconds,0),2100);
 assert.equal(manifest.files.length,39);
 const texts=new Set(old.questions.map(q=>q.transcript));
 const genres=new Set();
 for(const [i,q] of paper.questions.entries()){
  assert.equal(q.number,i+1);
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.options).size,4);
  assert.match(q.correct,/^[ABCD]$/);
  assert(q.explanation.length>45);
  assert(q.transcript.length>60);
  assert(Array.isArray(q.segments)&&q.segments.length>=2);
  assert(!texts.has(q.transcript),'no Test01 or Test02 duplicated audio script');
  texts.add(q.transcript);genres.add(q.kind);
  assert(q.audioSeconds>0&&q.slotSeconds-q.audioSeconds>=12);
  const mp3=await readFile(join(assets,'audio',q.audio));
  assert(mp3.length>1000);
  assert.equal(createHash('sha256').update(mp3).digest('hex'),manifest.files[i].sha256);
  if(i<4)assert((await stat(join(assets,'images',q.image))).size>600);
 }
 for(const type of ['image','response','announcement','dialogue','radio-news','telephone','interview','panel-discussion','television-report','debate','academic-monologue','roundtable','public-lecture'])assert(genres.has(type));
});
