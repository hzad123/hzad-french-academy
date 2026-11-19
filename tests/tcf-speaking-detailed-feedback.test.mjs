import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpeakingProvider,validateSpeakingScore} from '../supabase/functions/academy-tcf-speaking/provider.js';
const originals=[
 {id:'a',phase:0,kind:'turn',status:'completed',result:{transcript:'Je préfère la caissière préparer des plats pour moi.',intelligible:true,observations:[]}},
 {id:'b',phase:2,kind:'turn',status:'completed',result:{transcript:"J'ai une question de ton workshop.",intelligible:true,observations:[]}},
 {id:'c',phase:3,kind:'turn',status:'completed',result:{transcript:"À mon avis les cours sont utiles parce que les étudiants apprennent.",intelligible:true,observations:[]}}
];
const turns=originals.map(x=>({id:x.id,phase:x.phase,...x.result}));
const detailed=()=>({
 score:9,summary:'More accurate grammar and developed examples are needed.',
 criteria:[
  {id:'linguistic',turnId:'a',reason:'Incorrect verb structure makes the intended meaning unclear.',improvement:'Use the causative construction correctly.'},
  {id:'pragmatic',turnId:'c',reason:'The opinion needs more specific supporting details.',improvement:'Add a personal example and explain its consequence.'},
  {id:'sociolinguistic',turnId:'b',reason:'Workshop is an unnecessary English borrowing in this context.',improvement:'Ask politely about the atelier.'}
 ],
 corrections:[
  {turnId:'a',original:'Je préfère la caissière préparer',better:'Je préfère que la caissière prépare',why:'Use que + subjunctive after préférer.'},
  {turnId:'b',original:'ton workshop',better:'votre atelier',why:'Use a French word and an appropriate polite form.'},
  {turnId:'c',original:'les cours sont utiles',better:'les cours sont particulièrement utiles',why:'Add precision when defending your opinion.'}
 ],
 wellSaid:[{turnId:'c',quote:'À mon avis',why:'This clearly introduces an opinion.'}],
 taskPractice:[
  {task:1,focus:'Use complete everyday answers.',example:'Je cuisine le soir parce que cela me détend.'},
  {task:2,focus:'Ask several precise questions politely.',example:"Pourriez-vous m'indiquer les horaires de l'atelier ?"},
  {task:3,focus:'Defend the viewpoint with an example.',example:'Par exemple, mon voisin a progressé grâce aux cours.'}
 ]
});
test('TCF detailed scoring preserves saved transcript, correct/incorrect examples, holistic score and NCLC',()=>{
 const out=validateSpeakingScore(detailed(),turns);
 assert.equal(out.score,9);assert.equal(out.nclc,'6');
 assert.equal(out.rubricVersion,'tcf-speaking-detailed-v2');
 assert.equal(out.corrections.length,3);assert.equal(out.wellSaid.length,1);
 assert.equal(out.taskPractice.length,3);
 assert.equal(out.criteria[0].evidence,turns[0].transcript);
 assert.equal(out.corrections[0].original,'Je préfère la caissière préparer');
 assert.match(out.corrections[0].better,/que la caissière prépare/);
});
test('No invented words can be presented as a direct quote from learner speech',()=>{
 const raw=detailed();
 raw.corrections.push({turnId:'a',original:'Je préfère que la caissière prépare',better:'Je préfère préparer',why:'Invented correction cannot be learner evidence'});
 raw.corrections.push({turnId:'forged-id',original:'Je préfère',better:'Je préfère autre chose',why:'Fake ID'});
 raw.wellSaid.push({turnId:'a',quote:'J’ai bien exprimé toutes mes idées',why:'Fake transcript'});
 const out=validateSpeakingScore(raw,turns);
 assert.equal(out.corrections.length,3);
 assert.equal(out.wellSaid.length,1);
 assert(!JSON.stringify(out).includes('Fake transcript'));
});
test('Legacy speaking feedback stays readable and retains its historic score',()=>{
 const raw=detailed();delete raw.corrections;delete raw.wellSaid;delete raw.taskPractice;
 const out=validateSpeakingScore(raw,turns);
 assert.equal(out.score,9);assert.equal(out.rubricVersion,'tcf-speaking-v1');
 assert.deepEqual(out.corrections,[]);assert.deepEqual(out.taskPractice,[]);
});
test('Missing Task 3 still withholds an unjustified TCF/NCLC total',()=>{
 const without3=turns.map(t=>t.phase===3?{...t,transcript:'',intelligible:false}:t);
 const out=validateSpeakingScore(detailed(),without3);
 assert.equal(out.score,null);assert.equal(out.nclc,null);
 assert.deepEqual(out.missingTasks,[3]);
 assert(out.corrections.every(x=>x.task!==3));
});
test('Structured AI feedback asks for grounded corrections, strong phrases, and three task-specific practice examples',async()=>{
 let request;
 const provider=createSpeakingProvider({key:'fixture',fetcher:async(url,opts)=>{
  request=JSON.parse(opts.body);
  return Response.json({choices:[{message:{content:JSON.stringify(detailed())}}]});
 }});
 const out=await provider.run({kind:'feedback',attempt:{phase:4,calls:originals}},{model:'gpt-4o-mini',maxOutputTokens:2000});
 const schema=request.response_format.json_schema;
 assert.equal(schema.strict,true);assert.deepEqual(schema.schema.required,['score','summary','criteria','corrections','wellSaid','taskPractice']);
 assert.equal(request.store,false);assert.equal(request.max_tokens,2000);
 assert(request.messages[0].content.includes('EXACT contiguous substring'));
 assert(request.messages[0].content.includes('NOT something the learner said'));
 assert.equal(out.result.corrections.length,3);
});
test('TCF results render giant score/NCLC first, clear red/green corrections, evidence, and tailored practice',()=>{
 const ui=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 const css=readFileSync('src/styles/academy.css','utf8');
 const result=ui.slice(ui.indexOf('if(attempt.phase===4)'));
 assert(result.includes('hz-tcf-speaking-scoreboard'));
 assert(result.includes('hz-tcf-speaking-score-figures'));
 assert(result.indexOf('scoreboard.append(figures)')<result.indexOf("corrections.append(el('h4'"));
 assert(result.includes("el('del',correction.original)"));
 assert(result.includes("el('ins',correction.better)"));
 assert(result.includes("el('blockquote',sample.quote)"));
 assert(result.includes("el('blockquote',item.example)"));
 assert(result.includes('This older assessment did not store sentence-by-sentence corrections.'));
 assert(result.includes('Your recording transcript is never rewritten.'));
 assert(css.includes('font-size:clamp(36px,5.5vw,66px)'));
 assert(css.includes('.hz-tcf-speaking-original del'));
 assert(css.includes('.hz-tcf-speaking-better ins'));
 assert(css.includes('@media(max-width:600px)'));
});
