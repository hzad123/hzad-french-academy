import {scripts,sharedPairs} from '../../curriculum/tef-listening-test01-v2-spoken.mjs';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import assert from 'node:assert/strict';
const original=JSON.parse(await readFile('supabase/exams/tef-listening-test01.json','utf8'));
const paper=structuredClone(original);
const version='tef-listening-2026-11-test01-v2';
const root='assets/tef-listening/'+version;
paper.version=version;paper.title='TEF Listening · Test 01 (format révisé)';
assert.equal(scripts.length,36,'Expected 36 distinct recordings for 40 questions');
assert.equal(original.questions.length,40);
const byNumber=new Map(),pairSecond=new Set(sharedPairs.map(x=>x[1]));
for(let n=1,idx=0;n<=40;n++){
 if(pairSecond.has(n))continue;
 byNumber.set(n,scripts[idx++]);
}
const firstBySecond=new Map(sharedPairs.map(([a,b])=>[b,a]));
const names=new Set();
for(const q of paper.questions){
 const n=q.number,first=firstBySecond.get(n)||n;
 const transcript=byNumber.get(first);
 assert(transcript&&transcript.trim().length>100,'Missing source '+n);
 q.transcript=transcript.trim();
 const pieces=q.transcript.split(/(?=—\s)/u).map(s=>s.replace(/^—\s*/u,'').trim()).filter(Boolean);
 q.segments=pieces.map((text,i)=>({voice:i%2?'male':'female',text}));
 // Pair: a single recording is associated with two separate questions.
 q.audio='q-'+String(first).padStart(2,'0')+'.mp3';
 q.audioSeconds=0;
 if(n<=4){q.slotSeconds=35;q.previewSeconds=5}
 else if(n<=12){q.slotSeconds=42;q.previewSeconds=10}
 else if(n<=20){q.slotSeconds=48;q.previewSeconds=5}
 else if(n<=22){q.slotSeconds=78;q.previewSeconds=10}
 else if(n>=31){q.slotSeconds=n<=34?76:75;q.previewSeconds=10}
 for(const [a,b] of sharedPairs){
  if(n===a){q.slotSeconds=a===29?135:165;q.previewSeconds=a===29?10:20;q.groupStart=a;q.groupEnd=b}
  if(n===b){q.slotSeconds=0;q.previewSeconds=0;q.groupStart=a;q.groupEnd=b}
 }
 if(!firstBySecond.has(n))names.add(q.audio);
}
assert.equal(names.size,36);
assert.equal(paper.questions.reduce((s,q)=>s+q.slotSeconds,0),2400);
for(const [a,b] of sharedPairs){
 const x=paper.questions[a-1],y=paper.questions[b-1];
 assert.equal(x.audio,y.audio);assert.equal(x.transcript,y.transcript);
 assert.equal(x.correct,original.questions[a-1].correct);assert.equal(y.correct,original.questions[b-1].correct);
 assert.equal(y.slotSeconds,0);
}
await mkdir(root+'/audio',{recursive:true});
await mkdir(root+'/images',{recursive:true});
for(let n=1;n<=4;n++)await cp('assets/tef-listening/'+original.version+'/images/q-'+String(n).padStart(2,'0')+'.svg',root+'/images/q-'+String(n).padStart(2,'0')+'.svg');
for(const name of ['AUDIO-LICENSES.md'])await cp('assets/tef-listening/'+original.version+'/'+name,root+'/'+name);
await cp('assets/tef-listening/'+original.version+'/audio/audio-check.mp3',root+'/audio/audio-check.mp3');
await writeFile('supabase/exams/tef-listening-test01-v2.json',JSON.stringify(paper,null,2)+'\n');
console.log(JSON.stringify({questions:40,recordings:36,sharedPairs,seconds:2400,sourceCharacterCounts:paper.questions.filter(q=>q.slotSeconds>0).map(q=>[q.number,q.transcript.length])},null,2));
