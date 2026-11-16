import {POLICY_VERSION} from '../../supabase/functions/academy-listening-qc/contracts.js';
import {hash,policyHash,contentHash,spokenChoices,stimulus,mode,letters,permutation,applyAlternatives,receiptValid,blindVerdict,groundingVerdict,attackStatistics,binomialUpperTail} from './listening-answer-qc.mjs';
export const protocol='six-listening-contrast-v2';
export const displayProjection=q=>({question:q.question,choices:[...q.options]});
export const groundInput=(q,imageData)=>({question:q.question,choices:spokenChoices(q),stimulus:q.number>=5&&q.number<=8?q.transcript:stimulus(q),mode:mode(q),...(imageData?{imageData}:{})});
export const trialsFor=q=>q.number>=23?3:q.number>=9?2:1;
const canon=t=>t.normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/gu,' ').trim().toLocaleLowerCase('fr');
export function authorInput(q,{imageData,feedback}={}){
 // Do not anchor a rewrite to the failed stem/key. Written alternatives are
 // built afresh from the recording, rather than cosmetically rephrased.
 return {question:q.number>=9?'Question d’interprétation à construire à partir du document.':q.question,
  choices:q.number>=9?[...letters].map(l=>'Proposition '+l+' à construire.'):spokenChoices(q),stimulus:stimulus(q),mode:mode(q),
  feedback:{number:q.number,advanced:q.number>=23,maxAudioSeconds:q.slotSeconds-12,diagnostic:feedback},...(imageData?{imageData}:{})};
}
export function contrastPlan(q,authored){
 if(q.number<9)return {pass:true,errors:[]};
 const source=canon(stimulus(q)),errors=[];
 for(const reason of authored.distractorReasons??[]){
  if(!['role_swap','causal_reversal','condition_transfer','time_swap','proposal_attribution','scope_shift'].includes(reason.operation))errors.push('Missing precise misunderstanding operation');
  if(!Array.isArray(reason.anchors)||reason.anchors.length<(q.number>=23?2:1)||reason.anchors.some(a=>typeof a!=='string'||a.length<6||!source.includes(canon(a))))errors.push('Missing faithful recorded anchors for distractor '+reason.index);
 }
 return {pass:errors.length===0,errors};
}
export function positionsWithFrozenSpoken(paper,seed){
 const counts=[10,10,10,9],fixed=paper.questions.slice(0,8).map(q=>letters.indexOf(q.correct));
 fixed.forEach(k=>counts[k]--);if(counts.some(c=>c<0))throw Error('Impossible frozen key distribution');
 const remaining=counts.flatMap((count,key)=>Array(count).fill(key));return [...fixed,...permutation(31,seed).map(i=>remaining[i])];
}
export function sourceInvariant(original,candidate){
 if(original.id!==candidate.id||candidate.questions.length!==39||candidate.seconds!==2100)throw Error('Paper identity/format changed');
 for(const [i,q] of candidate.questions.entries()){
  const old=original.questions[i];
  if(q.transcript!==q.segments.map(s=>s.text).join('\n'))throw Error('Transcript and spoken segments differ at '+q.number);
  const body=item=>{const spoken=item.number<=8?item.segments.findLast(s=>/\bA\.\s/.test(s.text)):null;return item.segments.filter(s=>s!==spoken&&!/^Question \d+\.$/.test(s.text)&&s.text!==item.question);};
  if(q.number!==old.number||q.kind!==old.kind||q.slotSeconds!==old.slotSeconds||q.image!==old.image||stimulus(q)!==stimulus(old)||hash(body(q))!==hash(body(old)))throw Error('Topic, recorded situation, actors or clock changed at '+q.number);
 }
 return true;
}
export function rewrite(original,result,target,seed){
 const copy=structuredClone(result);copy.question=copy.question.replace(/^\[Question\s+révisée\]\s*/iu,'').replace(/\s*\(question reformulée[^)]*\)\s*$/iu,'');
 return applyAlternatives(original,copy,target,seed);
}
export async function inspect(q,provider,{seed,imageData,round=0}){
 const projection=displayProjection(q),blind=[];
 for(let trial=0;trial<trialsFor(q);trial++){
  const order=permutation(4,seed+':screen:'+round+':'+trial),input={question:projection.question,choices:order.map(i=>projection.choices[i])};
  const receipt=receiptValid(await provider('blind',input,{nonce:seed+':screen:'+round+':'+trial}),'blind',input);
  blind.push({order,receipt});
  if(!blindVerdict(receipt.result).pass)return {pass:false,blind,feedback:{stage:'blind',reason:receipt.result.reason,cues:receipt.result.cues}};
 }
 const input=groundInput(q,imageData),grounded=receiptValid(await provider('ground',input,{nonce:seed+':ground:'+round}),'ground',input);
 const verdict=groundingVerdict(q,grounded.result,{evidenceSource:input.stimulus,normalizeEvidence:true});
 return {pass:verdict.pass,blind,grounded,feedback:verdict.pass?null:{stage:'ground',assessment:grounded.result,errors:verdict.errors}};
}
export async function repair(original,provider,{target,seed,imageData,maxAttempts=5,starting=null,onAttempt=async()=>{}}){
 let q=starting?structuredClone(starting):original.number<=8?structuredClone(original):rewrite(original,{question:original.question,choices:spokenChoices(original),correctIndex:letters.indexOf(original.correct),explanation:original.explanation,
  distractorReasons:[0,1,2,3].filter(i=>i!==letters.indexOf(original.correct)).map(index=>({index,reason:'Existing option pending independent strict screening.'}))},target,seed+':initial');
 let feedback=null,author=null;
 for(let round=0;round<=maxAttempts;round++){
  const assessment=await inspect(q,provider,{seed,imageData,round});
  if(assessment.pass){
   q.explanation='Réponse '+q.correct+' : '+assessment.grounded.result.options.find(o=>o.index===letters.indexOf(q.correct)).reason+' '+assessment.grounded.result.options.filter(o=>o.index!==letters.indexOf(q.correct)).map(o=>letters[o.index]+' : '+o.reason).join(' ');
   const result={question:q,sourceHash:contentHash(original),contentHash:contentHash(q),policy:POLICY_VERSION,policyHash,rounds:round,pass:true,author,...assessment};
   await onAttempt(result);return result;
  }
  await onAttempt({question:q,rounds:round,pass:false,...assessment});feedback=assessment.feedback;
  if(round===maxAttempts)return {question:q,contentHash:contentHash(q),sourceHash:contentHash(original),policy:POLICY_VERSION,policyHash,rounds:round,pass:false,blocked:true,...assessment};
  let plan;
  for(let planning=0;planning<2;planning++){
   const input=authorInput(original,{imageData,feedback});
   author=receiptValid(await provider('author',input,{nonce:seed+':author:'+round+':'+planning}),'author',input);
   plan=contrastPlan(original,author.result);if(plan.pass)break;feedback={stage:'contrast-plan',errors:plan.errors};
  }
  if(!plan.pass)return {question:q,contentHash:contentHash(q),sourceHash:contentHash(original),policy:POLICY_VERSION,policyHash,pass:false,blocked:true,feedback:{stage:'contrast-plan',errors:plan.errors}};
  q=rewrite(original,author.result,target,seed+':author:'+round);
 }
}
export async function measure(q,provider,nonce){
 const projection=displayProjection(q),order=permutation(4,nonce),input={question:projection.question,choices:order.map(i=>projection.choices[i])};
 const receipt=receiptValid(await provider('blind',input,{nonce}),'blind',input);
 return {order,receipt,correct:order[receipt.result.guess]===letters.indexOf(q.correct)};
}
export function scoreGroup(rows){
 const n=rows.length,k=rows.filter(r=>r.correct).length,p=n?k/n:0,z=1.96,den=1+z*z/n;
 const centre=n?(p+z*z/(2*n))/den:0,margin=n?z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den:0;
 return {sample:n,correct:k,accuracy:n?p:null,chance:.25,confidence95:n?[centre-margin,centre+margin]:null,upperTailP:binomialUpperTail(n,k),
  passes:n>=100&&p<=.32&&centre-margin<=.25&&centre+margin>=.25&&binomialUpperTail(n,k)>=.05};
}
export function summarize(papers,evidence){
 const rows=evidence.flatMap(e=>e.questions.filter(r=>r?.heldout).map(r=>({number:r.question.number,...r.heldout}))),written=rows.filter(r=>r.number>=9),late=rows.filter(r=>r.number>=23);
 return {all:scoreGroup(rows),written:scoreGroup(written),late:scoreGroup(late),earlyWritten:scoreGroup(written.filter(r=>r.number<23)),displayOnly:scoreGroup(rows.filter(r=>r.number<=8)),patterns:attackStatistics(papers)};
}
export function ready(papers,evidence,stats){
 return papers.length===6&&evidence.every(e=>e.questions.length===39&&e.questions.every(r=>r?.pass&&!r.blocked&&r.heldout&&blindVerdict(r.heldout.receipt.result).pass)&&e.paperAssessment?.result.pass&&!e.paperAssessment.result.patterns.length)&&
  stats.written.sample===186&&stats.late.sample===102&&stats.written.passes&&stats.late.passes&&stats.all.passes&&stats.patterns.positionPatterns.every(p=>!p.suspiciousFourItemDeck&&Math.max(...Object.values(p.counts))-Math.min(...Object.values(p.counts))<=1)&&
  Object.values(stats.patterns.heuristicAttacks).every(a=>binomialUpperTail(a.sample,Math.ceil(a.credit))>=.01);
}
export function assertPaper(paper,evidence,original,images){
 sourceInvariant(original,paper);
 if(evidence.protocol!==protocol||evidence.policyHash!==policyHash||evidence.paperHash!==hash(paper.questions.map(contentHash))||evidence.version!==paper.version||evidence.questions.length!==39)throw Error('Stale strict evidence');
 const ids=new Set();
 for(const [i,q] of paper.questions.entries()){
  const record=evidence.questions[i];if(!record?.pass||record.blocked||record.contentHash!==contentHash(q)||record.sourceHash!==contentHash(original.questions[i])||record.blind.length!==trialsFor(q))throw Error('Question has not passed strict validation: '+q.number);
  if(q.number<=4&&record.imageHash!==images[q.number]?.hash)throw Error('Image changed');
  const check=(receipt,stage,input)=>{receiptValid(receipt,stage,input);if(ids.has(receipt.responseId))throw Error('Evaluation response reused');ids.add(receipt.responseId);};
  const proj=displayProjection(q);
  for(const trial of [...record.blind,record.heldout]){
   if(!trial||[...trial.order].sort().join('')!=='0123')throw Error('Invalid blind permutation');
   check(trial.receipt,'blind',{question:proj.question,choices:trial.order.map(k=>proj.choices[k])});if(!blindVerdict(trial.receipt.result).pass)throw Error('Blind cue remains');
  }
  if(record.heldout.correct!==(record.heldout.order[record.heldout.receipt.result.guess]===letters.indexOf(q.correct)))throw Error('Held-out score changed');
  const input=groundInput(q,images[q.number]?.data);check(record.grounded,'ground',input);
  if(!groundingVerdict(q,record.grounded.result,{evidenceSource:input.stimulus,normalizeEvidence:true}).pass)throw Error('Unsupported/ambiguous key');
 }
 receiptValid(evidence.paperAssessment,'paper',{questions:paper.questions.map(q=>({number:q.number,kind:q.kind,question:q.question,choices:spokenChoices(q),correct:q.correct})),statistics:attackStatistics([paper])});
 if(!evidence.paperAssessment.result.pass||evidence.paperAssessment.result.patterns.length)throw Error('Paper pattern audit failed');
 return true;
}
export function assertCohort(cohort,originals){
 if(cohort?.protocol!==protocol||cohort.policyHash!==policyHash||cohort.papers?.length!==6)throw Error('Missing frozen contrast cohort');
 const papers=cohort.papers.map(m=>m.paper),proofs=cohort.papers.map(m=>m.evidence),seen=new Set();
 if(papers.some((p,i)=>p.id!==`tcf-listening-${String(i+1).padStart(2,'0')}`))throw Error('Wrong cohort coverage');
 for(const [i,member] of cohort.papers.entries()){
  assertPaper(member.paper,member.evidence,originals[i],member.images);
  for(const r of member.evidence.questions)for(const receipt of [...r.blind.map(t=>t.receipt),r.heldout.receipt,r.grounded]){
   if(seen.has(receipt.responseId))throw Error('Cross-paper evaluation response reused');seen.add(receipt.responseId);
  }
 }
 const statistics=summarize(papers,proofs);
 if(hash(statistics)!==hash(cohort.statistics)||!ready(papers,proofs,statistics))throw Error('Frozen late/written accuracy or style metrics failed/stale');
 return true;
}
