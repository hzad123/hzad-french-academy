import test from 'node:test';
import assert from 'node:assert/strict';
import {learningLevel,skillEvidence,makeDailyPlan,dueMistakes} from '../src/tracker/plan.js';
const base=()=>({generatedAt:'2026-11-04T18:00:00Z',preferences:{minutes:20,level:null},placement:null,
 units:[{id:'a0-01',level:'A0',position:1,title:'First',minutes:10,completed:true,best:50,attempts:1},{id:'a0-02',level:'A0',position:2,title:'Next',minutes:12,completed:false,best:null,attempts:0}],skills:[],notebook:[]});
test('plan uses override, latest placement, actual course activity, then A0',()=>{
 const s=base();assert.equal(learningLevel(s),'A0');
 s.units.push({id:'b1-01',level:'B1',attempts:1});assert.equal(learningLevel(s),'B1');
 s.placement={recommendedLevel:'A2'};assert.equal(learningLevel(s),'A2');
 s.preferences.level='C1';assert.equal(learningLevel(s),'C1');
 s.preferences.level=null;s.placement=null;
 s.units[0].updatedAt='2026-11-04T12:00Z';assert.equal(learningLevel(s),'A0');
});
test('all time budgets are bounded and deterministic; next incomplete lesson and weak skill are selected',()=>{
 for(const minutes of [10,20,30]){
  const s=base();s.preferences.minutes=minutes;s.placement={recommendedLevel:'A0',skills:{grammar:{correct:0,total:2}}};
  const a=makeDailyPlan(s);assert.deepEqual(makeDailyPlan(s),a);
  assert.ok(a.tasks.every(t=>t.minutes>0));assert.ok(a.plannedMinutes<=minutes);
  assert.equal(a.tasks.find(t=>t.kind==='lesson').unit.id,'a0-02');
  assert.equal(a.tasks.find(t=>t.kind==='exercise').skill,'grammar');
 }
});
test('mistakes become due by the server timestamp; corrected future reviews wait',()=>{
 const s=base();s.notebook=[
  {unitId:'a0-01',questionId:'q1',lastCorrect:false,dueAt:'2026-11-03T18:00Z'},
  {unitId:'a0-01',questionId:'q2',lastCorrect:true,dueAt:'2026-11-05T18:00Z'},
  {unitId:'a0-01',questionId:'q3',lastCorrect:true,dueAt:'2026-11-02T18:00Z'}];
 assert.deepEqual(dueMistakes(s).map(n=>n.questionId),['q3','q1']);
 for(const minutes of [10,20,30]){s.preferences.minutes=minutes;const p=makeDailyPlan(s);assert.equal(p.tasks[0].kind,'revision');assert.ok(p.plannedMinutes<=minutes)}
});
test('mastery requires sufficient evidence; productive skills are not inferred',()=>{
 const s=base();s.skills=[{skill:'grammar',correct:1,total:2}];assert.equal(skillEvidence(s,'grammar').percent,null);
 s.placement={skills:{grammar:{correct:1,total:2}}};assert.equal(skillEvidence(s,'grammar').source,'placement');
 s.skills[0]={skill:'grammar',correct:2,total:3};assert.equal(skillEvidence(s,'grammar').percent,67);
 assert.equal(skillEvidence(s,'listening').percent,null);
});
test('completed courses get review; empty catalog stays honest and never invents lessons',()=>{
 const s=base();s.units=s.units.slice(0,1);assert.match(makeDailyPlan(s).tasks.find(t=>t.kind==='lesson').reason,/below 70/);
 s.units=[];assert.equal(makeDailyPlan(s).tasks.length,0);
 s.preferences.minutes=999;assert.equal(makeDailyPlan(s).goal,20);
});
