import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createQcHandler} from '../supabase/functions/academy-listening-qc/handler.js';
import {POLICY_VERSION,MODEL,validateInput,validateResult,modelRequest} from '../supabase/functions/academy-listening-qc/contracts.js';
import {hash,policyHash,spokenChoices,stimulus,blindProjection,blindVerdict,groundingVerdict,balancedPositions,
 applyAlternatives,assessQuestion,repairQuestion,binomialUpperTail,attackStatistics,createGatewayProvider,assertAnswerQuality} from '../scripts/lib/listening-answer-qc.mjs';
const uncertain=()=>({guess:0,probabilities:[.25,.25,.25,.25],standsOut:false,cues:[],reason:'These four close interpretations are equally credible without hearing the statement.'});
const q=()=>({number:9,kind:'announcement',question:'Quand le rendez-vous aura-t-il lieu ?',options:['Jeudi à neuf heures.','Mercredi à neuf heures.','Jeudi à dix heures.','Vendredi à dix heures.'],correct:'A',explanation:'PRIVATE_EXPLANATION_NOT_FOR_THE_BLIND_MODEL',segments:[{voice:'female',text:'Question 9.'},{voice:'female',text:'Le rendez-vous prévu mercredi aura finalement lieu jeudi à neuf heures, sans changement de salle.'},{voice:'female',text:'Quand le rendez-vous aura-t-il lieu ?'}],audio:'q-09.mp3',audioSeconds:17,slotSeconds:40});
function ground(input) {
 const index=input.choices.indexOf('Jeudi à neuf heures.');
 return {supportedIndices:[index],ambiguous:false,questionSupported:true,options:input.choices.map((_,i)=>({index:i,supported:i===index,plausibleMisunderstanding:i!==index,evidence:['aura finalement lieu jeudi à neuf heures'],reason:i===index?'L’annonce fixe le nouvel horaire à jeudi neuf heures.':'La réponse confond un jour ou une heure avec le rendez-vous finalement retenu.'})),summary:'Une seule combinaison correspond au nouvel horaire.'};
}
let fixtureId=0;
function receipt(stage,input,result) {return {stage,policy:POLICY_VERSION,policyHash,model:MODEL,responseId:'chatcmpl-unit-test-fixture-'+fixtureId++,inputHash:hash(input),result,costUsd:0.0001,usage:{prompt_tokens:100,completion_tokens:100}};}

test('blind boundary allowlists ONLY question and four choices, never key/transcript/explanation/history',async()=>{
 const item=q(),seen=[];
 const result=await assessQuestion(item,async(stage,input)=>{
  if(stage==='blind') {
   assert.deepEqual(Object.keys(input).sort(),['choices','question']);
   assert(!JSON.stringify(input).includes('PRIVATE_EXPLANATION'));
   assert(!JSON.stringify(input).includes('sans changement de salle'));
   seen.push(input);return receipt(stage,input,uncertain());
  }
  assert(!Object.hasOwn(input,'correct'));assert(!Object.hasOwn(input,'explanation'));
  return receipt(stage,input,ground(input));
 },{seed:'test-isolated'});
 assert(result.pass);assert.equal(seen.length,3);
 assert.throws(()=>validateInput('blind',{...blindProjection(item),transcript:'LEAK'}),/only question/);
 assert.throws(()=>validateInput('blind',{...blindProjection(item),correct:'A'}),/only question/);
 assert.throws(()=>validateInput('blind',{...blindProjection(item),history:[]}),/only question/);
 const request=modelRequest('blind',blindProjection(item));
 assert.equal(request.messages.length,2);assert(!JSON.stringify(request).includes('PRIVATE_EXPLANATION'));
});

