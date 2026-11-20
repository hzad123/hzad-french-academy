import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessPair,generateDistinct,validatePapers} from '../scripts/lib/tef-reading-quality.mjs';

const paths=[
 'supabase/exams/tef-reading-test01-v2.json',
 'supabase/exams/tef-reading-test02-v2.json',
 ...[3,4,5,6].map(i=>'supabase/exams/tef-reading-test0'+i+'.json')
];
const papers=await Promise.all(paths.map(async f=>JSON.parse(await readFile(f,'utf8'))));
const charts={
 '01':[
  v=>v[0]>v[1]&&v[1]===v[2]&&v[2]===v[3]&&v[4]===v[0],
  v=>v[0]>v[1]&&v[1]<v[2]&&v[2]<v[3]&&v[3]<v[4]&&v[4]>v[0],
  v=>v[0]>v[1]&&v[1]>v[2]&&v[2]<v[3]&&v[3]<v[4]&&v[4]===v[0]],
 '02':[
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]<v[3]&&v[3]>v[4]&&v[4]>v[0],
  v=>v[0]>v[1]&&v[1]>v[2]&&v[2]<v[3]&&v[3]<v[4]&&v[4]>v[0],
  v=>v[0]===v[4]&&v.every((x,i)=>!i||x!==v[i-1])&&Math.max(...v)-Math.min(...v)>=15],
 '03':[
  v=>v[0]<v[1]&&v[1]>v[2]&&v[2]>v[3]&&v[3]<v[4]&&v[4]>v[1],
  v=>v[0]<v[1]&&v[1]===v[2]&&v[2]===v[3]&&v[4]<v[0],
  v=>v[0]>v[1]&&v[1]>v[2]&&v[2]<v[3]&&v[3]<v[4]&&v[4]<v[0]],
 '04':[
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]>v[3]&&v[4]>v[1]&&v[4]>v[3],
  v=>v[0]>v[1]&&v[1]>v[2]&&v[2]<v[3]&&v[3]>v[4],
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]>v[3]&&v[3]>v[4]&&v[4]>v[0]],
 '05':[
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]>v[3]&&v[3]===v[4],
  v=>v[0]<v[1]&&v[1]>v[2]&&v[2]>v[3]&&v[3]>v[4]&&v[4]>v[0],
  v=>v[0]<v[1]&&v[1]>v[2]&&v[2]>v[3]&&v[4]===v[0]],
 '06':[
  v=>v[0]>v[1]&&v[1]>v[2]&&v[2]<v[3]&&v[3]>v[4]&&v[4]>v[2],
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]===v[3]&&v[4]<v[0],
  v=>v[0]<v[1]&&v[1]<v[2]&&v[2]>v[3]&&v[4]===v[1]]
};
test('Six published TEF Reading papers have strict cross-paper duplication and plausibility gate',()=>{
 assert.equal(papers.length,6);
 const r=validatePapers(papers);
 assert.equal(r.questions,240);
 assert.equal(r.ok,true,'Release blocked by '+r.issues.length+' QA issue(s):\n'+r.issues.slice(0,30).join('\n'));
 for(const p of papers){
  const counts=Object.fromEntries('ABCD'.split('').map(c=>[c,p.questions.filter(q=>q.correct===c).length]));
  assert.deepEqual(counts,{A:10,B:10,C:10,D:10},p.id+' key balance');
  for(const [a,b] of [[12,13],[14,15],[16,17]]){
   assert.equal(p.questions[a-1].passage,p.questions[b-1].passage,p.id+' must not reveal answer from paired cloze');
   assert.match(p.questions[a-1].passage,/_{5,} \(1\)/);
   assert.match(p.questions[a-1].passage,/_{5,} \(2\)/);
  }
 }
});
test('Graph answer keys are uniquely supported by the shapes of the plotted lines',()=>{
 for(const p of papers){
  const rules=charts[p.id.slice(-2)];
  for(let n=20;n<=22;n++){
   const q=p.questions[n-1],matches=[];
   q.media.series.forEach((v,i)=>{if(rules[n-20](v))matches.push('Graphique '+(i+1))});
   assert.equal(matches.length,1,p.id+' Q'+n+' ambiguous chart evidence '+matches);
   assert.equal(q.options['ABCD'.indexOf(q.correct)],matches[0],p.id+' Q'+n+' chart key mismatch');
  }
 }
});
test('Semantic duplicate detection ignores number changes and answer order, and generator retries',async()=>{
 const example={number:8,passage:'La mairie propose un atelier de couture accessible aux habitants le lundi à quatorze heures. Chaque personne doit déposer un dossier à l accueil avant cette date pour être admise.',question:'Que doivent faire les personnes intéressées par cette formation ?',options:['S inscrire avant la date limite','Demander un dossier le jeudi','Se présenter sans confirmation','Payer à la fin de la séance'],correct:'A',explanation:'Un dossier préalable est demandé par le service.',semantic:{concept:'advance-registration-required',evidence:'apply-before-deadline'}};
 const renamed={...example,passage:example.passage.replace('lundi','mardi').replace('quatorze','quinze').replace('mairie','commune'),options:[example.options[1],example.options[2],example.options[0],example.options[3]],correct:'C'};
 assert(assessPair(example,renamed).length>0);
 let calls=0;
 const unique={...example,passage:'Les chercheurs ont choisi de comparer le comportement de trois alliages dans un four industriel en ajustant séparément les températures.',question:'Quel paramètre varie entre les essais ?',semantic:{concept:'industrial-alloys-heat-conditions',evidence:'vary-one-temperature'},options:['La température du four','Le fabricant de la machine','Le pays du laboratoire','La longueur du rapport']};
 const result=await generateDistinct({existing:[example],maxAttempts:3,generate:async()=>++calls===1?renamed:unique});
 assert.equal(result.retries,1);assert.equal(calls,2);
 await assert.rejects(()=>generateDistinct({existing:[example],maxAttempts:2,generate:async()=>renamed}),/Publication blocked/);
});
