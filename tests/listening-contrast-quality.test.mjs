import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {displayProjection,qualityProjection,screeningMatches,trialsFor,positionsWithFrozenSpoken,sourceInvariant,contrastPlan,scoreGroup,ready,inspect,authorInput,repair,applyBlindEdit,styleFindings,editedForQuestion} from '../scripts/lib/listening-contrast-quality.mjs';
import {hash,policyHash,draftPolicyHash,blindVerdict,spokenChoices} from '../scripts/lib/listening-answer-qc.mjs';
import {POLICY_VERSION,MODELS,stageModel,modelRequest,validateInput,policyFingerprint} from '../supabase/functions/academy-listening-qc/contracts.js';
import {selectStrictBanks} from '../scripts/check-listening-six-release.mjs';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test01-v4.json'));
test('cohort writing shortcuts trigger repair without reading or selecting held-out guesses',()=>{
 const papers=Array.from({length:6},(_,i)=>({id:'paper-'+i,questions:Array.from({length:39},(_,j)=>({number:j+1,question:'Quel élément est cité ?',options:['Court.','Une formulation ordinaire.','Une autre formulation naturelle.','Une dernière proposition possible.'],correct:'A'}))}));
 const findings=styleFindings(papers).filter(f=>f.attack==='shortest');
 assert.equal(findings.length,2);assert.equal(findings[0].sample,186);assert.equal(findings[1].sample,102);
 assert(findings.every(f=>f.upperTailP<.01&&f.candidates.every(c=>c.number>=9)));
 for(const p of papers)for(const q of p.questions)q.options=['Choix A.','Choix B.','Choix C.','Choix D.'];
 assert.deepEqual(styleFindings(papers),[]);
});
test('the editor has no source/key and its prompt fingerprint cannot change admission policy',async()=>{
 const q=paper.questions[29],input=qualityProjection(q),request=modelRequest('polish',input);
 assert.equal(request.messages.length,2);assert.equal(request.messages[1].content,JSON.stringify(input));
 for(const hidden of ['correct','transcript','explanation','feedback','imageData'])assert.throws(()=>validateInput('polish',{...input,[hidden]:'LEAK'}),/only question/);
 assert.equal(await policyFingerprint(),policyHash);assert.equal(await policyFingerprint('polish'),draftPolicyHash);assert.notEqual(draftPolicyHash,policyHash);
 const edited=applyBlindEdit(q,{question:'Quel objectif est évoqué ?',choices:q.options.map(t=>t+' '),notes:'Test edit.'});
 assert.equal(edited.correct,q.correct);assert.deepEqual(edited.segments.slice(0,-1),q.segments.slice(0,-1));
});
test('a key-blind edit still fails when its marked answer loses transcript support',async()=>{
 const q={number:9,kind:'announcement',question:'Quand le rendez-vous aura-t-il lieu ?',options:['Jeudi.','Mercredi.','Vendredi.','Mardi.'],correct:'A',explanation:'PRIVATE_CORRECTION_MUST_NOT_REACH_THE_EDITOR',segments:[{voice:'female',text:'Le rendez-vous aura lieu jeudi.'},{voice:'female',text:'Quand le rendez-vous aura-t-il lieu ?'}],slotSeconds:40,audioSeconds:12};q.transcript=q.segments.map(s=>s.text).join('\n');
 const neutral={guess:0,probabilities:[.25,.25,.25,.25],standsOut:false,cues:[],reason:'Four ordinary days.',plausibility:[0,1,2,3].map(index=>({index,credible:true,context:'The missing announcement could name this particular day.'}))};
 let calls=0;
 const provider=async(stage,input)=>{
  let result;
  if(stage==='blind'){calls++;result=neutral;}
  else if(stage==='polish'){
   assert.deepEqual(Object.keys(input),['question','choices']);assert(!JSON.stringify(input).includes('PRIVATE_CORRECTION'));
   result={question:'Quel jour est annoncé ?',choices:['Vendredi.','Jeudi.','Mercredi.','Mardi.'],notes:'Synthetic edit deliberately breaks the old index0 key.'};
  }else{assert.equal(stage,'ground');result={supportedIndices:[1],ambiguous:false,questionSupported:true,options:input.choices.map((_,index)=>({index,supported:index===1,plausibleMisunderstanding:index!==1,evidence:['aura lieu jeudi'],reason:'La source annonce jeudi ; les autres jours constituent des confusions plausibles.'})),summary:'Seul jeudi est annoncé.'};}
  return {stage,policy:POLICY_VERSION,policyHash:stage==='polish'?draftPolicyHash:policyHash,model:stageModel(stage),responseId:'chatcmpl-unit-editor-'+stage+'-'+calls,inputHash:hash(input),result};
 };
 const r=await repair(q,provider,{target:0,seed:'source-guard',maxAttempts:0});assert(!r.pass);assert(r.blocked);assert.equal(r.feedback.stage,'ground');assert.equal(r.question.correct,'A');
});
test('written choices need a key-blind edit of their actual final wording, including initially plausible items',()=>{
 const q=paper.questions[29],input=qualityProjection(q);
 assert(!editedForQuestion(q,{pass:true}));
 const receipt={stage:'polish',policy:POLICY_VERSION,policyHash:draftPolicyHash,model:stageModel('polish'),responseId:'chatcmpl-unit-final-edit',inputHash:hash(input),result:{question:q.question,choices:q.options,notes:'All four formulations are ordinary alternatives.'}};
 assert(editedForQuestion(q,{blindEdit:{input,receipt}}));
 const changed=structuredClone(q);changed.options[0]+=' Une autre précision.';
 assert(!editedForQuestion(changed,{blindEdit:{input,receipt}}));
 assert(editedForQuestion(paper.questions[0],{}));
});
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
 assert.equal(input.feedback.verifiedExamples.length,2);assert(input.feedback.verifiedExamples.every(e=>e.stimulus!==input.stimulus));
});
test('blind sees only displayed options; spoken answers cannot leak into display-only controls',()=>{
 const q=paper.questions[0],projection=displayProjection(q);assert.deepEqual(projection.choices,q.options);assert.deepEqual(Object.keys(projection),['question','choices']);
 assert(!JSON.stringify(projection).includes(q.explanation));assert(!JSON.stringify(projection).includes('A. Un'));
 assert.equal(trialsFor(paper.questions[22]),3);assert.equal(trialsFor(paper.questions[13]),2);assert.equal(trialsFor(q),1);
});
test('content quality reviews actual spoken alternatives; old label-only receipts cannot approve them',()=>{
 const q=paper.questions[0],projection=qualityProjection(q);
 assert.deepEqual(projection.choices,spokenChoices(q));assert.deepEqual(Object.keys(projection),['question','choices']);
 assert(!Object.hasOwn(projection,'stimulus'));assert(!Object.hasOwn(projection,'imageData'));
 const record={blind:[{order:[0,1,2,3],receipt:{inputHash:hash(displayProjection(q))}}]};
 assert(!screeningMatches(q,record));record.blind[0].receipt.inputHash=hash(projection);assert(screeningMatches(q,record));
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
test('a mathematically exact probability boundary is not rejected by floating-point subtraction',()=>{
 const r={guess:0,probabilities:[.4,.25,.2,.15],standsOut:false,cues:[],reason:'A weak preference without a clear cue.',plausibility:[0,1,2,3].map(index=>({index,credible:true,context:'Each interpretation has an ordinary possible source.'}))};
 assert(blindVerdict(r).pass);r.probabilities=[.4,.24,.2,.16];assert(!blindVerdict(r).pass);
});
test('an unchanged blind edit cannot reroll a rejected question',async()=>{
 const q=structuredClone(paper.questions[29]);let blindCalls=0,editCalls=0;
 const provider=async(stage,input)=>{
  let result;if(stage==='blind'){blindCalls++;result={guess:0,probabilities:[.7,.1,.1,.1],standsOut:true,cues:[{option:0,severity:'clear',cue:'Synthetic obvious wording cue.'}],reason:'Synthetic rejected candidate.'};}
  else{assert.equal(stage,'polish');editCalls++;result={question:' '+input.question+' ',choices:input.choices.map(t=>' '+t+' '),notes:'Whitespace only is not a substantive repair.'};}
  return {stage,policy:POLICY_VERSION,policyHash:stage==='polish'?draftPolicyHash:policyHash,model:stageModel(stage),responseId:'chatcmpl-unit-no-reroll-'+stage,inputHash:hash(input),result};
 };
 const r=await repair(q,provider,{target:0,seed:'no-reroll',maxAttempts:0});assert(!r.pass);assert.equal(blindCalls,1);assert.equal(editCalls,1);
});
test('restarting cannot resample a previously rejected wording or its reordered alternatives',async()=>{
 const q=structuredClone(paper.questions[29]);let blindCalls=0;
 const previous={question:q,feedback:{stage:'blind',reason:'A previously recorded concrete wording cue.'}};
 const provider=async(stage,input)=>{
  if(stage==='blind'){blindCalls++;throw Error('Rejected wording must not be resampled');}
  assert.equal(stage,'polish');
  return {stage,policy:POLICY_VERSION,policyHash:draftPolicyHash,model:stageModel(stage),responseId:'chatcmpl-unit-preserve-rejection',inputHash:hash(input),result:{question:input.question,choices:[...input.choices].reverse(),notes:'Reordering alone does not remove a wording cue.'}};
 };
 const r=await repair(q,provider,{target:0,seed:'restart',starting:q,previouslyRejected:previous,maxAttempts:0});
 assert(!r.pass);assert(r.unchangedRejected);assert.equal(blindCalls,0);assert.equal(r.rejections.length,1);
});
test('a chance-level primary reviewer cannot conceal above-chance guessing by the unchanged second model',()=>{
 const score=(n,k)=>scoreGroup(Array.from({length:n},(_,i)=>({correct:i<k})));
 const good={all:score(234,59),written:score(186,47),late:score(102,26)};
 const neutral={guess:0,probabilities:[.25,.25,.25,.25],standsOut:false,cues:[],reason:'All accounts are credible.',plausibility:[0,1,2,3].map(index=>({index,credible:true,context:'An ordinary recording could support this particular arrangement.'}))};
 // Synthetic gate fixtures, never evidence of actual model performance.
 const papers=Array.from({length:6},()=>({})),evidence=papers.map(()=>({questions:Array.from({length:39},()=>({pass:true,heldout:{receipt:{result:neutral}}})),paperAssessment:{result:{pass:true,patterns:[]}}}));
 const stats={...good,challenge:structuredClone(good),patterns:{positionPatterns:papers.map(()=>({counts:{A:10,B:10,C:10,D:9},suspiciousFourItemDeck:false})),heuristicAttacks:{longest:{sample:186,credit:47}}},lateHeuristicAttacks:{shortest:{sample:102,credit:26}}};
 assert(ready(papers,evidence,stats));
 assert(!ready(papers,evidence,{...stats,challenge:{...good,late:score(102,60)}}));
 assert(!ready(papers,evidence,{...stats,challenge:{...good,written:score(99,25)}}));
 assert(!ready(papers,evidence,{...stats,lateHeuristicAttacks:{shortest:{sample:102,credit:60}}}));
 const badPosition=structuredClone(stats);badPosition.patterns.positionPatterns[0].counts={A:20,B:8,C:6,D:5};
 assert(!ready(papers,evidence,badPosition));
});
test('a conspicuous incorrect option rejects before grounding, without exposing gold to the blind reviewer',async()=>{
 const q=paper.questions[29];let calls=0;
 const r=await inspect(q,async(stage,input)=>{calls++;assert.equal(stage,'blind');assert.deepEqual(Object.keys(input),['question','choices']);
  return {stage,policy:POLICY_VERSION,policyHash,model:MODELS.blind,responseId:'chatcmpl-unit-fixture',inputHash:hash(input),result:{guess:0,probabilities:[.7,.1,.1,.1],standsOut:true,cues:[{severity:'clear',cue:'One choice is uniquely comprehensive'}],reason:'Clear wording advantage.'}};
 },{seed:'isolation'});assert(!r.pass);assert.equal(calls,1);
});
