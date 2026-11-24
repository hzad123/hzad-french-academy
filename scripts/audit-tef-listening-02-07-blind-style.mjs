// Blind option-only diagnostic: no transcript, answer key, explanation, audio,
// or other paper data is read until guesses have been frozen. This measures
// cheap detectable style cues; it does NOT replace independent human QA.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const pad=n=>String(n).padStart(2,'0');
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const absolute=/\b(toujours|jamais|seulement|uniquement|tous|aucun|necessairement|exclusivement|integralement|systematiquement|automatiquement|obligatoirement|definitivement|aucune|totalement)\b/g;
const absurd=/\b(impossible|interdit|eliminer|supprimer|annuler|remplacer|garantit|garantie|preuve|exiger|refuser|forcer|abandonner|renoncer)\b/g;
const nuanced=/\b(avant|selon|parfois|certains|certaines|plutot|mais|sans|sous|conditions|limites|adapter|adapte|reel|reelle|effets|verifier|examiner|distinguer|tenir compte|mesurer|en fonction)\b/g;
const seededTie=(n,i)=>Number.parseInt(createHash('sha256').update('TEF-BLIND-'+n+'-'+i).digest('hex').slice(0,8),16)/2**32;
function scoreOption(str,all,stem,n,i){
 const words=normalize(str).split(/\s+/).length;
 const other=all.map(x=>normalize(x).split(/\s+/).length).sort((a,b)=>a-b);
 const median=(other[1]+other[2])/2;
 const a=[...normalize(str).matchAll(absolute)].length;
 const b=[...normalize(str).matchAll(absurd)].length;
 const c=[...normalize(str).matchAll(nuanced)].length;
 const lengthBias=(words-median)/Math.max(3,median);
 const lexicalOverlap=new Set(normalize(stem).split(/\s+/).filter(w=>w.length>=6));
 const overlap=normalize(str).split(/\s+/).filter(w=>lexicalOverlap.has(w)).length;
 return -1.75*a-.65*b+.58*Math.min(c,2)+.40*lengthBias+.13*overlap+seededTie(n,i)*.01;
}
const batches=[];
for(let t=2;t<=7;t++){
 const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+pad(t)+'-v1.json','utf8'));
 // Stage 1: BLIND. Freeze predictions and subjective style cues while keys
 // and transcripts are NOT referenced.
 const blind=bank.questions.map(q=>{
  const visible={n:q.number,question:q.question,options:q.options};
  const scores=visible.options.map((str,i)=>scoreOption(str,visible.options,visible.question,t*100+q.number,i));
  const guess=scores.indexOf(Math.max(...scores));
  return {n:q.number,visibleHash:createHash('sha256').update(JSON.stringify(visible)).digest('hex'),guess:'ABCD'[guess],scores:scores.map(x=>+x.toFixed(3)),margin:+(Math.max(...scores)-[...scores].sort((a,b)=>b-a)[1]).toFixed(3)};
 });
 // Stage 2: reveal keys only after all 40 blind predictions frozen.
 const results=blind.map(b=>({...b,key:bank.questions[b.n-1].correct,hit:b.guess===bank.questions[b.n-1].correct}));
 const late=results.filter(r=>r.n>=21);
 const accuracy=results.filter(r=>r.hit).length/40,advanced=late.filter(r=>r.hit).length/late.length;
 batches.push({test:t,accuracy:+accuracy.toFixed(3),advancedAccuracy:+advanced.toFixed(3),questions:results});
}
const summary={status:'BLIND_STYLE_HEURISTIC_NOT_INDEPENDENT_HUMAN_OR_AI_REVIEW',method:'zero-transcript style-based option predictor; frozen guesses before scoring',overallAccuracy:+(batches.flatMap(x=>x.questions).filter(x=>x.hit).length/240).toFixed(3),advancedAccuracy:+(batches.flatMap(x=>x.questions.filter(q=>q.n>=21)).filter(q=>q.hit).length/120).toFixed(3),tests:batches};
await mkdir('work/tef-listening-02-07',{recursive:true});
await writeFile('work/tef-listening-02-07/blind-style-benchmark.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({overallAccuracy:summary.overallAccuracy,advancedAccuracy:summary.advancedAccuracy,perPaper:batches.map(x=>({test:x.test,overall:x.accuracy,advanced:x.advancedAccuracy}))},null,2));
