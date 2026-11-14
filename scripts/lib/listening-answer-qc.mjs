import {createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {POLICY_VERSION,MODEL,PROMPTS,validateInput,validateResult,modelRequest,MAX_OUTPUT,PRICES} from '../../supabase/functions/academy-listening-qc/contracts.js';
import {keyPattern,choiceStats} from './listening-quality.mjs';
export const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export const policyHash=hash({policy:POLICY_VERSION,model:MODEL,prompts:PROMPTS});
export const letters='ABCD';
export const exists=path=>access(path).then(()=>true,()=>false);
export const loadJson=async path=>JSON.parse(await readFile(path,'utf8'));
export async function saveJson(path,value){await mkdir(join(path,'..'),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n');}
export function spokenChoices(q) {
 if(q.number>=9)return [...q.options];
 const segment=q.segments?.findLast(s=>/\bA\.\s/.test(s.text));
 if(!segment)throw Error('Missing spoken choices Q'+q.number);
 const matches=[...segment.text.matchAll(/\b([ABCD])\.\s/g)];
 if(matches.length!==4||matches.map(m=>m[1]).join('')!=='ABCD')throw Error('Unparseable spoken choices Q'+q.number);
 return matches.map((m,i)=>segment.text.slice(m.index+m[0].length,matches[i+1]?.index??segment.text.length).trim());
}
export function stimulus(q) {
 if(q.number<=4)return 'Confrontez les quatre descriptions à l’image fournie. Les propositions ne sont pas toutes vraies.';
 const choiceSegment=q.number<=8?q.segments.findLast(s=>/\bA\.\s/.test(s.text)):null;
 return q.segments.filter(s=>s!==choiceSegment&&!/^Question \d+\.$/.test(s.text)&&s.text!==q.question).map(s=>s.text).join('\n');
}
export const mode=q=>q.number<=4?'image':q.number<=8?'response':'document';
export const blindProjection=q=>({question:q.question,choices:spokenChoices(q)});
export const contentHash=q=>hash({number:q.number,kind:q.kind,question:q.question,choices:spokenChoices(q),correct:q.correct,explanation:q.explanation,segments:q.segments});
export function permutation(n,seed) {
 const order=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=parseInt(hash(seed+':'+i).slice(0,8),16)%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
export function balancedPositions(count,seed) {
 const keys=Array.from({length:count},(_,i)=>i%4);
 return permutation(count,seed).map(i=>keys[i]);
}
export function applyAlternatives(original,result,target,seed) {
 validateResult('author',result);
 const wrong=permutation(4,seed).filter(i=>i!==result.correctIndex),order=[];
 for(let i=0;i<4;i++)order.push(i===target?result.correctIndex:wrong.shift());
 const choices=order.map(i=>result.choices[i]),q=structuredClone(original);
 q.question=q.number<=8?original.question:result.question.trim();q.correct=letters[target];q.explanation=result.explanation;
 if(q.number<=8) {
  const segment=q.segments.findLast(s=>/\bA\.\s/.test(s.text));
  const prefix=segment.text.slice(0,segment.text.search(/\bA\.\s/));
  segment.text=prefix+choices.map((text,i)=>letters[i]+'. '+text).join(' ');
 } else {q.options=choices;q.segments.at(-1).text=q.question;}
 q.transcript=q.segments.map(s=>s.text).join('\n');
 if(hash(q.segments)!==hash(original.segments))q.audioSeconds=null;
 return q;
}
function receiptValid(receipt,stage,input) {
 if(receipt?.stage!==stage||receipt.policy!==POLICY_VERSION||typeof receipt.model!=='string'||!receipt.responseId?.startsWith('chatcmpl-')||receipt.inputHash!==hash(input))throw Error('Missing/stale real-model receipt');
 if(receipt.policyHash!==policyHash)throw Error('Evaluation prompts/model changed; old receipt cannot approve new content');
 validateResult(stage,receipt.result);
 return receipt;
}
export function blindVerdict(result) {
 validateResult('blind',result);
 const sorted=[...result.probabilities].sort((a,b)=>b-a);
 return {pass:!result.standsOut&&result.cues.length===0&&sorted[0]<=0.42&&sorted[0]-sorted[1]<=0.15,
  maximum:sorted[0],gap:sorted[0]-sorted[1]};
}
export function groundingVerdict(q,result) {
 validateResult('ground',result);const key=letters.indexOf(q.correct),source=stimulus(q),errors=[];
 if(result.ambiguous||!result.questionSupported||result.supportedIndices.length!==1||result.supportedIndices[0]!==key)errors.push('Not exactly the independently supported marked answer');
 for(const option of result.options) {
  if(option.supported!==(option.index===key))errors.push('Support verdict inconsistent at '+option.index);
  if(option.index!==key&&(!option.plausibleMisunderstanding||option.reason.length<25))errors.push('Distractor lacks a specific plausible misunderstanding at '+option.index);
  if(q.number>4&&(option.evidence.length===0||option.evidence.some(quote=>quote.length<6||!source.includes(quote))))errors.push('Missing/fabricated verbatim evidence at '+option.index);
 }
 return {pass:errors.length===0,errors};
}
export function binomialUpperTail(n,k,p=0.25) {
 if(n===0)return 1;
 const logFactorial=[0];for(let i=1;i<=n;i++)logFactorial[i]=logFactorial[i-1]+Math.log(i);
 const values=[];for(let i=k;i<=n;i++)values.push(logFactorial[n]-logFactorial[i]-logFactorial[n-i]+i*Math.log(p)+(n-i)*Math.log1p(-p));
 const max=Math.max(...values);return Math.min(1,Math.exp(max)*values.reduce((s,v)=>s+Math.exp(v-max),0));
}
export function attackStatistics(papers,proofs=[]) {
 const rows=papers.flatMap(p=>p.questions.filter(q=>q.number>=9).map(q=>({paper:p.id,q,choices:spokenChoices(q),key:letters.indexOf(q.correct)})));
 const rates={};
 for(const attack of ['longest','shortest','mostQualified','closestToQuestion']) {
  let hits=0;
  for(const {q,choices,key} of rows) {
   let values;
   if(attack==='longest'||attack==='shortest')values=choices.map(t=>t.length*(attack==='shortest'?-1:1));
   else if(attack==='mostQualified')values=choices.map(t=>(t.match(/\b(?:mais|sans|tout en|selon|afin|avant|si|plutôt|tenant compte|à condition)\b/gi)||[]).length);
   else {const words=new Set(q.question.toLowerCase().match(/[\p{L}]{4,}/gu)||[]);values=choices.map(t=>(t.toLowerCase().match(/[\p{L}]{4,}/gu)||[]).filter(w=>words.has(w)).length);}
   const max=Math.max(...values),ties=values.filter(v=>v===max).length;
   if(values[key]===max)hits+=1/ties;
  }
  rates[attack]={sample:rows.length,credit:hits,accuracy:rows.length?hits/rows.length:null};
 }
 const held=proofs.flatMap(p=>p.questions??[]).filter(r=>r.number>=9&&r.heldout);
 const correct=held.filter(r=>r.heldout.correct).length,n=held.length;
 return {writtenSample:rows.length,heuristicAttacks:rates,heldout:{sample:n,correct,accuracy:n?correct/n:null,
  chance:0.25,upperTailP:binomialUpperTail(n,correct),sufficientSample:n>=100,
  passes:n>=100&&binomialUpperTail(n,correct)>=0.01},
  positionPatterns:papers.map(p=>({test:p.id,...keyPattern(p.questions)}))};
}
export function paperInput(paper) {
 return {questions:paper.questions.map(q=>({number:q.number,kind:q.kind,...blindProjection(q),correct:q.correct})),statistics:attackStatistics([paper])};
}
export async function assessQuestion(q,provider,{seed,imageData=null,round=0}={}) {
 const blind=[];
 for(let trial=0;trial<3;trial++) {
  const order=permutation(4,seed+':screen:'+round+':'+trial),projection=blindProjection(q);
  const input={question:projection.question,choices:order.map(i=>projection.choices[i])};
  // This projection is the ONLY blind boundary; neither object spreads nor
  // conversation history can carry the key/transcript/explanation through it.
  validateInput('blind',input);
  const receipt=receiptValid(await provider('blind',input,{nonce:seed+':screen:'+round+':'+trial}),'blind',input);
  if(blind.some(previous=>previous.receipt.responseId===receipt.responseId))throw Error('Blind evaluation response was reused');
  const verdict=blindVerdict(receipt.result);blind.push({order,receipt,verdict});
  if(!verdict.pass)return {pass:false,contentHash:contentHash(q),blind,feedback:{stage:'blind',reason:receipt.result.reason,cues:receipt.result.cues}};
 }
 const input={...blindProjection(q),stimulus:stimulus(q),mode:mode(q),...(imageData?{imageData}:{})};
 const grounded=receiptValid(await provider('ground',input,{nonce:seed+':ground:'+round}),'ground',input);
 const verdict=groundingVerdict(q,grounded.result);
 return {pass:verdict.pass,contentHash:contentHash(q),blind,grounded,groundingVerdict:verdict,
  feedback:verdict.pass?null:{stage:'ground',errors:verdict.errors,assessment:grounded.result}};
}
export async function repairQuestion(original,provider,{target,seed,imageData=null,maxAttempts=6,onAttempt=async()=>{}}={}) {
 let q=structuredClone(original),feedback=null;
 // Reorder the original alternatives first; accepting one must not retain the
 // old rotating/greedy answer-position scheme.
 const choices=spokenChoices(q),key=letters.indexOf(q.correct);
 q=applyAlternatives(q,{question:q.question,choices,correctIndex:key,explanation:q.explanation,
  distractorReasons:[0,1,2,3].filter(i=>i!==key).map(index=>({index,reason:'Original alternative pending independent validation.'}))},target,seed+':initial');
 for(let round=0;round<=maxAttempts;round++) {
  const proof=await assessQuestion(q,provider,{seed,round,imageData});
  if(proof.pass) {
   const details=proof.grounded.result.options,key=letters.indexOf(q.correct);
   q.explanation='Réponse '+q.correct+' : '+details.find(o=>o.index===key).reason+' '+
    details.filter(o=>o.index!==key).map(o=>letters[o.index]+' : '+o.reason).join(' ');
   proof.contentHash=contentHash(q);
  }
  await onAttempt({round,question:q,assessment:proof});
  if(proof.pass)return {question:q,proof,rounds:round};
  feedback=proof.feedback;
  if(round===maxAttempts)return {question:q,proof,rounds:round,blocked:true};
  const input={...blindProjection(q),stimulus:stimulus(original),mode:mode(original),feedback:{round:round+1,diagnostic:feedback},...(imageData?{imageData}:{})};
  const authored=receiptValid(await provider('author',input,{nonce:seed+':author:'+round}),'author',input);
  q=applyAlternatives(original,authored.result,target,seed+':author:'+round);
 }
}
export async function measureHeldout(q,provider,{seed}={}) {
 const projection=blindProjection(q),order=permutation(4,seed+':unseen-heldout');
 const input={question:projection.question,choices:order.map(i=>projection.choices[i])};
 const receipt=receiptValid(await provider('blind',input,{nonce:seed+':measurement'}),'blind',input);
 return {order,receipt,correct:order[receipt.result.guess]===letters.indexOf(q.correct)};
}
export async function createGatewayProvider({url,token,adminToken,directory,maxUsd=20,fetcher=fetch}) {
 if(!url?.startsWith('https://')||!token||typeof adminToken!=='string'||adminToken.length<32)throw Error('Trusted authoring gateway configuration missing');
 await mkdir(directory,{recursive:true});
 const ledgerFile=join(directory,'cost-ledger.json');
 const ledger=await exists(ledgerFile)?await loadJson(ledgerFile):{spentUsd:0,reservedUsd:0,requests:0};
 let writes=Promise.resolve(),fatal=null;const persist=()=>writes=writes.then(()=>saveJson(ledgerFile,ledger));
 return async(stage,input,{nonce='default'}={})=>{
  validateInput(stage,input);const inputHash=hash(input),key=hash({stage,inputHash,policy:POLICY_VERSION,nonce});
  const file=join(directory,hash(key+policyHash)+'.json');
  if(await exists(file))return receiptValid(await loadJson(file),stage,input);
  if(fatal)throw Error(fatal);
  const request=modelRequest(stage,input),textBytes=Buffer.byteLength(JSON.stringify(request.messages).replace(input.imageData||'__no_image__',''));
  const reserve=((textBytes+1024+(input.imageData?16000:0))*PRICES.inputPerMillion+MAX_OUTPUT[stage]*PRICES.outputPerMillion)/1e6;
  if(ledger.spentUsd+ledger.reservedUsd+reserve>maxUsd)throw Error('Offline authoring cost cap reached; progress saved');
  ledger.reservedUsd+=reserve;ledger.requests++;await persist();
  const response=await fetcher(url,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:token,'x-listening-qc-token':adminToken,'Content-Type':'application/json'},body:JSON.stringify({stage,input,policyHash}),signal:AbortSignal.timeout(70000)});
  if(!response.ok) {
   const detail=await response.json().catch(()=>({}));
   const code=/^QC_[A-Z_]+$/.test(detail.error||'')?detail.error:'GATEWAY';
   if([401,403,404,409,503].includes(response.status)) {
    ledger.reservedUsd-=reserve;await persist();
    fatal='Private authoring gateway unavailable: HTTP'+response.status+' '+code+'; no further paid calls';
   }
   throw Error(fatal||'Authoring gateway failed: HTTP '+response.status+' '+code+(Number.isInteger(detail.providerStatus)?' providerHTTP'+detail.providerStatus:'')+'; no automatic paid retry');
  }
  const receipt={...await response.json(),inputHash,evaluationId:nonce};receiptValid(receipt,stage,input);
  if(!Number.isFinite(receipt.costUsd)||receipt.costUsd<0||receipt.costUsd>reserve)throw Error('Authoring cost exceeded conservative reservation');
  ledger.reservedUsd-=reserve;ledger.spentUsd+=receipt.costUsd;await persist();await saveJson(file,receipt);
  return receipt;
 };
}
export async function assertAnswerQuality(paper,evidence,{imageHashes={},imageDataByNumber={}}={}) {
 if(evidence?.policy!==POLICY_VERSION||evidence.policyHash!==policyHash||evidence.paperHash!==hash(paper.questions.map(contentHash))||evidence.version!==paper.version||evidence.questions?.length!==39||!evidence.paperAssessment?.result?.pass||evidence.paperAssessment?.result?.patterns?.length)throw Error('Missing or stale independent answer-quality evidence for '+paper.version);
 for(const q of paper.questions) {
  const record=evidence.questions.find(r=>r.number===q.number);
  if(!record?.proof?.pass||record.proof.contentHash!==contentHash(q)||record.proof.blind?.length!==3||!record.heldout)throw Error('Question not independently accepted: '+q.number);
  for(const trial of record.proof.blind) {
   if(!Array.isArray(trial.order)||[...trial.order].sort().join('')!=='0123')throw Error('Invalid blind permutation');
   const projection=blindProjection(q),input={question:projection.question,choices:trial.order.map(i=>projection.choices[i])};
   receiptValid(trial.receipt,'blind',input);
   if(!blindVerdict(trial.receipt.result).pass)throw Error('Blind cue remains: '+q.number);
  }
  const projection=blindProjection(q),held=record.heldout;
  if(new Set(record.proof.blind.map(trial=>trial.receipt.responseId)).size!==3||record.proof.blind.some(trial=>trial.receipt.responseId===held.receipt.responseId))throw Error('Held-out/blind responses were reused');
  if(!Array.isArray(held.order)||[...held.order].sort().join('')!=='0123')throw Error('Invalid held-out permutation');
  receiptValid(held.receipt,'blind',{question:projection.question,choices:held.order.map(i=>projection.choices[i])});
  if(held.correct!==(held.order[held.receipt.result.guess]===letters.indexOf(q.correct)))throw Error('Held-out correctness was altered');
  if(!blindVerdict(held.receipt.result).pass)throw Error('Held-out evaluator detected a cue: '+q.number);
  if(q.number<=4&&(!imageHashes[q.number]||imageHashes[q.number]!==record.imageHash))throw Error('Image changed after evaluation: '+q.number);
  const groundInput={...projection,stimulus:stimulus(q),mode:mode(q),...(q.number<=4?{imageData:imageDataByNumber[q.number]}:{})};
  receiptValid(record.proof.grounded,'ground',groundInput);
  if(!groundingVerdict(q,record.proof.grounded.result).pass)throw Error('Grounding failed: '+q.number);
 }
 receiptValid(evidence.paperAssessment,'paper',paperInput(paper));
 return true;
}
