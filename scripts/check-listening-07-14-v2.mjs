import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {sourceInvariant} from './lib/listening-contrast-quality.mjs';
import {choiceStats,keyPattern,sourceHash} from './lib/listening-quality.mjs';
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const sources=new Set(),reports=[],correctAnswerCopies=new Map();
for(let n=7;n<=14;n++){
 const id=String(n).padStart(2,'0'),root='assets/tcf-listening/tcf-listening-2026-11-test'+id,orig=await load('supabase/exams/tcf-listening-test'+id+'.json'),paper=await load('supabase/exams/tcf-listening-test'+id+'-v2.json');
 assert.equal(orig.id,'tcf-listening-'+id);assert.equal(orig.version,root.split('/').at(-1)+'-v1');
 assert.equal(paper.version,root.split('/').at(-1)+'-v2');assert.equal(paper.seconds,2100);assert.equal(paper.questions.length,39);
 sourceInvariant(orig,paper);
 const newManifest=await load(root+'-v2/manifest.json'),oldManifest=await load(root+'-v1/manifest.json');
 assert.equal(newManifest.version,paper.version);assert.equal(newManifest.state,'MEDIA_VERIFIED');assert.equal(newManifest.files.length,39);
 assert.deepEqual(newManifest.files,oldManifest.files);assert.equal(newManifest.retainedUnchangedSource,orig.version);
 let changed=0,audio=0,pictures=0,longest=0,shortest=0,ratios=[],changedStem=0;
 for(const [i,q] of paper.questions.entries()){
  const old=orig.questions[i],asset=root+'-v2/audio/'+q.audio,prev=root+'-v1/audio/'+q.audio;
  assert.equal(q.number,i+1);assert.equal(q.kind,old.kind);assert.equal(q.correct,old.correct);
  assert.equal(q.slotSeconds,old.slotSeconds);assert.equal(q.audioSeconds,old.audioSeconds);
  assert.deepEqual(q.segments,old.segments);assert.equal(q.transcript,old.transcript);
  assert.equal(q.question,old.question);assert.equal(q.audio,old.audio);
  assert.equal(q.audioSeconds+12<=q.slotSeconds,true,'12-second choice window: '+id+' Q'+q.number);
  const [bytes,prior]=await Promise.all([readFile(asset),readFile(prev)]);
  assert.equal(sha(bytes),sha(prior),'Audio bytes changed: '+id+' Q'+q.number);
  assert.equal(sha(bytes),newManifest.files[i].sha256,'Manifest SHA mismatch: '+id+' Q'+q.number);
  assert.equal(sourceHash(q.segments),newManifest.files[i].sourceHash,'Recording no longer matches source transcript');
  audio++;
  const s=q.transcript.normalize('NFKC').replace(/\s+/gu,' ').toLowerCase();
  assert(!sources.has(s),'Repeated complete recording across tests at '+id+' Q'+q.number);
  sources.add(s);
  if(q.number<=4){
   const [next,previous]=await Promise.all([readFile(root+'-v2/images/'+q.image),readFile(root+'-v1/images/'+q.image)]);
   assert.equal(sha(next),sha(previous));pictures++;
  }
  if(q.number<=8){
   assert.deepEqual(q.options,old.options);
  }else{
   changed++;assert.notDeepEqual(q.options,old.options);
   assert.equal(new Set(q.options.map(s=>s.trim().toLowerCase())).size,4);
   assert(q.options.every(s=>s.trim().length>=18),'Empty or trivial alternative '+id+' Q'+q.number);
   const cs=choiceStats(q);if(cs.correctLongest)longest++;if(cs.correctShortest)shortest++;
   const text=q.options['ABCD'.indexOf(q.correct)].normalize('NFKC').toLowerCase().replace(/\\s+/gu,' ').trim();
   correctAnswerCopies.set(text,(correctAnswerCopies.get(text)||0)+1);
   if(cs.ratio>1.5)ratios.push({q:q.number,ratio:Math.round(cs.ratio*100)/100});
  }
 }
 assert.equal(audio,39);assert.equal(pictures,4);assert.equal(changed,31);
 assert.equal(paper.questions.reduce((total,q)=>total+q.slotSeconds,0),2100);
 const keys=keyPattern(paper.questions);
 assert(Math.max(...Object.values(keys.counts))-Math.min(...Object.values(keys.counts))<=1,'Unbalanced key distribution');
 // The v1 corpus was guessable by selecting the longest answer for 24–26
 // questions out of 31; require a substantial decrease to <45% of the items.
 assert(longest<=14,'Written options still reveal longest-answer shortcut Test'+id+': '+longest+'/31');
 assert(shortest<=14,'Written options reveal shortest-answer shortcut Test'+id+': '+shortest+'/31');
 // These per-item character checks are diagnostic, not a replacement for
 // independent source-grounded semantic review.
 reports.push({test:n,questions:39,audioMatches:audio,picturesMatch:pictures,unchangedSpokenChoiceItems:8,revisedWrittenAlternatives:changed,longestCorrect:longest,shortestCorrect:shortest,ratios});
}
assert.equal(reports.length,8);assert.equal(sources.size,312);
const totalLongest=reports.reduce((s,x)=>s+x.longestCorrect,0);
const totalShortest=reports.reduce((s,x)=>s+x.shortestCorrect,0);
const duplicatedAnswerText=[...correctAnswerCopies.values()].reduce((s,n)=>s+Math.max(0,n-1),0);
assert(totalLongest<=90,'Long-answer strategy remains exploitable across eight tests');
assert(totalShortest<=90,'Short-answer strategy remains exploitable across eight tests');
assert(duplicatedAnswerText<=50,'Too many identical correct answer texts across eight exams: '+duplicatedAnswerText);
console.log(JSON.stringify({tests:8,questions:312,revisedWrittenAlternatives:248,exactAudioMatches:312,matchedImages:32,longestCorrect:totalLongest,shortestCorrect:totalShortest,duplicatedAnswerText,perTest:reports},null,2));
