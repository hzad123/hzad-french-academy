import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BANK,resolveTest,publicTest,publicCatalog} from '../supabase/functions/academy-tef-speaking/bank.js';
import {createTefSpeakingProvider,tefSpeakingNclc,validateTefFeedback,speakingTurns} from '../supabase/functions/academy-tef-speaking/provider.js';
import {createTefSpeakingHandler} from '../supabase/functions/academy-tef-speaking/handler.js';
import {createTefAudioStorage} from '../supabase/functions/academy-tef-speaking/storage.js';
import {encodeWav} from '../src/ai/audio.js';
const uuid1='11111111-1111-4111-8111-111111111111';
const uuid2='22222222-2222-4222-8222-222222222222';
const wav=Buffer.from(encodeWav(Float32Array.from({length:16000},(_,i)=>Math.sin(i/9)*.15),16000)).toString('base64');
const bank=BANK;
const raw=(ids)=>({score:487,estimatedLevel:'B2',summary:'Le candidat explique son choix, mais développe peu ses exemples.',
 criteria:['linguistic','pragmatic','sociolinguistic'].map((id,i)=>({id,turnId:ids[i%ids.length],reason:'Un fait concret montre une difficulté d’expression.',improvement:'Précisez votre argument. ' .repeat(40)})),
 mistakes:[],recommendations:[{advice:'Posez une question plus ciblée et donnez des détails. '.repeat(15),example:'Pourriez-vous préciser le prix et les horaires ?'}]});
