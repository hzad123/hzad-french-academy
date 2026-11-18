#!/usr/bin/env node
/**
 * REPRODUCIBLE NO-PASSAGE HEURISTIC BASELINE.
 * This is NOT an independent AI reviewer. Never claim it validates semantics.
 * Measures whether option length/extreme wording alone can identify advanced keys.
 */
import fs from 'node:fs';
const letters='ABCD', reports=[];
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function blindGuess(question) {
 // Crucially, this function accepts options ONLY; no passage, author key or explanation.
 return question.options.map((answer,i)=>{
  const x=normalize(answer);
  const extreme=/\b(jamais|toujours|impossible|aucun|aucune|uniquement|exclusivement|garanti|obligatoire|necessairement|tous les|toutes les)\b/.test(x);
  const absolute=/\b(suffit|seul|totalement|definitivement|remplace|entierement)\b/.test(x);
  return {i,score:answer.length/110-(extreme?.7:0)-(absolute?.2:0)};
 }).sort((a,b)=>b.score-a.score||a.i-b.i)[0].i;
}
function evaluate(paper) {
 let picked=0, correctLongest=0, extremeFoils=0;const details=[];
 for(const q of paper.questions.filter(q=>q.number>=25)){
  const predicted=blindGuess({options:q.options});
  const actual=letters.indexOf(q.correct);
  const lengths=q.options.map(x=>x.length);
  const guessed=predicted===actual;
  if(guessed)picked++;
  if(lengths[actual]===Math.max(...lengths))correctLongest++;
  if(q.options.some((o,i)=>i!==actual&&/\b(jamais|toujours|impossible|aucun|aucune|uniquement|exclusivement|garanti)\b/i.test(normalize(o))))extremeFoils++;
  details.push({number:q.number,blindHeuristicChoice:letters[predicted],wasCorrect:guessed});
 }
 return {advanced:15,blindHeuristicCorrect:picked,correctTiedLongest:correctLongest,extremeFoils,details};
}
for(let i=1;i<=6;i++){
 const id=String(i).padStart(2,'0');
 const priorVersion=(i===1||i===5)?'v4':'v3';
 const prior=JSON.parse(fs.readFileSync(`supabase/exams/tcf-reading-${priorVersion}/test-${id}.json`,'utf8'));
 const current=JSON.parse(fs.readFileSync(`supabase/exams/tcf-reading-v5/test-${id}.json`,'utf8'));
 reports.push({test:i,before:evaluate(prior),after:evaluate(current)});
}
const totals=phase=>reports.reduce((r,x)=>({
 blindHeuristicCorrect:r.blindHeuristicCorrect+x[phase].blindHeuristicCorrect,
 correctTiedLongest:r.correctTiedLongest+x[phase].correctTiedLongest,
 extremeFoils:r.extremeFoils+x[phase].extremeFoils
}),{blindHeuristicCorrect:0,correctTiedLongest:0,extremeFoils:0});
const report={method:'deterministic options-only heuristic; not independent AI; no passage or key supplied to predictor',
 questions:90,before:totals('before'),after:totals('after'),perTest:reports,
 disclaimer:'The metric is not an estimate of a real examinee score; higher or lower performance does not establish one-answer validity.'};
const out=process.env.TCF_BLIND_BASELINE_REPORT||'tcf-reading-blind-heuristic-baseline.json';
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({questions:90,before:report.before,after:report.after,
 perTest:reports.map(x=>({test:x.test,before:x.before.blindHeuristicCorrect,after:x.after.blindHeuristicCorrect})),report:out},null,2));
