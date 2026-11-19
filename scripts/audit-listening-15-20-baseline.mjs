// Source-only baseline audit. This does not approve content or publish a bank.
// It measures answer giveaways, duplicated structures and incomplete source checks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const letters='ABCD', papers=[], rows=[], texts=new Map(), mistakes=[];
function norm(s){return s.normalize('NFKC').toLocaleLowerCase('fr').replace(/[^\\p{L}\\p{N}]+/gu,' ').trim()}
function tokens(s){return norm(s).split(' ').filter(w=>w.length>3)}
for(let n=15;n<=20;n++){
 const id=String(n).padStart(2,'0'), file='supabase/exams/tcf-listening-test'+id+'.json';
 const p=JSON.parse(await readFile(file,'utf8'));
 assert.equal(p.id,'tcf-listening-'+id);assert.equal(p.questions.length,39);assert.equal(p.seconds,2100);
 const seen=new Set();let long=0,short=0,missing=0;
 for(const q of p.questions){
  assert.equal(q.number,rows.filter(r=>r.test===n).length+1);
  assert.equal(q.options.length,4);assert(letters.includes(q.correct));
  assert.equal(new Set(q.options.map(norm)).size,4);
  const k=letters.indexOf(q.correct),lengths=q.options.map(x=>norm(x).length),max=Math.max(...lengths),min=Math.min(...lengths);
  const correctLong=lengths[k]===max, correctShort=lengths[k]===min;
  if(q.number>8){long+=Number(correctLong);short+=Number(correctShort)}
  assert(q.audioSeconds>0&&q.audioSeconds+12<=q.slotSeconds,'Response window: '+id+'/'+q.number);
  const t=norm(q.transcript),digest=createHash('sha256').update(t).digest('hex');
  if(seen.has(digest))mistakes.push({test:n,q:q.number,issue:'exact repeated transcript within paper'});
  seen.add(digest);
  const copy=texts.get(digest);if(copy)mistakes.push({test:n,q:q.number,issue:'exact repeated transcript across papers',other:copy});else texts.set(digest,{test:n,q:q.number});
  const matching=norm(q.options[k]);const lexical=tokens(matching).filter(w=>tokens(q.transcript).includes(w)).length;
  if(!q.explanation||!q.transcript||!q.segments?.length)missing++;
  rows.push({test:n,question:q.number,kind:q.kind,key:q.correct,correctLongest:correctLong,correctShortest:correctShort,answerChars:lengths[k],shortestChars:min,longestChars:max,answerTranscriptTokenOverlap:lexical,transcriptDigest:digest});
 }
 assert.equal(p.questions.reduce((x,q)=>x+q.slotSeconds,0),2100);
 papers.push({test:n,questions:39,lateQuestions:17,writtenQuestions:31,correctLongestWritten:long,correctShortestWritten:short,missingContent:missing});
}
const thematic=[];
for(let q=9;q<=39;q++){
 const candidates=rows.filter(x=>x.question===q);
 const stems=[];
 for(let n=15;n<=20;n++){
  const p=JSON.parse(await readFile('supabase/exams/tcf-listening-test'+String(n).padStart(2,'0')+'.json','utf8'));
  stems.push(norm(p.questions[q-1].question));
 }
 if(new Set(stems).size===1)thematic.push({question:q,issue:'identical question wording in all six exams',stem:stems[0]});
}
const report={gate:'DIAGNOSTIC_ONLY_NOT_PUBLICATION_APPROVAL',tests:papers,questions:rows.length,correctLongestWritten:papers.reduce((a,p)=>a+p.correctLongestWritten,0),correctShortestWritten:papers.reduce((a,p)=>a+p.correctShortestWritten,0),sourceProblems:mistakes,repeatedStemsAcrossAllSix:thematic,notes:['No independent transcript comprehension or distractor plausibility review performed','Original audio and pictures not edited','No new bank or database pointer written']};
await mkdir('reports',{recursive:true});
await writeFile('reports/tcf-listening-15-20-baseline.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,sourceProblems:mistakes.slice(0,20),repeatedStemsAcrossAllSix:thematic.slice(0,20)},null,2));
