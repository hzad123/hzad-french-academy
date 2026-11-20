import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePapers} from '../scripts/lib/tef-reading-quality.mjs';
import {blindGate,groundGate,reviewQuestion,generateQualityChecked,blindPayload,groundPayload} from '../scripts/lib/tef-reading-ai-quality.mjs';
const oldFiles=['tef-reading-test01-v2.json','tef-reading-test02-v2.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'.json')];
const newFiles=['tef-reading-test01-v3.json','tef-reading-test02-v3.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'-v2.json')];
const load=async f=>JSON.parse(await readFile('supabase/exams/'+f,'utf8'));
const [before,after]=await Promise.all([Promise.all(oldFiles.map(load)),Promise.all(newFiles.map(load))]);
test('Six TEF Reading revisions preserve source, graphics, answer keys, original topic and all 40 positions',()=>{
 assert.equal(before.length,6);assert.equal(after.length,6);
 let revised=0;
 for(let i=0;i<6;i++){
  const a=before[i],b=after[i];
  assert.equal(a.id,b.id);assert.equal(a.questions.length,40);assert.equal(b.questions.length,40);
  assert.equal(a.seconds,b.seconds);assert.equal(a.maxPoints,b.maxPoints);
  assert.notEqual(a.version,b.version);
  const counts=Object.fromEntries('ABCD'.split('').map(x=>[x,b.questions.filter(q=>q.correct===x).length]));
  assert.deepEqual(counts,{A:10,B:10,C:10,D:10});
  for(let j=0;j<40;j++){
   const x=a.questions[j],y=b.questions[j];
   for(const k of ['passage','media','section','group','points','correct'])assert.deepEqual(x[k],y[k],b.id+' Q'+(j+1)+' changed '+k);
   if(![28,29,38,39].includes(j+1))assert.equal(x.options['ABCD'.indexOf(x.correct)],y.options['ABCD'.indexOf(y.correct)]);
   if(j>=22&&! [28,29,38,39].includes(j+1))assert.equal(x.question,y.question,'Unexpected question-stem change');
   if(j<22)assert.deepEqual(x.options,y.options);
   else{
    const oldWrong=x.options.filter((_,index)=>'ABCD'[index]!==x.correct);
    const newWrong=y.options.filter((_,index)=>'ABCD'[index]!==y.correct);
    for(let k=0;k<3;k++)assert.notEqual(oldWrong[k],newWrong[k],b.id+' Q'+(j+1)+' foil '+k+' not revised');
    revised++;
   }
  }
 }
 assert.equal(revised,108);
 const r=validatePapers(after);
 assert.equal(r.ok,true,r.issues.slice(0,15).join('\n'));
});
test('Blind input can never contain the passage, key, answer explanation or source metadata',()=>{
 const q=after[0].questions[38],projection=blindPayload(q);
 assert.deepEqual(Object.keys(projection),['question','choices']);
 assert(!JSON.stringify(projection).includes(q.passage));
 assert(!JSON.stringify(projection).includes(q.explanation));
 assert(!JSON.stringify(projection).includes('"correct"'));
 assert.deepEqual(Object.keys(groundPayload(q)),['source','question','choices']);
});
const receipt=(stage,result,n)=>({stage,id:'chatcmpl-unit-'+stage+n,model:stage==='blind'?'gpt-5-mini':'gpt-5.1',usage:{prompt_tokens:500,completion_tokens:100},result});
const blind=(good=true)=>receipt('blind',{guess:0,probabilities:good?[.27,.26,.24,.23]:[.88,.06,.04,.02],confident:!good,cues:good?[]:['Only one option is plausible'],reason:'Observed plausible alternatives',plausibility:[0,1,2,3].map(index=>({index,credible:good,reason:'Related reading interpretation'}))},1);
const ground=q=>receipt('ground',{supportedIndices:[0],ambiguous:false,questionSupported:true,options:[0,1,2,3].map(index=>({index,supported:index===0,plausible:true,reason:'The answer follows the documented distinction and scope.',quotes:[q.passage.slice(0,22)]})),summary:'Only one answer supported'},2);
test('Blind reviewer flags conspicuous answers, and grounded reviewer requires exactly one supported key',()=>{
 assert(blindGate(blind(true)).pass);assert(!blindGate(blind(false)).pass);
 const q=structuredClone(after[0].questions[38]);q.correct='A';
 assert(groundGate(q,ground(q)).pass);
 assert(!groundGate(q,{...ground(q),result:{...ground(q).result,ambiguous:true}}).pass);
});
test('Model calls keep blind and source grounding isolated and never send correct answer to the second reviewer',async()=>{
 const q=structuredClone(after[0].questions[38]);q.correct='A';
 const calls=[];
 const proof=await reviewQuestion(q,{blindReviewer:async inp=>{calls.push({stage:'blind',inp});return blind(true)},groundReviewer:async inp=>{calls.push({stage:'ground',inp});return ground(q)}});
 assert(proof.pass);assert.deepEqual(Object.keys(calls[0].inp),['question','choices']);
 assert.deepEqual(Object.keys(calls[1].inp),['source','question','choices']);
 assert(!calls[0].inp.source);assert(!calls[1].inp.correct);
 const rejected=await reviewQuestion(q,{blindReviewer:async()=>blind(false),groundReviewer:async()=>{throw Error('Source reviewer called after blind rejection')}});
 assert.equal(rejected.pass,false);assert.equal(rejected.reason,'blind');
});
test('Generator revises on blind failure, retains the original passage and fails closed after retries',async()=>{
 const q=structuredClone(after[0].questions[38]);q.correct='A';
 let tries=0;
 const r=await generateQualityChecked({generate:async()=>q,regenerate:async({candidate})=>({...candidate,options:['Un autre effet possible','La réponse reste plausible','Une autre hypothèse','Une variation du même contexte']}),blindReviewer:async()=>++tries===1?blind(false):blind(true),groundReviewer:async()=>ground(q),maxAttempts:2});
 assert.equal(r.attempts,1);assert.equal(tries,2);assert.equal(r.question.passage,q.passage);
 await assert.rejects(()=>generateQualityChecked({generate:async()=>q,regenerate:async({candidate})=>candidate,blindReviewer:async()=>blind(false),groundReviewer:async()=>ground(q),maxAttempts:1}),/publication blocked/);
});
