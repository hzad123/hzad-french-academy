// Options-only heuristics: a blind *mechanical* predictor, not an independent
// French semantic review. It has NO access to any audio or transcript text.
// Gate rejects advanced sets where an adversary can simply choose the longest
// or least-categorical answer too successfully.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const categorical=/\b(jamais|toujours|impossible|aucun|aucune|uniquement|exclusivement|tous|toutes|necessairement|automatiquement|systematiquement)\b/;
function predictLength(options){
 return options.map((t,i)=>({i,score:t.length})).sort((a,b)=>b.score-a.score||a.i-b.i)[0].i;
}
function predictPlausibleLength(options){
 return options.map((t,i)=>{
  const s=normalize(t);
  return {i,score:t.length/110-(categorical.test(s)?.65:0)};
 }).sort((a,b)=>b.score-a.score||a.i-b.i)[0].i;
}
const report=[];
for(let n=2;n<=7;n++){
 const nn=String(n).padStart(2,'0');
 const a=(await import('../curriculum/tef-listening-test'+nn+'-original-q01-20.mjs'))['questions'+nn+'a'];
 const b=(await import('../curriculum/tef-listening-test'+nn+'-original-q21-40.mjs'))['questions'+nn+'b'];
 const questions=[...a,...b];
 assert.equal(questions.length,40);
 const keys={A:0,B:0,C:0,D:0};
 const results={length:[],plausibleLength:[],shortest:[]};
 let uniqueCorrectLongest=0,highExtremeCount=0;
 for(let i=0;i<40;i++){
  const q=questions[i],options=q.options,actual='ABCD'.indexOf(q.correct);
  assert(options.length===4&&actual>=0);
  keys[q.correct]++;
  const lengths=options.map(x=>x.length);
  const max=Math.max(...lengths),min=Math.min(...lengths);
  if(i>=20&&lengths[actual]===max&&lengths.filter(x=>x===max).length===1)uniqueCorrectLongest++;
  const lengthGuess=predictLength(options),plausibleGuess=predictPlausibleLength(options);
  const shortest=lengths.indexOf(min);
  if(lengthGuess===actual)results.length.push(i+1);
  if(plausibleGuess===actual)results.plausibleLength.push(i+1);
  if(shortest===actual)results.shortest.push(i+1);
  if(i>=20&&options.some((t,j)=>j!==actual&&categorical.test(normalize(t))))highExtremeCount++;
 }
 assert.deepEqual(keys,{A:10,B:10,C:10,D:10},'Keys not equally distributed Test '+nn);
 const counts=Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{all:v.length,advanced:v.filter(q=>q>=21).length,hits:v}]));
 assert(counts.length.advanced<=8,'Longest-answer blind guessing too easy in advanced Test '+nn);
 assert(counts.plausibleLength.advanced<=8,'Plausible-longest guessing too easy in advanced Test '+nn);
 assert(counts.plausibleLength.all<=16,'Options-only guessing too easy overall Test '+nn);
 report.push({test:nn,counts,keys,uniqueCorrectLongest,advancedExtremeFoils:highExtremeCount,reviewLevel:'BLIND_MECHANICAL_HEURISTICS_ONLY_NOT_SEMANTIC_REVIEW'});
}
await mkdir('work/tef-listening-batch-02-07',{recursive:true});
await writeFile('work/tef-listening-batch-02-07/blind-option-heuristics.json',JSON.stringify({results:report,notIndependentLanguageReview:true},null,2)+'\n');
console.log(JSON.stringify({tests:6,questions:240,blindedToAudioAndTranscript:true,reports:report},null,2));
