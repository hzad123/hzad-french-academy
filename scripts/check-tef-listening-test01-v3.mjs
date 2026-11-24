import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sourceHash,choiceStats} from './lib/listening-quality.mjs';
const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const old=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v2.json','utf8'));
const base='assets/tef-listening/'+bank.version;
const manifest=JSON.parse(await readFile(base+'/manifest.json','utf8'));
assert.equal(bank.id,old.id);assert.equal(bank.questions.length,40);
assert.equal(bank.version,'tef-listening-2026-11-test01-v3');assert.equal(bank.seconds,2400);
assert.equal(manifest.files.length,36);
const hash=x=>createHash('sha256').update(x).digest('hex');
const paired=[23,25,27,29],second=new Set(paired.map(n=>n+1));
let longest=0,unique=0,minAudio=999,maxAudio=0;
const keys={},media=new Map();
for(let i=0;i<40;i++){
 const q=bank.questions[i],v=old.questions[i];
 assert.equal(q.number,i+1);assert.equal(q.correct,v.correct);
 if(q.number<=20)assert.deepEqual(q.options,v.options);
 else assert.equal(q.options['ABCD'.indexOf(q.correct)],v.options['ABCD'.indexOf(v.correct)],'Correct option must remain untouched');
 assert.equal(q.explanation,v.explanation);
 if(q.slotSeconds>0){
  assert(q.audioSeconds>0);assert(q.transcript.length>100);assert(q.segments.length);
  const mediaEntry=manifest.files.find(x=>x.file===q.audio);
  assert(mediaEntry,'Missing recorded media '+q.audio);
  assert.equal(mediaEntry.sourceHash,sourceHash(q.segments),'Transcript/recording mismatch '+q.number);
  assert.equal(mediaEntry.sha256,hash(await readFile(base+'/audio/'+q.audio)));
  const post=(q.number>=23&&q.number<=28)?30:(q.number>=13?15:10);
  assert(q.audioSeconds+q.previewSeconds+post<=q.slotSeconds,'Short question clock '+q.number);
  assert(q.slotSeconds-(q.audioSeconds+q.previewSeconds+post)<2,'Extra timing padding detected on question '+q.number);
  minAudio=Math.min(minAudio,q.audioSeconds);maxAudio=Math.max(maxAudio,q.audioSeconds);
  media.set(q.audio,q.audioSeconds);
  const minimum=q.number<=4?12:q.number<=20?18:q.number<=22?34:q.number<=28?105:q.number===29?100:30;
  assert(q.audioSeconds>=minimum,'Unrealistically short source '+q.number);
 }else{
  assert(second.has(q.number),'Only the second question in a pair can have zero independent duration');
  const first=bank.questions[q.number-2];
  assert.equal(q.groupStart,first.number);assert.equal(q.groupEnd,q.number);
  assert.equal(q.audio,first.audio);assert.equal(q.audioSeconds,first.audioSeconds);
  assert.equal(q.transcript,first.transcript);assert.deepEqual(q.segments,first.segments);
 }
 if(paired.includes(q.number)){
  assert.equal(q.groupStart,q.number);assert.equal(q.groupEnd,q.number+1);
  assert.equal(q.previewSeconds,q.number===29?10:20);
 }
 const stats=choiceStats(q);assert(stats.valid);if(stats.correctLongest)longest++;if(stats.uniqueCorrectLongest)unique++;
 keys[q.correct]=(keys[q.correct]||0)+1;
 if(i<4){
  const svg=await readFile(base+'/images/'+q.image);
  const original=await readFile('assets/tef-listening/'+old.version+'/images/'+q.image);
  assert.equal(hash(svg),hash(original),'Original pictures changed');
 }
}
assert.equal(media.size,36);assert.equal(bank.questions.reduce((n,q)=>n+q.slotSeconds,0),2400);
assert.deepEqual(keys,{A:10,B:10,C:10,D:10});
assert(longest<=18);assert(unique<=12);
assert.equal(new Set(bank.questions.map(q=>q.transcript)).size,36);
console.log(JSON.stringify({status:'TECHNICAL_DRAFT_PASS_NOT_INDEPENDENT_SEMANTIC_QA',questions:40,uniqueRecordings:36,linkedPairs:paired,seconds:2400,shortestRecording:minAudio,longestRecording:maxAudio,longestAnswerCount:longest,uniqueLongestAnswer:unique,historyUntouched:true},null,2));
