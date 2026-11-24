// Strict release gate. Requires all six authored banks and independent evidence.
// This does NOT claim independent AI/human semantic review; it requires it.
import {readFile,readdir,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {overlaps,choiceStats,sourceHash,keyPattern,sha256,normalize,reviewHash,reviewStatus,reviewCriteria} from './lib/listening-quality.mjs';
import {validateDraft,previewSeconds,responseSeconds,minimumAudioSeconds,normalizeSource,PAIRED_STARTS,PAIRED_SECONDS} from '../curriculum/tef-listening-02-07-authoring-contract.mjs';
const baseline=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const tests=[],allSources=[],allQuestions=[];
for(let n=2;n<=7;n++){
 const nn=String(n).padStart(2,'0'),version='tef-listening-2026-11-test'+nn+'-v1';
 const paper=JSON.parse(await readFile('supabase/exams/tef-listening-test'+nn+'-v1.json','utf8'));
 assert.equal(paper.id,'tef-listening-'+nn);
 assert.equal(paper.version,version);
 assert.equal(paper.seconds,2400);
 const base='assets/tef-listening/'+version;
 const manifest=JSON.parse(await readFile(base+'/manifest.json','utf8'));
 assert.equal(manifest.version,version);
 assert.equal(manifest.files.length,36);
 const prev=allSources.map(x=>x.text).concat(baseline.questions.filter(q=>q.slotSeconds>0).map(q=>normalizeSource(q.transcript)));
 const check=validateDraft(paper,prev);
 assert.deepEqual(check.errors,[],'Content structure and source uniqueness errors Test '+nn);
 assert.equal(paper.questions.reduce((s,q)=>s+q.slotSeconds,0),2400);
 assert.deepEqual(Object.values(check.keys).sort(),[10,10,10,10],'Unbalanced answer keys Test '+nn);
 const pattern=keyPattern(paper.questions);
 assert(!pattern.suspiciousFourItemDeck,'Obvious ABCD answer key decks Test '+nn);
 let totalRecordings=0;
 for(const q of paper.questions){
  const no=q.number;
  if(!PAIRED_SECONDS.has(no)){
   const e=manifest.files.find(x=>x.file===q.audio);
   assert(e,'Missing manifest entry at '+nn+'/'+no);
   const bytes=await readFile(base+'/audio/'+q.audio);
   assert.equal(sha256(bytes),e.sha256,'Media checksum '+nn+'/'+no);
   assert.equal(sourceHash(q.segments),e.sourceHash,'Media-source mismatch '+nn+'/'+no);
   assert(q.audioSeconds>=minimumAudioSeconds(no),'Audio too short '+nn+'/'+no);
   const excess=q.slotSeconds-(q.audioSeconds+previewSeconds(no)+responseSeconds(no));
   assert(excess>=0&&excess<2,'Unjustified time padding '+nn+'/'+no);
   totalRecordings++;
   allSources.push({id:nn+'-'+no,text:normalizeSource(q.transcript)});
  }
  const st=choiceStats(q);
  assert(st.valid,'Incorrect option structure '+nn+'/'+no);
  if(no>=21)assert(st.ratio<=2.5,'Advanced choice length difference '+nn+'/'+no);
  allQuestions.push({id:nn+'-'+no,text:q.question});
 }
 assert.equal(totalRecordings,36);
 for(let no=1;no<=4;no++)await stat(base+'/images/q-'+String(no).padStart(2,'0')+'.svg');
 for(const no of PAIRED_STARTS){
  const first=paper.questions[no-1],second=paper.questions[no];
  assert.equal(first.audio,second.audio);
  assert.equal(first.transcript,second.transcript);
  assert.notEqual(normalize(first.question),normalize(second.question));
 }
 // The review evidence is an independent, locked record, NOT a generated pass flag.
 const review=JSON.parse(await readFile('curriculum/tef-listening-review-evidence/test'+nn+'.json','utf8'));
 assert.equal(review.questions.length,40,'Require completed independent review for all 40 questions Test '+nn);
 const byNumber=new Map(review.questions.map(x=>[x.number,x]));
 assert.equal(byNumber.size,40);
 let blindCorrect=0;
 for(const q of paper.questions){
  const entry=byNumber.get(q.number);
  assert(entry,'Missing independent review for '+nn+'/'+q.number);
  assert(typeof entry.reviewer==='string'&&entry.reviewer.trim().length>=3,'Reviewer identity absent');
  assert(entry.blindPredictionMadeBeforeAudio===true,'Blind review must predate transcript/audio');
  assert(/^[ABCD]$/.test(entry.blindPredictedLetter),'Blind prediction required');
  assert(entry.fullTranscriptAndAudioChecked===true,'Review actual audio and transcript');
  assert(entry.oneDefensibleKey===true,'Semantic uniqueness not verified');
  assert(entry.distractorsPlausibleWithoutListening===true,'Distractor plausibility not verified');
  assert(entry.pairedAnswerLeakageAbsent===true,'Pair answer leakage not verified');
  assert(entry.sourceHash===sourceHash(q.segments),'Evidence stale after source edits');
  assert(entry.contentHash===reviewHash(q),'Review must match complete final question and answer choices');
  const audioRecord=manifest.files.find(x=>x.file===q.audio);
  assert(audioRecord&&entry.audioHash===audioRecord.sha256,'Review must match final rendered MP3 bytes');
  const imageHash=q.image?sha256(await readFile(base+'/images/'+q.image)):null;
  assert((entry.imageHash||null)===imageHash,'Review must match final original picture bytes');
  assert(entry.independentOfAuthor===true,'Independent reviewer confirmation required');
  assert(typeof entry.blindReason==='string'&&entry.blindReason.trim().length>=25,'Blind prediction needs a written reason');
  const blindAt=Date.parse(entry.blindPredictedAt||''),audioAt=Date.parse(entry.transcriptAndAudioReviewedAt||'');
  assert(Number.isFinite(blindAt)&&Number.isFinite(audioAt)&&blindAt<audioAt,'Blind prediction must be recorded before full-media review');
  const reviewed=reviewStatus(q,version,audioRecord.sha256,imageHash,review.questions);
  assert(reviewed.ok,'Comprehensive French semantic, distractor, and source-grounded review failed '+nn+'/'+q.number+': '+reviewed.missing.join(','));
  assert(reviewCriteria.every(c=>entry.checks?.[c]===true),'Missing independent quality dimensions '+nn+'/'+q.number);
  if(entry.blindPredictedLetter===q.correct)blindCorrect++;
 }
 assert(blindCorrect<=14,'Blind guessing exceeds 35% Test '+nn+': '+blindCorrect+'/40');
 tests.push({test:nn,questions:40,recordings:36,seconds:2400,blindCorrect});
}
const duplicates=overlaps(allSources.map(x=>({id:x.id,text:x.text})),0.55);
assert.deepEqual(duplicates,[],'Originality collisions in recordings');
const questionDuplicates=overlaps(allQuestions,0.75);
assert.deepEqual(questionDuplicates,[],'Near-identical question wording across six tests');
console.log(JSON.stringify({state:'RELEASE_EVIDENCE_PASS',totalQuestions:240,totalRecordings:216,tests},null,2));