const turns=[
 {id:uuid1,phase:0,kind:'turn',status:'completed',result:{transcript:'Bonjour, pourriez-vous préciser les horaires, s’il vous plaît ?',reply:'Samedi à vingt heures.',intelligible:true,questionAsked:true,observations:['Débit régulier en français.'],seconds:8}},
 {id:uuid2,phase:2,kind:'turn',status:'completed',result:{transcript:'Je te propose de venir avec moi, car cette activité est vraiment intéressante.',reply:'Et le prix ?',intelligible:true,questionAsked:false,observations:['La liaison est audible.'],seconds:9}}
];
const attempt=(phase=3)=>({id:uuid1,phase,test_id:bank.tests[0].id,version:bank.version,calls:turns});
test('20 TEF oral papers follow 2 original sections, exact 5/10-minute timing and 40 unique topics',()=>{
 assert.equal(bank.tests.length,20);
 assert.equal(publicCatalog().length,20);
 assert.deepEqual(bank.sections.map(s=>[s.letter,s.seconds]),[['A',300],['B',600]]);
 const topics=new Set(),docs=new Set(),facts=new Set();
 for(let i=0;i<20;i++){
  const p=bank.tests[i];assert.equal(p.id,'tef-speaking-'+String(i+1).padStart(2,'0'));
  assert.deepEqual(p.sections.map(s=>[s.letter,s.seconds]),[['A',300],['B',600]]);
  for(const s of p.sections){
   assert(s.heading.length>=10&&s.document.length>=70&&s.instructions.length>=90);
   assert(!topics.has(s.heading));topics.add(s.heading);
   assert(!docs.has(s.document));docs.add(s.document);
   if(s.letter==='A'){
    assert.match(s.instructions,/une dizaine de questions/);
    assert(s.privateFacts.length>=400);facts.add(s.privateFacts);
   }else{
    assert.match(s.instructions,/convaincre/);
    assert(s.privateConcerns.length>=5);
   }
  }
  const pub=publicTest(p);
  assert(!JSON.stringify(pub).includes('privateFacts'));
  assert(!JSON.stringify(pub).includes('privateConcerns'));
  assert(!JSON.stringify(pub).includes(p.sections[0].privateFacts.slice(0,50)));
  assert.deepEqual(resolveTest(p.id,bank.version).sections,p.sections);
 }
 assert.equal(topics.size,40);assert.equal(docs.size,40);assert.equal(facts.size,20);
 assert.throws(()=>resolveTest('tef-speaking-21',bank.version));
});
test('IRCC post-2023 TEF Canada oral 0-699 NCLC conversion, never TCF /20',()=>{
 for(const [score,nclc] of [[0,'Below 4'],[327,'Below 4'],[328,'4'],[386,'4'],[387,'5'],[421,'5'],[422,'6'],[455,'6'],[456,'7'],[493,'7'],[494,'8'],[517,'8'],[518,'9'],[555,'9'],[556,'10'],[699,'10']])
  assert.equal(tefSpeakingNclc(score),nclc);
 assert.throws(()=>tefSpeakingNclc(700));assert.throws(()=>tefSpeakingNclc(12.4));
});
test('Section A feedback has no overall official score; B final includes only assessable real turns',()=>{
 const section=validateTefFeedback(raw([uuid1]),attempt(1),'feedback_a');
 assert.equal(section.score,null);assert.equal(section.nclc,null);assert.equal(section.criteria.length,3);
 assert(section.criteria.every(c=>c.turnId===uuid1));
 const overall=validateTefFeedback(raw([uuid1,uuid2]),attempt(3),'feedback_b');
 assert.equal(overall.score,487);assert.equal(overall.nclc,'7');
 assert.equal(overall.scoreStatus,'unofficial-practice-estimate');
 assert(overall.recommendations[0].advice.length<=250);
 assert(overall.criteria.every(c=>c.improvement.length<=350));
 const partial=validateTefFeedback(raw([uuid1,uuid2]),{...attempt(3),calls:turns.slice(0,1)},'feedback_b');
 assert.equal(partial.score,null);
});
test('Feedback rejects invented examples while tolerating verbose text without losing credits',()=>{
 const value=raw([uuid1,uuid2]);
 value.mistakes=[
 {turnId:uuid1,original:'un mot inexistant',corrected:'une bonne version',explanation:'Fausse citation'},
 {turnId:uuid1,original:'préciser les horaires',corrected:'préciser les horaires corrects',explanation:'Ajoutez une précision.'},
 {turnId:uuid2,original:'Je te propose',corrected:'Je vous propose',explanation:'Choix de registre.'}
 ];
 value.criteria[0].reason='Phrase très longue. '.repeat(80);
 value.recommendations.push({advice:'Exemple concret.',example:'J’aimerais mieux vous expliquer mon choix.'});
 const scored=validateTefFeedback(value,attempt(),'feedback_b');
 assert.equal(scored.mistakes.length,2);assert(scored.criteria[0].reason.length<=450);
 assert(scored.mistakes.every(m=>turns.some(t=>t.id===m.turnId&&t.result.transcript.includes(m.original))));
 assert(!JSON.stringify(scored).includes('un mot inexistant'));
});
test('Audio examiner uses actual WAV, distinct French role rules and exactly one provider request',async()=>{
 for(const phase of [0,2]){
  let calls=0;
  const provider=createTefSpeakingProvider({key:'fixture',fetcher:async(_url,init)=>{
   calls++;const req=JSON.parse(init.body);
   assert.equal(req.model,'gpt-audio-mini');assert.equal(req.store,false);
   assert(req.messages.at(-1).content[0].input_audio);
   assert.match(req.messages[0].content,/français/);
   if(phase===0){assert.match(req.messages[0].content,/Le candidat mène/);assert.match(req.messages[0].content,/questions/)}
   else{assert.match(req.messages[0].content,/ami/);assert.match(req.messages[0].content,/objection/)}
   return Response.json({model:'gpt-audio-mini',usage:{prompt_tokens:340,completion_tokens:80},
    choices:[{message:{content:JSON.stringify({transcript:'Bonjour, quels sont les horaires ?',reply:'Le samedi à neuf heures.',intelligible:true,questionAsked:true,observations:['Prononciation intelligible.']})}}]});
  }});
  const result=await provider.run({kind:'turn',audio:wav,attempt:attempt(phase)},{model:'gpt-audio-mini',maxOutputTokens:2000});
  assert.equal(calls,1);assert.equal(result.result.transcript,'Bonjour, quels sont les horaires ?');
  assert.equal(result.result.questionAsked,phase===0);
 }
});
test('Private recording broker stores exact WAV and cannot issue public URLs',async()=>{
 let saved=null;
 const fake=createTefAudioStorage({url:'https://example.supabase.co',serviceKey:'secret-test-only',
  fetcher:async(url,opts)=>{
   assert.equal(opts.headers.apikey,'secret-test-only');assert.match(url,/academy-tef-speaking/);
   if(opts.method==='POST'){saved=opts.body;assert.equal(opts.headers['Content-Type'],'audio/wav');return Response.json({Key:'private'})}
   return new Response(saved,{headers:{'Content-Type':'audio/wav'}});
  }});
 await fake.save({user:uuid1,attempt:uuid2,callId:uuid1,audio:wav});
 assert.equal(saved.length,32044);
 const bytes=await fake.read({user:uuid1,attempt:uuid2,callId:uuid1});
 assert.equal(bytes.length,32044);
});
test('Handler rejects fake scores, unverified requests, forged origin, bad WAV and unauthorized recording IDs',async()=>{
 let paid=0,saved=0,modelCalls=0;
 const h=createTefSpeakingHandler({
  authenticate:async token=>token==='good'?{id:uuid1,email_confirmed_at:'2026-11-17'}:null,
  db:{adminRpc:async (name,args)=>{
    if(name==='academy_tef_speaking_command'){
     if(args.p_action==='read')return {...attempt(0),serverNow:new Date().toISOString(),pending:null};
     if(args.p_action==='list')return [];
     return {...attempt(0),serverNow:new Date().toISOString()};
    }
    if(name==='academy_ai_reserve'){paid++;return {status:'completed'}}
    throw Error('Unexpected DB call');
   },userRpc:async()=>({enabled:true,activities:{},wallet:{}})},
  provider:{ready:()=>true,run:async()=>{modelCalls++}},
  storage:{save:async()=>{saved++},read:async()=>new Uint8Array(0)}
 });
 const send=(body,token='good',origin='https://hzad123.github.io')=>h(new Request('https://example.test',{
  method:'POST',headers:{authorization:'Bearer '+token,origin},body:JSON.stringify(body)
 }));
 assert.equal((await send({kind:'turn',id:uuid1,callId:uuid2,expectedCredits:10,audio:wav},'bad')).status,401);
 assert.equal((await send({kind:'turn',id:uuid1,callId:uuid2,expectedCredits:10,audio:wav},'good','https://attacker.test')).status,403);
 assert.equal((await send({kind:'feedback_b',id:uuid1,callId:uuid2,expectedCredits:1,score:699})).status,400);
 assert.notEqual((await send({kind:'turn',id:uuid1,callId:uuid2,expectedCredits:10,audio:'garbage'})).status,200);
 const stolen=await h(new Request('https://example.test?attempt='+uuid1+'&recording='+crypto.randomUUID(),
  {headers:{authorization:'Bearer good'}}));
 assert.equal(stolen.status,404);
 assert.equal(saved,0);assert.equal(paid,0);assert.equal(modelCalls,0);
});
test('The TEF UI keeps both sections, prevents task-switch per spoken turn and saves recordings',()=>{
 const ui=readFileSync('src/exams/tef-speaking/ui.js','utf8');
 const m=readFileSync('supabase/migrations/20261117234000_tef_speaking_twenty_tests.sql','utf8');
 assert.match(ui,/if\(attempt\.pending\)schedulePoll\(\)/);
 assert.match(ui,/onLimit:audio/);
 assert.match(ui,/recorderInstance\(\)\.start\(Math\.min\(30,remaining\(\)\)\)/);
 assert.match(ui,/function renderBreak/);
 assert.match(ui,/function renderFinal/);
 assert.match(ui,/Commencer la Section B/);
 assert.match(ui,/Écouter mon enregistrement/);
 assert.match(m,/create schema academy_tef_speaking/);
 assert.match(m,/enable row level security/);
 assert.match(m,/storage\.buckets/);
 assert.match(m,/grant execute on function public\.academy_tef_speaking_command/);
 assert.doesNotMatch(m,/update academy_tcf_speaking|drop table academy_tcf/i);
});
