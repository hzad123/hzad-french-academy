import {POLICY_VERSION} from '../../supabase/functions/academy-listening-qc/contracts.js';
import {hash,contentHash,policyHash,blindProjection,stimulus,mode,receiptValid,groundingVerdict,blindVerdict} from './listening-answer-qc.mjs';
export const reviewTests=[1,2,3,4,5,6];
export const reviewRequest='make the 1 to6 new ones live now';
export function assertReviewAuthorization(summary){
 if(summary?.readyForMedia!==false||summary?.readyForOwnerRequestedReview!==true||summary.reviewAuthorization?.message!==reviewRequest||
  summary.policy!==POLICY_VERSION||summary.policyHash!==policyHash||JSON.stringify(summary.tests)!==JSON.stringify(reviewTests)||summary.groundedItems!==234||summary.totalItems!==234)
  throw Error('Missing exact six-test owner review authorization or incomplete unique-key validation');
}
export function assertReviewQuestion(q,record,old,{imageHash,imageData}={}){
 if(!record?.groundedPass||record.policyHash!==policyHash||record.contentHash!==contentHash(q)||record.sourceHash!==contentHash(old)||
  q.number!==old.number||q.kind!==old.kind||q.slotSeconds!==old.slotSeconds||stimulus(q)!==stimulus(old)||q.transcript!==q.segments.map(s=>s.text).join('\n'))
  throw Error('Incomplete/stale review question '+q.number);
 if(q.number<=4&&(record.imageHash!==imageHash||!imageData||q.image!==old.image))throw Error('Image changed after independent validation');
 const input={...blindProjection(q),stimulus:stimulus(q),mode:mode(q),...(imageData?{imageData}:{})};
 receiptValid(record.grounded,'ground',input);
 if(!groundingVerdict(q,record.grounded.result).pass)throw Error('Review cannot override an ambiguous or unsupported answer');
 receiptValid(record.blind,'blind',blindProjection(q));
 if(record.blindPass!==blindVerdict(record.blind.result).pass)throw Error('Blind review warning was altered');
 return true;
}
export function assertReviewPaper(paper,evidence,original,images={}){
 if(paper.id!==original.id||paper.version!==`tcf-listening-2026-11-test${paper.id.slice(-2)}-v4`||!reviewTests.includes(Number(paper.id.slice(-2)))||
  paper.seconds!==2100||paper.questions.length!==39||paper.questions.some((q,i)=>q.number!==i+1)||paper.questions.reduce((n,q)=>n+q.slotSeconds,0)!==2100||
  evidence.policyHash!==policyHash||evidence.paperHash!==hash(paper.questions.map(contentHash))||evidence.version!==paper.version||evidence.questions?.length!==39)
  throw Error('Wrong/incomplete owner-review paper');
 const ids=new Set();
 for(const [i,q] of paper.questions.entries()){
  assertReviewQuestion(q,evidence.questions[i],original.questions[i],images[q.number]);
  for(const receipt of [evidence.questions[i].grounded,evidence.questions[i].blind]){
   if(ids.has(receipt.responseId))throw Error('Independent review response reused');ids.add(receipt.responseId);
  }
 }
 return true;
}
