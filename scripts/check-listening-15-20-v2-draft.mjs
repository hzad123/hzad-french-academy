// Technical integrity checks for staged Listening 15–20 v2 drafts.
// Deliberately NOT independent semantic approval or permission to publish.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {choiceStats,sourceHash} from '../lib/listening-quality.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async f=>JSON.parse(await readFile(f,'utf8'));
const totals={questions:0,correctLongestWritten:0,correctShortestWritten:0,rerecordedQ25:0,audioFilesChecked:0,imageFilesChecked:0,perPaper:[]};
for(let n=15;n<=20;n++){
 const id=String(n).padStart(2,'0');
 const v1=await read('supabase/exams/tcf-listening-test'+id+'.json');
 const v2=await read('supabase/exams/tcf-listening-test'+id+'-v2.json');
 const src='assets/tcf-listening/tcf-listening-2026-11-test'+id;
 const oldManifest=await read(src+'-v1/manifest.json'),newManifest=await read(src+'-v2/manifest.json');
 assert.equal(v1.version,'tcf-listening-2026-11-test'+id+'-v1');
 assert.equal(v2.version,'tcf-listening-2026-11-test'+id+'-v2');
 assert.equal(newManifest.state,'DRAFT_AUDIO_VERIFIED_NOT_EDITORIAL_APPROVED');
 assert.equal(v2.seconds,2100);assert.equal(v2.questions.length,39);
 assert.equal(newManifest.files.length,39);
 let longest=0,shortest=0;
 for(let i=0;i<39;i++){
  const old=v1.questions[i],q=v2.questions[i],newEntry=newManifest.files[i],oldEntry=oldManifest.files[i];
  assert.equal(q.number,i+1);assert.equal(q.correct,old.correct);assert.equal(q.kind,old.kind);
  assert.equal(q.slotSeconds,old.slotSeconds);assert.equal(q.audio,old.audio);
  assert.equal(newEntry.file,q.audio);
  assert.equal(newEntry.sourceHash,sourceHash(q.segments));
  const mp3=await readFile(src+'-v2/audio/'+q.audio);
  assert.equal(sha(mp3),newEntry.sha256,'Audio SHA mismatch '+id+' Q'+q.number);
  assert(q.audioSeconds>0&&q.audioSeconds+12<=q.slotSeconds);
  if(i===24){
   assert.notDeepEqual(q.segments,old.segments,'Q25 source was not repaired');
   assert.notEqual(newEntry.sha256,oldEntry.sha256,'Revised Q25 recording reused old audio');
   assert.equal(q.transcript,q.segments.map(x=>x.text).join('\n'));
   assert.equal(newEntry.rerecorded,true);
   assert(!/Ils affirment que (?:financer|soutenir|diversifier|préserver|rendre|assurer)\b/i.test(q.transcript));
   totals.rerecordedQ25++;
  }else{
   assert.deepEqual(q.segments,old.segments,'Unapproved source change '+id+' Q'+q.number);
   assert.equal(q.transcript,old.transcript);
   assert.equal(newEntry.sha256,oldEntry.sha256,'Unchanged recording differs');
  }
  if(i<8){assert.deepEqual(q.options,old.options)}else{
   const stats=choiceStats(q);assert(stats.valid);
   assert.notDeepEqual(q.options,old.options);
   longest+=Number(stats.correctLongest);shortest+=Number(stats.correctShortest);
  }
  if(i<4){
   const [a,b]=await Promise.all([readFile(src+'-v1/images/'+q.image),readFile(src+'-v2/images/'+q.image)]);
   assert.equal(sha(a),sha(b),'Picture changed '+id+' Q'+q.number);
   totals.imageFilesChecked++;
  }
  totals.audioFilesChecked++;totals.questions++;
 }
 assert.equal(v2.questions.reduce((s,q)=>s+q.slotSeconds,0),2100);
 // Diagnostic only: the blind-answer benchmark is a separate release requirement.
 totals.correctLongestWritten+=longest;totals.correctShortestWritten+=shortest;
 totals.perPaper.push({test:n,questions:39,writtenItems:31,longestCorrect:longest,shortestCorrect:shortest});
}
assert.equal(totals.questions,234);assert.equal(totals.audioFilesChecked,234);
assert.equal(totals.imageFilesChecked,24);assert.equal(totals.rerecordedQ25,6);
console.log(JSON.stringify({gate:'TECHNICAL_DRAFT_INTEGRITY_ONLY_NOT_RELEASE_APPROVAL',...totals},null,2));
