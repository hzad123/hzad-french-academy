import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../supabase/exams/tcf-writing-tests.json' with {type:'json'};
import {assessmentMessages,validateWritingFeedback} from '../supabase/functions/academy-tcf-writing/scoring.js';
import {originalResponses} from './helpers/tcf-native-feedback.mjs';
import {WRITING_RESPONSE_SCHEMA} from '../supabase/functions/academy-tcf-writing/response-schema.js';
const paper=bank.tests[0];
const responses=[Array(70).fill('Bonjour').join(' '),Array(130).fill('voyage').join(' '),Array(130).fill('travail').join(' ')];
const improvements=[
 'In Task 1, replace the repeated greeting with the directions requested by the recipient.',
 'In Task 2, explain why this trip was important after recounting the activities.',
 'In Task 3, use a neutral article register when addressing the readership.'
];
function feedback(){return {score:12,scoreReason:'Task 2 omits personal importance; Task 3 has a register mismatch.',criteria:['linguistic','pragmatic','sociolinguistic'].map((id,i)=>({id,evidence:[{task:i+1,quote:responses[i].split(' ')[0]}],reason:'A concrete gap in the cited response limits the band.',improvement:improvements[i]})),tasks:[1,2,3].map(number=>({number,onTopic:true,mistakes:[],issues:[]}))}}
test('strict native criterion schema requires an actionable improvement alongside reason and evidence',()=>{
 const criterion=WRITING_RESPONSE_SCHEMA.properties.criteria.items;
 assert(criterion.required.includes('improvement'));assert.equal(criterion.properties.improvement.type,'string');assert.equal(criterion.additionalProperties,false);
});
test('criterion-specific fixes survive validation with one total TCF score and deterministic NCLC',()=>{
 const raw=feedback();raw.criteria[0].score=5;raw.criteria[0].weight=.5;
 const result=validateWritingFeedback(raw,{test:paper,responses});
 assert.equal(result.score,12);assert.equal(result.nclc,'8');assert.equal(result.rubricVersion,'tcf-writing-public-criteria-v2');
 assert.deepEqual(result.criteria.map(c=>c.improvement),improvements);
 for(const c of result.criteria){assert(!Object.hasOwn(c,'score'));assert(!Object.hasOwn(c,'weight'))}
});
test('criterion guidance retains legacy feedback and accepts no invented correction for an already satisfied criterion',()=>{
 const raw=feedback();raw.criteria[0].improvement='';let result=validateWritingFeedback(raw,{test:paper,responses});assert.equal(result.criteria[0].improvement,'');
 for(const c of raw.criteria)delete c.improvement;result=validateWritingFeedback(raw,{test:paper,responses});assert.equal(result.rubricVersion,'tcf-writing-public-criteria-v1');assert(result.criteria.every(c=>!Object.hasOwn(c,'improvement')));
});
test('new criterion action cannot bypass quoted evidence checks or text bounds',()=>{
 let raw=feedback();raw.criteria[0].evidence[0].quote='Not present in the answer';assert.throws(()=>validateWritingFeedback(raw,{test:paper,responses}),/Invented criterion evidence/);
 raw=feedback();raw.criteria[0].improvement='x'.repeat(241);assert.throws(()=>validateWritingFeedback(raw,{test:paper,responses}),e=>e.validationCode==='FEEDBACK_BOUNDS');
});
test('examiner prompt demands TCF task fulfilment and criterion-specific fixes rather than generic French advice',()=>{
 const system=assessmentMessages(paper,responses)[0].content;
 for(const phrase of ['three public marking dimensions','Task 1 must fulfil its communicative situation','Task 2 must recount the past experience','Task 3 must accurately reformulate both supplied viewpoints','personal importance','audience, tone, politeness','Never invent criterion subscores','one total score remains a holistic TCF writing estimate','criterion improvement 240','at most 2 important error patterns'])assert(system.includes(phrase),phrase);
 assert(system.includes('Do not say merely "improve grammar"'));assert(system.includes('Fit the complete valid JSON within 2000 output tokens'));
 const user=JSON.parse(assessmentMessages(paper,responses)[1].content);assert.deepEqual(originalResponses(user.responses),responses);assert.equal(user.test.tasks[2].documents.length,2);
});
