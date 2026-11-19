// Owner-approved TCF Listening 01–06 hybrid review release.
// Owner explicitly waived the *blind guessability benchmark*, not source
// grounding, recording integrity, timing, or preservation checks.
// Keep independently grounded accepted v5 items; use deployed, previously
// grounded immutable v4 questions for every unaccepted v5 candidate.
// This is a separate release path; it cannot turn a rejected v5 into a pass.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contentHash,hash,groundingVerdict,receiptValid} from '../lib/listening-answer-qc.mjs';
import {groundInput,sourceInvariant} from '../lib/listening-contrast-quality.mjs';

const root='work/listening-owner-waiver-v5';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const make=async path=>{await mkdir(path,{recursive:true})};
const letters='ABCD';
const sourceDir='curriculum/tcf-listening-contrast-v2-source';
const v4EvidenceRoot='curriculum/tcf-listening-owner-review-v4';
const policyVersion='listening-comprehension-qc-v2';
const acceptedByTest=[],checks=[];
function requireTrue(ok,detail){if(!ok)throw Error(detail)}
function checkPriorV4(paper,evidence){
 requireTrue(evidence?.version===paper.version&&evidence.questions?.length===39,'Historical v4 grounding evidence missing for '+paper.version);
 requireTrue(evidence.paperHash===hash(paper.questions.map(contentHash)),'Historical v4 evidence content differs: '+paper.id);
 for(let i=0;i<39;i++){
  const q=paper.questions[i],r=evidence.questions[i],key=letters.indexOf(q.correct),verdict=r?.grounded?.result;
  requireTrue(r?.groundedPass===true&&r?.contentHash===contentHash(q)&&r?.grounded?.responseId?.startsWith('chatcmpl-'),'Historical independent grounding missing: '+paper.id+' Q'+(i+1));
  requireTrue(verdict?.questionSupported&&!verdict.ambiguous&&JSON.stringify(verdict.supportedIndices)===JSON.stringify([key]),'Historical key unsupported: '+paper.id+' Q'+(i+1));
  requireTrue(verdict.options?.length===4&&verdict.options.every((o,j)=>o.index===j&&o.supported===(j===key)&&o.reason?.length>=10),'Historical alternative assessment incomplete: '+paper.id+' Q'+(i+1));
 }
}
async function selectedItem(old,record,n,label){
 if(n<=8)return false; // Keep already checked, picture/short-spoken v4 audio unchanged
 if(!record?.pass||record.blocked||!record.grounded)return false;
 if(record.policy!==policyVersion||record.sourceHash!==contentHash(old))return false;
 const q=record.question;
 if(!q||record.contentHash!==contentHash(q)||q.number!==n)return false;
 const input=groundInput(q);
 try{
  receiptValid(record.grounded,'ground',input);
  const ground=groundingVerdict(q,record.grounded.result,{evidenceSource:input.stimulus,normalizeEvidence:true});
  requireTrue(ground.pass,'Independent grounding differs: '+label+' Q'+n);
  requireTrue(q.options?.length===4&&new Set(q.options).size===4&&letters.includes(q.correct),'Invalid candidate alternatives: '+label+' Q'+n);
  return true;
 }catch(error){throw Error('Saved accepted v5 evidence is invalid, cannot silently revert: '+label+' Q'+n+': '+error.message)}
}
for(let n=1;n<=6;n++){
 const label=String(n).padStart(2,'0'),base='supabase/exams/tcf-listening-test'+label;
 const old=await read(base+'-v4.json'),v4Evidence=await read(v4EvidenceRoot+'/'+old.version+'/evidence.json');
 const candidate=await read(sourceDir+'/test'+label+'/bank.json');
 checkPriorV4(old,v4Evidence);
 requireTrue(candidate.id===old.id&&candidate.version.endsWith('-v5')&&candidate.questions.length===39,'Wrong candidate source: '+label);
 const next=structuredClone(old);
 next.version='tcf-listening-2026-11-test'+label+'-v5';
 let strictGrounded=0,oldGrounded=0;const records=[];
 for(let i=0;i<39;i++){
  const q=old.questions[i],file=sourceDir+'/test'+label+'/q-'+(i+1)+'.json';
  const saved=await read(file);
  const approved=await selectedItem(q,saved,i+1,label);
  if(approved){
   next.questions[i]=structuredClone(saved.question);strictGrounded++;
   records.push({number:i+1,source:'v5-grounded',sourceFile:file,contentHash:contentHash(saved.question),responseId:saved.grounded.responseId});
  }else{
   next.questions[i]=structuredClone(q);oldGrounded++;
   records.push({number:i+1,source:'published-v4-grounded',sourceFile:v4EvidenceRoot+'/'+old.version+'/evidence.json',contentHash:contentHash(q),responseId:v4Evidence.questions[i].grounded.responseId});
  }
  if(hash(next.questions[i].segments)!==hash(q.segments))next.questions[i].audioSeconds=null;
 }
 sourceInvariant(old,next);
 requireTrue(next.questions.reduce((v,q)=>v+q.slotSeconds,0)===2100,'Total listening clock changed');
 const folder=join(root,'test'+label);await make(folder);
 await writeFile(join(folder,'bank.json'),JSON.stringify(next,null,2)+'\n');
 await writeFile(join(folder,'evidence.json'),JSON.stringify({test:next.id,version:next.version,sourceVersion:old.version,
  oldGrounded,strictGrounded,proofs:records,oldPaperHash:hash(old.questions.map(contentHash)),newPaperHash:hash(next.questions.map(contentHash)),
  ownerWaiver:'Blind guessability gates waived by the user. All keys retain verified independent source grounding.'},null,2)+'\n');
 const imgDir=join(folder,'images');await make(imgDir);
 for(let k=1;k<=4;k++){const name='q-'+String(k).padStart(2,'0')+'.png';await copyFile(sourceDir+'/test'+label+'/images/'+name,join(imgDir,name));}
 acceptedByTest.push({test:n,strictGrounded,oldGrounded,needsRecording:next.questions.filter((q,i)=>hash(q.segments)!==hash(old.questions[i].segments)).map(q=>q.number)});
 checks.push({test:n,grounded:strictGrounded+oldGrounded});
}
const summary={tests:[1,2,3,4,5,6],version:5,ownerWaiver:true,reviewAuthorization:{message:'just publish everything. its good enough',scope:'TCF Listening 01-06; explicitly waive only blind benchmark'},
  readyForOwnerWaiver:true,readyForMedia:false,totalItems:234,groundedItems:checks.reduce((x,y)=>x+y.grounded,0),acceptedByTest};
requireTrue(summary.groundedItems===234,'Not all question keys have independent source grounding');
await writeFile(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