test('a conspicuous WRONG choice also rejects an item; author cannot game a blind guess',async()=>{
 let blindCalls=0,authorCalls=0;
 const result=await repairQuestion(q(),async(stage,input)=>{
  if(stage==='blind') {
   blindCalls++;
   const response=blindCalls===1?{guess:3,probabilities:[.05,.1,.05,.8],standsOut:true,cues:[{option:3,cue:'Only balanced sensible answer'}],reason:'A distractor stands out even though it may not be the answer.'}:uncertain();
   return receipt(stage,input,response);
  }
  if(stage==='author') {
   authorCalls++;
   return receipt(stage,input,{question:q().question,choices:q().options,correctIndex:0,explanation:'Le nouvel horaire annoncé est jeudi à neuf heures.',distractorReasons:[1,2,3].map(index=>({index,reason:'Confusion entre une information remplacée et le nouvel horaire.'}))});
  }
  return receipt(stage,input,ground(input));
 },{target:2,seed:'reject-wrong-standout'});
 assert.equal(authorCalls,1);assert.equal(blindCalls,4);assert(result.proof.pass);
 assert.equal(result.question.correct,'C');assert.equal(result.question.options[2],'Jeudi à neuf heures.');
 assert(result.question.explanation.includes('La réponse confond'));assert(!result.question.explanation.includes('PRIVATE_EXPLANATION'));
});

test('grounding rejects ambiguity, implausible distractors and invented evidence',()=>{
 const item=q(),input={...blindProjection(item),stimulus:stimulus(item),mode:'document'},base=ground(input);
 assert(groundingVerdict(item,base).pass);
 const ambiguous=structuredClone(base);ambiguous.supportedIndices=[0,1];assert(!groundingVerdict(item,ambiguous).pass);
 const implausible=structuredClone(base);implausible.options[1].plausibleMisunderstanding=false;assert(!groundingVerdict(item,implausible).pass);
 const invented=structuredClone(base);invented.options[2].evidence=['Un texte inventé qui n’existe pas.'];assert(!groundingVerdict(item,invented).pass);
 const wrongKey={...item,correct:'B'};assert(!groundingVerdict(wrongKey,base).pass);
});

test('bounded regeneration never accepts a failed question or fabricates a passing assessment',async()=>{
 let calls=0;
 const result=await repairQuestion(q(),async(stage,input)=>{
  calls++;
  if(stage==='blind')return receipt(stage,input,{...uncertain(),standsOut:true});
  return receipt(stage,input,{question:q().question,choices:q().options,correctIndex:0,explanation:'Le rendez-vous est déplacé au jeudi à neuf heures.',distractorReasons:[1,2,3].map(index=>({index,reason:'Cette variante confond les précisions de l’annonce.'}))});
 },{target:0,seed:'never-pass',maxAttempts:2});
 assert(result.blocked);assert.equal(result.proof.pass,false);assert.equal(calls,5);
 await assert.rejects(()=>assertAnswerQuality({version:'unreviewed',questions:[result.question]},{}),/Missing or stale/);
});

test('Tests01/02 spoken choices are evaluated as actual text; changed spoken choices invalidate audio',async()=>{
 for(const testNo of ['01','02']) {
  const paper=JSON.parse(await readFile(`supabase/exams/tcf-listening-test${testNo}.json`,'utf8'));
  for(const item of paper.questions.slice(0,8))assert(spokenChoices(item).every(t=>!t.startsWith('Proposition ')));
  const item=paper.questions[0],options=spokenChoices(item),key='ABCD'.indexOf(item.correct);
  const revised=applyAlternatives(item,{question:'Do not leak this replacement prompt into an image item.',choices:options,correctIndex:key,explanation:'Une description précise correspond aux éléments visibles de cette scène.',distractorReasons:[0,1,2,3].filter(i=>i!==key).map(index=>({index,reason:'Description à confronter aux éléments effectivement visibles.'}))},(key+1)%4,'spoken-reorder');
  assert.equal(revised.question,item.question);assert.equal(revised.audioSeconds,null);
  assert.equal(revised.options.length,4);assert.equal(spokenChoices(revised)[(key+1)%4],options[key]);
 }
 assert.throws(()=>validateInput('ground',{...blindProjection(q()),stimulus:'Picture item',mode:'image'}),/actual PNG/);
});

