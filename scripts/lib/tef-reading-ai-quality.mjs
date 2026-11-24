// Authoring-only TEF Reading quality gate. Blind and ground reviewers are distinct
// stateless provider calls. Do not call this from a student attempt or UI.
import {createHash} from 'node:crypto';
import {assessPair} from './tef-reading-quality.mjs';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const alphabet='ABCD';
export const blindPayload=q=>({question:q.question,choices:[...q.options]});
export const groundPayload=q=>({source:q.passage,question:q.question,choices:[...q.options]});
export const contentDigest=q=>digest({number:q.number,passage:q.passage,question:q.question,options:q.options,correct:q.correct,media:q.media,semantic:q.semantic});
function identity(receipt,stage){
 if(receipt?.stage!==stage||typeof receipt.id!=='string'||!receipt.id.startsWith('chatcmpl-')||!receipt.model||!receipt.usage)return false;
 return true;
}
export function blindGate(receipt){
 if(!identity(receipt,'blind'))return {pass:false,reason:'missing independent AI receipt'};
 const r=receipt.result||{},p=r.probabilities||[],sorted=[...p].sort((a,b)=>b-a);
 const valid=Number.isInteger(r.guess)&&r.guess>=0&&r.guess<4&&p.length===4&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(p.reduce((a,b)=>a+b,0)-1)<=0.035;
 const credible=Array.isArray(r.plausibility)&&r.plausibility.length===4&&new Set(r.plausibility.map(x=>x.index)).size===4&&r.plausibility.every(x=>x.credible===true);
 // Per-item probabilities from an LLM are diagnostics, not calibrated odds.
 // Reject explicit shortcut cues or noncredible options here. Measure actual
 // blind *accuracy* separately across a sufficiently large unchanged sample;
 // never force the probability of every individual item toward 25%.
 const cue=r.confident===true||!Array.isArray(r.cues)||r.cues.length>0;
 const separation=(sorted[0]??1)-(sorted[1]??0);
 return {pass:valid&&credible&&!cue,reason:{valid,credible,cue,maxProbability:sorted[0],gap:separation}};
}
export function groundGate(question,receipt,{permutation=[0,1,2,3]}={}){
 if(!identity(receipt,'ground'))return {pass:false,reason:'missing independent passage reviewer receipt'};
 if(!Array.isArray(permutation)||new Set(permutation).size!==4)return {pass:false,reason:'bad review permutation'};
 const r=receipt.result||{},marked=alphabet.indexOf(question.correct),target=permutation.indexOf(marked);
 const one=r.questionSupported===true&&r.ambiguous===false&&r.supportedIndices?.length===1&&r.supportedIndices[0]===target;
 const options=Array.isArray(r.options)&&r.options.length===4&&new Set(r.options.map(x=>x.index)).size===4&&r.options.every(x=>Number.isInteger(x.index)&&x.index>=0&&x.index<4&&x.supported===(x.index===target)&&x.plausible===true&&typeof x.reason==='string'&&x.reason.length>=15);
 const normalize=s=>String(s||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
 const quotes=r.options?.flatMap(x=>x.quotes??[])||[];
 const anchored=quotes.length>0&&quotes.every(q=>typeof q==='string'&&q.length>=5&&normalize(question.passage).includes(normalize(q)));
 return {pass:one&&options&&anchored,reason:{one,options,anchored,target,supported:r.supportedIndices}};
}
function preserve(original,next){
 const stable=['number','passage','media','section','group','points'];
 return stable.every(f=>JSON.stringify(original[f]??null)===JSON.stringify(next[f]??null));
}
export async function reviewQuestion(question,{blindReviewer,groundReviewer,shuffle=x=>x}){
 if(typeof blindReviewer!=='function'||typeof groundReviewer!=='function')throw Error('Independent blind and ground AI reviewers are required');
 if(question.number<=7||['illustration','notice','offers','chart-grid'].includes(question.media?.kind)&&question.number<=22)throw Error('Visual questions require a multimodal evidence reviewer');
 if(!alphabet.includes(question.correct)||question.options?.length!==4)throw Error('Invalid answer-bearing question');
 const sequence=shuffle([0,1,2,3]);
 if(sequence.length!==4||new Set(sequence).size!==4)throw Error('Invalid blinded permutation');
 const blindInput={question:question.question,choices:sequence.map(i=>question.options[i])};
 const blind=await blindReviewer(blindInput); // NEVER include source, key, explanation or metadata.
 const b=blindGate(blind);
 // Always perform the independent passage check. Otherwise a failed blind
 // review hides ambiguity and weak evidence from the authoring repair loop.
 const groundInput={source:question.passage,question:question.question,choices:sequence.map(i=>question.options[i])};
 const ground=await groundReviewer(groundInput); // NEVER include key, explanation or blind verdict.
 if(ground.id===blind.id)throw Error('Same receipt used for both AI reviewers');
 const g=groundGate(question,ground,{permutation:sequence});
 const pass=b.pass&&g.pass;
 return {pass,reason:pass?'approved':!b.pass&&!g.pass?'blind+ground':!b.pass?'blind':'ground',blind,ground,b,g,contentDigest:contentDigest(question)};
}
/**
 * Regenerates automatically when weak distractors, source ambiguity, or semantic
 * duplicates are found. The callback can use the private authoring model; the two
 * reviewers remain separate stateless calls. No unvalidated fallback is returned.
 */
export async function generateQualityChecked({generate,regenerate,existing=[],blindReviewer,groundReviewer,maxAttempts=6,shuffle}){
 if(typeof generate!=='function'||typeof regenerate!=='function')throw Error('Both content generator and repair callback required');
 let candidate=await generate();
 const failures=[];
 for(let attempt=0;attempt<=maxAttempts;attempt++){
  if(!candidate?.options||candidate.options.length!==4||!candidate.semantic?.concept||!candidate.semantic?.evidence)throw Error('Generator supplied invalid question');
  const conflicts=existing.flatMap(q=>assessPair(q,candidate));
  let review=null;
  if(!conflicts.length)review=await reviewQuestion(candidate,{blindReviewer,groundReviewer,shuffle});
  if(!conflicts.length&&review?.pass)return {question:candidate,review,attempts:attempt,failures};
  const feedback={attempt,duplicates:conflicts,reason:review?.reason||'duplicate',blindCues:review?.blind?.result?.cues||[],groundIssues:review?.g?.reason||null};
  failures.push(feedback);
  if(attempt>=maxAttempts)break;
  const newer=await regenerate({candidate,feedback,attempt});
  if(!preserve(candidate,newer))throw Error('AI repair changed source, visual, section, topic or semantic fingerprint');
  candidate=newer;
 }
 throw Error('TEF Reading publication blocked: cannot produce a validated question after '+(maxAttempts+1)+' attempts');
}
