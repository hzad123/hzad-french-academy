import {DEBRIEFS,DEBRIEF_VERSION} from '../../exams/debriefs.js';
import {CRITERIA} from './feedback.js';
export function completedDebrief(taskId){
 const debrief=DEBRIEFS[taskId];return debrief?{version:DEBRIEF_VERSION,...structuredClone(debrief)}:null;
}
// Caller must check the immutable owner capability before using this projection.
export function reviewQuestion(bank,skill,index){
 const section=bank?.sections?.find(s=>s.skill===skill);if(!section||!Number.isInteger(index)||index<0||index>=section.items.length)throw Error('Invalid content question.');
 const item=section.items[index],question={id:item.id,prompt:item.prompt};
 for(const key of ['passage','options','answer','explanation','transcript','minWords','maxWords','responseSeconds','preparationSeconds','examinerRole','scenarioFacts'])if(item[key]!==undefined)question[key]=structuredClone(item[key]);
 if(item.criteria)question.criteria=item.criteria.map(id=>({id,label:CRITERIA[id].label}));
 return {exam:bank.exam,version:bank.version,skill,index,total:section.items.length,seconds:section.seconds,question,debrief:completedDebrief(item.id)};
}