test('whole-paper randomization avoids rotating/greedy four-letter decks and permits natural lengths',()=>{
 const keys=balancedPositions(39,'whole-paper-seed');
 const counts=[0,1,2,3].map(i=>keys.filter(k=>k===i).length);
 assert.equal(Math.max(...counts)-Math.min(...counts),1);
 let permutations=0;for(let i=0;i+4<=keys.length;i+=4)permutations+=new Set(keys.slice(i,i+4)).size===4;
 assert(permutations<7);
 assert(blindVerdict(uncertain()).pass);
 assert(!blindVerdict({...uncertain(),probabilities:[.5,.2,.2,.1]}).pass);
 assert(!blindVerdict({...uncertain(),cues:[{option:1,cue:'Only direct answer'}]}).pass);
});

test('25% is measured on a held-out cohort, not forced per item or inferred from small samples',()=>{
 assert(binomialUpperTail(620,155)>.4);
 assert(binomialUpperTail(620,300)<1e-10);
 const none=attackStatistics([],[]);assert.equal(none.heldout.passes,false);assert.equal(none.heldout.sufficientSample,false);
 assert.throws(()=>validateResult('blind',{...uncertain(),probabilities:[.6,.6,.6,.6]}),/Malformed/);
});

test('only the server-side administrator can invoke the evaluator; no student credits or data API writes',async()=>{
 let requests=0;
 const handler=createQcHandler({serviceKey:'server-only-test',providerKey:'private-provider-key',fetcher:async()=>{requests++;return Response.json({id:'chatcmpl-test',model:MODEL,choices:[{finish_reason:'stop',message:{content:JSON.stringify(uncertain())}}],usage:{prompt_tokens:100,completion_tokens:100}})}});
 const input={stage:'blind',policyHash,input:blindProjection(q())};
 for(const token of ['', 'Bearer student-jwt','Bearer anon-key']) {
  const response=await handler(new Request('https://example/qc',{method:'POST',headers:{Authorization:token},body:JSON.stringify(input)}));assert.equal(response.status,401);
 }
 assert.equal(requests,0);
 const health=await handler(new Request('https://example/qc',{method:'POST',headers:{Authorization:'Bearer server-only-test'},body:'{"stage":"health"}'}));
 assert.equal(health.status,200);assert.equal(requests,0);assert.equal((await health.json()).policyHash,policyHash);
 const bad=await handler(new Request('https://example/qc',{method:'POST',headers:{Authorization:'Bearer server-only-test'},body:JSON.stringify({stage:'blind',input:{...input.input,correct:'A'}})}));
 assert.equal(bad.status,400);assert.equal(requests,0);
 const good=await handler(new Request('https://example/qc',{method:'POST',headers:{Authorization:'Bearer server-only-test'},body:JSON.stringify(input)}));
 assert.equal(good.status,200);assert.equal(requests,1);const body=await good.text();assert(!body.includes('private-provider-key'));assert(!body.includes('server-only-test'));
});

test('offline cost cap fails before spending; provider errors are not automatically retried',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listening-qc-'));
 try {
  let calls=0;
  const provider=await createGatewayProvider({url:'https://example/qc',token:'secret',directory:dir,maxUsd:0,fetcher:async()=>{calls++;return Response.json({})}});
  await assert.rejects(()=>provider('blind',blindProjection(q())),/cost cap/);assert.equal(calls,0);
  const available=await createGatewayProvider({url:'https://example/qc',token:'secret',directory:join(dir,'second'),maxUsd:1,fetcher:async()=>{calls++;return new Response('private error',{status:502})}});
  await assert.rejects(()=>available('blind',blindProjection(q())),/HTTP 502/);assert.equal(calls,1);
 } finally {await rm(dir,{recursive:true,force:true});}
});
