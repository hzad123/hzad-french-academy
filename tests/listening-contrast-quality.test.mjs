import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {displayProjection,trialsFor,positionsWithFrozenSpoken,sourceInvariant,contrastPlan,scoreGroup,ready,inspect,authorInput} from '../scripts/lib/listening-contrast-quality.mjs';
import {hash,policyHash,blindVerdict} from '../scripts/lib/listening-answer-qc.mjs';
import {POLICY_VERSION,MODELS} from '../supabase/functions/academy-listening-qc/contracts.js';
import {selectStrictBanks} from '../scripts/check-listening-six-release.mjs';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01-v4.json'));
test('new releases require all six immutable replacements; historical warnings are not declared passes',()=>{
 const old=Array.from({length:6},(_,i)=>`tcf-listening-test${String(i+1).padStart(2,'0')}-v4.json`);
 assert.deepEqual(selectStrictBanks(old),[]);
 assert.throws(()=>selectStrictBanks(old,{requireReplacements:true}),/warnings remain unresolved/);
 assert.throws(()=>selectStrictBanks([...old,'tcf-listening-test01-v5.json']),/all six/);
 const next=old.map(f=>f.replace('-v4','-v5'));assert.deepEqual(selectStrictBanks([...old,...next]),next.map(f=>'supabase/exams/'+f));
 assert.throws(()=>selectStrictBanks([...old,...next,'tcf-listening-test06-v6.json']),/all six/);
});
test('rewriting starts from the unchanged recording without anchoring to a defective written key',()=>{
 const q=paper.questions[29],input=authorInput(q,{feedback:{stage:'blind'}});
 assert(!input.choices.some(c=>q.options.includes(c)));assert.notEqual(input.question,q.question);
 assert(input.stimulus.includes(q.segments[2].text));assert.equal(input.feedback.advanced,true);
});
test('blind sees only displayed options; spoken answers cannot leak into display-only controls',()=>{
 const q=paper.questions[0],projection=displayProjection(q);assert.deepEqual(projection.choices,q.options);assert.deepEqual(Object.keys(projection),['question','choices']);
 assert(!JSON.stringify(projection).includes(q.explanation));assert(!JSON.stringify(projection).includes('A. Un'));
 assert.equal(trialsFor(paper.questions[22]),3);assert.equal(trialsFor(paper.questions[13]),2);assert.equal(trialsFor(q),1);
});
test('existing spoken keys stay frozen; written keys are balanced without a four-item deck',()=>{
 const keys=positionsWithFrozenSpoken(paper,'strict-test');assert.deepEqual(keys.slice(0,8),paper.questions.slice(0,8).map(q=>'ABCD'.indexOf(q.correct)));
 const counts=[0,1,2,3].map(k=>keys.filter(i=>i===k).length);assert.equal(Math.max(...counts)-Math.min(...counts),1);
});
test('recorded situations, genre, images and slots are preserved bytewise',()=>{
 const next=structuredClone(paper);next.version='new';assert(sourceInvariant(paper,next));next.questions[29].segments[1].text+=' Une nouvelle histoire.';
 assert.throws(()=>sourceInvariant(paper,next),/Transcript|situation/);
 const transcript=structuredClone(paper);transcript.questions[29].transcript+=' Added unsupported evidence.';
 assert.throws(()=>sourceInvariant(paper,transcript),/Transcript/);
 const voices=structuredClone(paper);voices.questions[29].segments[1].voice='female_alt';
 assert.throws(()=>sourceInvariant(paper,voices),/actors/);
});
test('late distractors need two genuine anchors and an explicit recorded misunderstanding',()=>{
 const q=paper.questions[29],anchors=q.segments.filter(s=>s.text!==q.question&&!s.text.startsWith('Question ')).map(s=>s.text);
 const plan={distractorReasons:[1,2,3].map(index=>({index,operation:'causal_reversal',anchors:anchors.length>=2?anchors.slice(0,2):[anchors[0],anchors[0].slice(0,20)]}))};
 assert(contrastPlan(q,plan).pass);plan.distractorReasons[0].anchors=['A completely invented quote.'];assert(!contrastPlan(q,plan).pass);
});
test('late cohort cannot be concealed by easy items; no small-sample or review waiver passes',()=>{
 const chance=Array.from({length:102},(_,i)=>({correct:i<26}));assert(scoreGroup(chance).passes);assert(!scoreGroup(chance.slice(0,18)).passes);
 assert(!scoreGroup(chance.map((_,i)=>({correct:i<60}))).passes);assert(!ready([],[],{written:{sample:186,passes:true},late:{sample:102,passes:true},all:{passes:true}}));
 assert(blindVerdict({plausibility:[0,1,2,3].map(index=>({index,credible:true,context:'A normal recording could select this particular account.'})),guess:0,probabilities:[.28,.24,.24,.24],standsOut:false,cues:[{severity:'weak',cue:'Admitted very weak prior'}],reason:'Uncertain.'}).pass);
});
test('uniform guesses cannot conceal an implausible alternative or missing four-option review',()=>{
 const review={guess:0,probabilities:[.25,.25,.25,.25],standsOut:false,cues:[],reason:'No strong preference.',plausibility:[0,1,2,3].map(index=>({index,credible:true,context:'A normal source could select this particular arrangement.'}))};
 assert(blindVerdict(review).pass);review.plausibility[2].credible=false;assert(!blindVerdict(review).pass);
 review.plausibility.pop();assert(!blindVerdict(review).pass);
});
test('a conspicuous incorrect option rejects before grounding, without exposing gold to the blind reviewer',async()=>{
 const q=paper.questions[29];let calls=0;
 const r=await inspect(q,async(stage,input)=>{calls++;assert.equal(stage,'blind');assert.deepEqual(Object.keys(input),['question','choices']);
  return {stage,policy:POLICY_VERSION,policyHash,model:MODELS.blind,responseId:'chatcmpl-unit-fixture',inputHash:hash(input),result:{guess:0,probabilities:[.7,.1,.1,.1],standsOut:true,cues:[{severity:'clear',cue:'One choice is uniquely comprehensive'}],reason:'Clear wording advantage.'}};
 },{seed:'isolation'});assert(!r.pass);assert.equal(calls,1);
});
