// Release audit for the owner's explicitly waived blind-guessing threshold.
// This still rejects ambiguous keys, fabricated source changes, missing audio,
// altered timing, and any deviation from the six immutable v4 baselines.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {contentHash,hash,groundingVerdict,receiptValid} from './lib/listening-answer-qc.mjs';
import {groundInput,sourceInvariant} from './lib/listening-contrast-quality.mjs';
import {sourceHash} from './lib/listening-quality.mjs';
const argv=process.argv.slice(2),arg=name=>argv[argv.indexOf(name)+1];
if(!argv.includes('--bank')||!argv.includes('--evidence'))throw Error('Provide exact hybrid bank and owner-waiver evidence path');
const load=async path=>JSON.parse(await readFile(path,'utf8'));
const bank=await load(arg('--bank')),proofRoot=arg('--evidence'),evidence=await load(join(proofRoot,'evidence.json')),summary=await load(join(proofRoot,'review-release.json'));
const label=String(Number(bank.id?.slice(-2))).padStart(2,'0'),base='supabase/exams/tcf-listening-test'+label+'-v4.json',original=await load(base);
const historical=await load('curriculum/tcf-listening-owner-review-v4/'+original.version+'/evidence.json');
const letters='ABCD';
function insist(condition,message){if(!condition)throw Error('Waiver QA failure: '+message)}
insist(summary.ownerWaiver===true&&summary.readyForOwnerWaiver===true&&summary.readyForMedia===false&&summary.groundedItems===234&&summary.totalItems===234&&
 summary.reviewAuthorization?.message==='just publish everything. its good enough'&&JSON.stringify(summary.tests)==='[1,2,3,4,5,6]',
 'Only the specifically owner-authorized six-paper blind benchmark waiver is allowed');
insist(bank.version==='tcf-listening-2026-11-test'+label+'-v5'&&bank.questions.length===39&&bank.seconds===2100,
 'Invalid version, length or clock');
insist(evidence.test===bank.id&&evidence.version===bank.version&&evidence.source===base&&evidence.sourceVersion===original.version&&
 evidence.proofs?.length===39&&evidence.newPaperHash===hash(bank.questions.map(contentHash))&&
 evidence.oldPaperHash===hash(original.questions.map(contentHash)),'Stale or incomplete release evidence');
insist(historical.paperHash===hash(original.questions.map(contentHash))&&historical.questions.length===39,
 'Historical v4 independent key validation missing');
sourceInvariant(original,bank);
let accepted=0,fallback=0;
for(let i=0;i<39;i++){
 const q=bank.questions[i],old=original.questions[i],e=evidence.proofs[i],prior=historical.questions[i],index=letters.indexOf(q.correct);
 insist(q.number===i+1&&e.number===i+1&&e.contentHash===contentHash(q)&&q.kind===old.kind&&q.slotSeconds===old.slotSeconds,
  'Identity/key hash mismatch: Test '+label+' Q'+(i+1));
 insist(q.options?.length===4&&new Set(q.options).size===4&&index>=0,
  'Invalid four-choice key: Test '+label+' Q'+(i+1));
 insist(prior?.groundedPass===true&&prior.contentHash===contentHash(old)&&prior.grounded?.responseId?.startsWith('chatcmpl-')&&
  prior.grounded?.result?.questionSupported&&!prior.grounded.result.ambiguous&&
  JSON.stringify(prior.grounded.result.supportedIndices)===JSON.stringify([letters.indexOf(old.correct)]),
  'Previously deployed v4 has no independently supported key: Test '+label+' Q'+(i+1));
 if(e.source==='v5-grounded'){
  insist(q.number>=9,'Picture and short-spoken questions must reuse their existing verified recordings');
  const r=await load(e.sourceFile);
  insist(r.pass===true&&!r.blocked&&r.policy==='listening-comprehension-qc-v2'&&r.contentHash===contentHash(q)&&
   r.sourceHash===contentHash(old)&&r.grounded?.responseId===e.responseId,
   'Unproven accepted v5 question: Test '+label+' Q'+(i+1));
  const input=groundInput(q);
  receiptValid(r.grounded,'ground',input);
  insist(groundingVerdict(q,r.grounded.result,{evidenceSource:input.stimulus,normalizeEvidence:true}).pass,
   'Ambiguous or unsupported newly edited key: Test '+label+' Q'+(i+1));
  accepted++;
 }else if(e.source==='published-v4-grounded'){
  insist(e.responseId===prior.grounded.responseId&&contentHash(q)===contentHash(old),
   'Fallback was altered or reviewer ID changed: Test '+label+' Q'+(i+1));
  fallback++;
 }else throw Error('Unknown provenance for question '+(i+1));
 if(!argv.includes('--media'))continue;
 const manifest=await load(join('assets/tcf-listening',bank.version,'manifest.json'));
 insist(manifest.version===bank.version&&manifest.state==='MEDIA_VERIFIED'&&manifest.files.length===39,
  'Incomplete media manifest: Test '+label);
 const entry=manifest.files.find(x=>x.file===q.audio),mp3=join('assets/tcf-listening',bank.version,'audio',q.audio);
 insist(entry&&entry.sourceHash===sourceHash(q.segments)&&entry.sha256===hash(await readFile(mp3)),
  'Recording does not match exact transcript: Test '+label+' Q'+(i+1));
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',mp3],{encoding:'utf8'}));
 insist(Number.isFinite(duration)&&duration>0&&Math.abs(duration-q.audioSeconds)<0.011&&
  Math.abs(duration-entry.seconds)<0.011&&duration+12<=q.slotSeconds,
  'Recording too long or response window changed: Test '+label+' Q'+(i+1));
}
insist(accepted===evidence.strictGrounded&&fallback===evidence.oldGrounded&&accepted+fallback===39,
 'Question provenance count mismatch');
if(argv.includes('--media')){
 for(const q of bank.questions.slice(0,4)){
  const media=await readFile(join('assets/tcf-listening',bank.version,'images',q.image));
  const v4=await readFile(join('assets/tcf-listening',original.version,'images',q.image));
  insist(hash(media)===hash(v4),'Image differs from original source: Test '+label+' Q'+q.number);
 }
}
console.log('OWNER WAIVER v5 Test'+label+': 39 uniquely supported keys, '+accepted+' grounded improvements, '+fallback+
 ' preserved previously verified questions; historical clock and source protected'+(argv.includes('--media')?', 39 matching audio clips/images verified.':'.'));
