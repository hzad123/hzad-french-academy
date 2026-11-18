#!/usr/bin/env node
/**
 * Independent pre-publication review of HZad-authored TCF reading papers.
 * No student data; no keys/answers in blind-review model prompts.
 * FAIL CLOSED on missing API credentials, malformed reviewer replies or a failed item.
 *
 * Examples:
 *   node scripts/review-tcf-reading-ai.mjs --sample
 *   node scripts/review-tcf-reading-ai.mjs --full
 *   node scripts/review-tcf-reading-ai.mjs --lint
 * Credential: OPENAI_API_KEY_TCF_REVIEW, supplied through protected CI secret.
 * This is not a student-facing AI function and never changes grading or credits.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const command=process.argv.includes('--full')?'full':process.argv.includes('--lint')?'lint':'sample';
const model=process.env.TCF_REVIEW_MODEL||'gpt-4o-mini';
const key=process.env.OPENAI_API_KEY_TCF_REVIEW;
const reportFile=process.env.TCF_REVIEW_REPORT||'tcf-reading-review-report.json';
const paths=Array.from({length:6},(_,i)=>path.join(root,'supabase/exams/tcf-reading-v5',`test-${String(i+1).padStart(2,'0')}.json`));
const papers=paths.map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
const items=papers.flatMap(p=>p.questions.map(q=>({test:p.id,version:p.version,...q})));
const target=items.filter(q=>command==='full'?(q.number>=25&&q.number<=39):[30,37,39].includes(q.number));
const ban=/\b(jamais|toujours|impossible|aucun|aucune|uniquement|exclusivement|completement|garanti(?:e|s|es)?|sans aucune)\b/i;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const staticReport=[];
for(const q of items){
 const lengths=q.options.map(s=>s.length),index='ABCD'.indexOf(q.correct);
 const notes=[];
 if(q.options.length!==4||index<0||new Set(q.options.map(normalize)).size!==4)notes.push('invalid-four-choice-schema');
 if(q.number>=25&&lengths[index]===Math.max(...lengths)&&lengths[index]>1.4*Math.min(...lengths))notes.push('answer-length-cue');
 if(q.number>=25&&q.options.some((o,j)=>index!==j&&ban.test(normalize(o))))notes.push('extreme-distractor');
 const avg=lengths.reduce((a,b)=>a+b,0)/4;
 if(q.number>=25&&lengths.some(l=>l<avg*.45))notes.push('short-outlier');
 if(notes.length)staticReport.push({test:q.test,number:q.number,flags:notes});
}
const structural=[];
for(const p of papers){
 if(p.questions.length!==39||p.seconds!==3600||p.maxPoints!==699||p.questions.reduce((a,q)=>a+q.points,0)!==699)
  structural.push(p.id+' invalid structure');
 for(let i=0;i<39;i++)if(p.questions[i].number!==i+1)structural.push(p.id+' invalid numbering');
 const keys=p.questions.reduce((a,q)=>(a[q.correct]=(a[q.correct]||0)+1,a),{A:0,B:0,C:0,D:0});
 if(Math.min(...Object.values(keys))<7||Math.max(...Object.values(keys))>12)structural.push(p.id+' answer distribution '+JSON.stringify(keys));
}
const results={mode:command,model,checkedAt:new Date().toISOString(),
  static:{papers:papers.length,items:items.length,advanced:items.filter(q=>q.number>=25).length,
    warnings:staticReport,errors:structural},aiReview:{status:command==='lint'?'not-run':'pending',questions:target.length,items:[]},passed:false};

if(command==='lint'){
 results.passed=!structural.length;
 fs.writeFileSync(reportFile,JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({status:'static-only-not-independent-AI',papers:6,items:234,advanced:90,
  structuralFailures:structural.length,staticFlags:staticReport.length,reportFile},null,2));
 process.exit(results.passed?0:1);
}
if(!key){
 results.aiReview.status='blocked-missing-review-key';
 fs.writeFileSync(reportFile,JSON.stringify(results,null,2)+'\n');
 console.error('Independent AI quality gate BLOCKED: missing protected OPENAI_API_KEY_TCF_REVIEW. No test was approved.');
 process.exit(2);
}
const letters=['A','B','C','D'];
function orderFor(q,round){
 const hash=crypto.createHash('sha256').update(q.test+':'+q.number+':'+round).digest();
 const indices=[0,1,2,3];
 for(let i=indices.length-1;i>0;i--){const j=hash[i]%(i+1);[indices[i],indices[j]]=[indices[j],indices[i]];}
 return indices;
}
async function reviewer(system,payload){
 const ac=new AbortController();
 const timeout=setTimeout(()=>ac.abort(),45000);
 try{
  const response=await fetch('https://api.openai.com/v1/chat/completions',{
   method:'POST',signal:ac.signal,
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({model,temperature:0,response_format:{type:'json_object'},
    messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],
    max_tokens:500})
  });
  if(!response.ok)throw Error('Review API request failed: HTTP '+response.status);
  const json=await response.json();
  const content=json.choices?.[0]?.message?.content;
  if(typeof content!=='string')throw Error('Missing reviewer reply');
  return JSON.parse(content);
 }finally{clearTimeout(timeout);}
}
const blindSystem=`You are an INDEPENDENT exam-item reviewer. You have no passage, key, explanation, or prior conversation.
Receive ONLY a French question and four alternatives. Attempt to infer a likely correct answer WITHOUT source.
Return JSON exactly: {"choice":"A|B|C|D","confidence":0.0-1.0,"cue":"brief clue or no clue","guessable":true|false}.
Reject easy elimination, implausible alternatives, conspicuous balanced/long answer, and repeated wording. Do not ask to see the text.`;
const groundedSystem=`You are a SECOND independent French reading examiner. You see the full passage, question and options but NO author key or explanation.
Evaluate each option against evidence, potential ambiguity, and unintended second correct answers.
Return JSON exactly: {"correct":"A|B|C|D|NONE|MULTIPLE","confidence":0.0-1.0,"evidence":"short textual rationale","distractors":[{"choice":"A|B|C|D","plausible":true|false,"reason":"precise, sourced misconception"}],"requiresReading":true|false,"ambiguity":true|false}.
Be strict. When no single answer is defensibly correct, use MULTIPLE or NONE. Do not inflate confidence or pretend the other options are plausible.`;
try {
 for(const q of target){
  const blind=[];
  for(let round=0;round<3;round++){
   const permutation=orderFor(q,round);
   const response=await reviewer(blindSystem,{
    question:q.question,
    options:permutation.map((index,i)=>({choice:letters[i],text:q.options[index]}))
   });
   const chosen=letters.indexOf(response.choice);
   if(chosen<0||typeof response.confidence!=='number'||typeof response.guessable!=='boolean')throw Error('Invalid blind reviewer output');
   const original=permutation[chosen];
   blind.push({round,choice:response.choice,confidence:response.confidence,
    matchedAuthorKey:letters[original]===q.correct,guessable:response.guessable,cue:String(response.cue||'').slice(0,300)});
  }
  const grounded=await reviewer(groundedSystem,{
   passage:q.passage,question:q.question,
   options:q.options.map((text,i)=>({choice:letters[i],text}))
  });
  if(!letters.includes(grounded.correct)&&!['NONE','MULTIPLE'].includes(grounded.correct))throw Error('Invalid grounded reviewer output');
  const correct=grounded.correct===q.correct&&!grounded.ambiguity&&grounded.requiresReading===true;
  const foils=Array.isArray(grounded.distractors)&&grounded.distractors.length===4
   &&grounded.distractors.filter(x=>x.choice!==q.correct).every(x=>x.plausible===true);
  const blindCue=blind.some(x=>x.matchedAuthorKey&&(x.guessable===true||x.confidence>=.70));
  const repeat=blind.filter(x=>x.matchedAuthorKey).length>=2;
  const accepted=correct&&foils&&!blindCue&&!repeat;
  const item={test:q.test,number:q.number,key:q.correct,accepted,blind,grounded,
   failures:[!correct?'grounded-key-or-reading-failure':null,!foils?'implausible-foil':null,
    blindCue?'blind-key-confidence':null,repeat?'repeated-blind-key':null].filter(Boolean)};
  results.aiReview.items.push(item);
  console.log(`${q.test} Q${q.number}: ${accepted?'PASS':'FAIL'} (${item.failures.join(',')})`);
 }
 results.aiReview.status='completed';
 results.passed=!structural.length&&!staticReport.some(x=>x.flags.includes('invalid-four-choice-schema'))
   &&results.aiReview.items.every(x=>x.accepted);
} catch(error){
 results.aiReview.status='incomplete-error';
 results.aiReview.error=error.message;
 results.passed=false;
 console.error('Review stopped without approving remaining items: '+error.message);
}finally{
 fs.writeFileSync(reportFile,JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({status:results.aiReview.status,reviewed:results.aiReview.items.length,
  accepted:results.aiReview.items.filter(x=>x.accepted).length,
  failed:results.aiReview.items.filter(x=>!x.accepted).length,
  staticFlags:staticReport.length,passed:results.passed,reportFile},null,2));
}
if(!results.passed)process.exit(1);
