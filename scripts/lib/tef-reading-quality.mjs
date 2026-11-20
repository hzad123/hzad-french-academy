// Publication gate for TEF Reading authored banks. No network calls, AI, or hidden key access.
import {createHash} from 'node:crypto';

const stop=new Set('a au aux avec ce ces cet cette chaque dans de des du elle elles en et est il ils la le les leur leurs lui mais ne ni nos notre nous on ou par pas pour que qui qu se ses son sous sur un une vous votre vos y plus moins lorsque avant apres afin alors entre soit tout toute tous toutes quelle quel quelles quels quels sont etait etre comme fait cette cela ainsi toutefois cependant notamment devant aussi autour parmi reste encore meme depuis quand comment pourquoi ou lequel laquelle auxquels auxquelles'.split(' '));
export const normalized = input=>String(input??'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[0-9]+([,.][0-9]+)?/g,' # ').replace(/[^a-z#\\s]/g,' ').replace(/\\s+/g,' ').trim();
const tokens=x=>normalized(x).split(' ').filter(t=>t.length>2&&!stop.has(t)&&t!=='#');
const jaccard=(a,b)=>{const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;let common=0;for(const t of A)if(B.has(t))common++;return common/(A.size+B.size-common)};
const ngrams=(a,n=3)=>{const out=[];for(let i=0;i+n<=a.length;i++)out.push(a.slice(i,i+n).join(' '));return out};
const hash=x=>createHash('sha256').update(x).digest('hex');
const oneSeriesShape=s=>{const lo=Math.min(...s),hi=Math.max(...s),den=(hi-lo)||1;return s.map(x=>Math.round((x-lo)/den*100)/100).join(',')};
function seriesShape(series){
 return series.map(oneSeriesShape).sort().join('|');
}
function fingerprint(q){
 return {
  passage:normalized(q.passage),
  question:normalized(q.question),
  options:q.options.map(normalized).sort().join('|'),
  sourceHash:hash(normalized(q.passage||JSON.stringify(q.media||{}))),
  media:q.media?.kind==='chart-grid'?seriesShape(q.media.series):normalized(JSON.stringify(q.media||{})),
  keyConcept:normalized(q.semantic?.concept||''),
  keyEvidence:normalized(q.semantic?.evidence||''),
  tok:tokens((q.passage||'')+' '+q.question),
  shingle:ngrams(tokens(q.passage||'')),
 };
}
const suspicious=/\\b(toujours|jamais|obligatoirement|exclusivement|aucunement|impossible|sans aucune|sans aucun|toutes les|tous les|n importe quel)\\b/i;
function checkAnswerQuality(q){
 const errs=[];const lengths=q.options.map(o=>tokens(o).length);
 if(q.number>=23){
  const max=Math.max(...lengths),min=Math.min(...lengths);
  if(min<=1||max>=Math.max(7, min*2.8))errs.push('answer options have an obvious length imbalance');
  const distractors=q.options.filter((o,i)=>'ABCD'[i]!==q.correct);
  if(distractors.filter(o=>suspicious.test(normalized(o))).length>=2)errs.push('multiple implausible absolute distractors');
 }
 if(q.number>=33&&tokens(q.passage).length<85)errs.push('advanced reading passage is too short');
 if(!q.explanation||q.explanation.length<30)errs.push('missing grounded answer explanation');
 return errs;
}
export function assessPair(a,b){
 const A=fingerprint(a),B=fingerprint(b);
 const failures=[];
 if(A.passage&&A.passage===B.passage)failures.push('same passage');
 if(A.question===B.question && A.options===B.options)failures.push('identical question plus options');
 if(A.passage&&A.options===B.options && A.passage===B.passage)failures.push('same answer exercise');
 if(a.media?.kind==='chart-grid'&&b.media?.kind==='chart-grid'){
  if(A.media===B.media)failures.push('same scale-independent graph grid');
  const aa=new Set(a.media.series.map(oneSeriesShape)),bb=new Set(b.media.series.map(oneSeriesShape));
  for(const line of aa)if(bb.has(line)){failures.push('reused individual graph shape after numerical rescaling');break}
 }
 if(a.media?.kind==='offers'&&b.media?.kind==='offers'&&A.media===B.media)failures.push('same offer visuals');
 const contextOverlap=jaccard(A.tok,B.tok);
 const shingleOverlap=jaccard(A.shingle,B.shingle);
 if(A.tok.length>=12&&B.tok.length>=12&&(contextOverlap>=0.78||shingleOverlap>=0.65))failures.push('near-duplicate content (token or 3-gram overlap)');
 if(A.keyConcept&&A.keyConcept===B.keyConcept && (!A.keyEvidence||!B.keyEvidence||A.keyEvidence===B.keyEvidence))failures.push('same semantic question concept/evidence');
 return failures;
}
export function validatePapers(papers,{requireSemantic=true,checkQuality=true}={}){
 const issues=[],all=[];
 const ids=new Set(),versions=new Set();
 for(const paper of papers){
  if(ids.has(paper.id))issues.push('duplicate test id: '+paper.id);
  ids.add(paper.id);
  if(versions.has(paper.version))issues.push('duplicate version: '+paper.version);
  versions.add(paper.version);
  if(paper.seconds!==3600||paper.questions?.length!==40)issues.push(paper.id+': not 40 questions / 60 minutes');
  let points=0;
  for(let i=0;i<(paper.questions||[]).length;i++){
   const q=paper.questions[i],at=paper.id+' Q'+(i+1);
   const labels=q.media?.kind==='offers'||q.media?.kind==='chart-grid';
   const distinct=labels?new Set(q.options).size===4:new Set(q.options.map(normalized)).size===4;
   if(q.number!==i+1||q.options?.length!==4||!distinct||!('ABCD'.includes(q.correct)||''))issues.push(at+': invalid question/choices');
   if(requireSemantic&&(!q.semantic?.concept||!q.semantic?.evidence))issues.push(at+': missing editorial semantic fingerprint');
   if(checkQuality)for(const issue of checkAnswerQuality(q))issues.push(at+': '+issue);
   if(i<7&&!['notice','illustration'].includes(q.media?.kind))issues.push(at+': missing opening illustration');
   if(i>=17&&i<=18&&(q.media?.kind!=='offers'||q.media.items?.length!==4))issues.push(at+': missing offer cards');
   if(i>=19&&i<=21&&(q.media?.kind!=='chart-grid'||q.media.series?.length!==4||q.media.series.some(s=>s.length!==5||s.some(v=>!Number.isFinite(v)||v<0||v>34))))issues.push(at+': invalid plotted graph grid');
   points+=(q.points||0);
   all.push({paper:paper.id,q});
  }
  if(points!==40)issues.push(paper.id+': total points != 40');
 }
 // Compare all pairings across different tests, including differing question numbers.
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const A=all[i],B=all[j];if(A.paper===B.paper)continue;
  const problems=assessPair(A.q,B.q);
  for(const issue of problems)issues.push(A.paper+' Q'+A.q.number+' vs '+B.paper+' Q'+B.q.number+': '+issue);
 }
 return {ok:issues.length===0,issues,questions:all.length};
}
/**
 * Authoring-time generation adapter: automatically rejects duplicates and asks a
 * supplied content generator for a fresh candidate, up to maxAttempts.
 * Never publishes an unvalidated fallback; if no new acceptable draft is produced,
 * it fails closed and requires editorial intervention. It does NOT invoke an AI.
 */
export async function generateDistinct({generate,existing=[],maxAttempts=6}){
 if(typeof generate!=='function')throw Error('A content generator callback is required');
 const failures=[];
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const candidate=await generate({attempt,feedback:failures.slice(-5)});
  if(!candidate||!candidate.options||candidate.options.length!==4||!candidate.semantic?.concept||!candidate.semantic?.evidence)throw Error('Generator supplied an invalid question or missing semantic intent/evidence');
  const conflicts=existing.flatMap(q=>assessPair(q,candidate));
  if(!conflicts.length)return {question:candidate,retries:attempt};
  failures.push(...conflicts);
 }
 throw new Error('Publication blocked: generated question remains duplicative after '+maxAttempts+' attempts: '+failures.slice(-4).join(', '));
}
