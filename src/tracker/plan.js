export const LEVELS=['A0','A1','A2','B1','B2','C1','C2'];
export const SKILLS=['grammar','vocabulary','reading','listening'];
export function learningLevel(snapshot){
 if(LEVELS.includes(snapshot.preferences?.level))return snapshot.preferences.level;
 if(LEVELS.includes(snapshot.placement?.recommendedLevel))return snapshot.placement.recommendedLevel;
 // Without placement, continue recent saved learning activity when available.
 const recent=snapshot.units.filter(u=>u.attempts>0&&LEVELS.includes(u.level)&&Number.isFinite(Date.parse(u.updatedAt)))
  .sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||a.id.localeCompare(b.id))[0];
 if(recent)return recent.level;
 return [...LEVELS].reverse().find(level=>snapshot.units.some(u=>u.level===level&&u.attempts>0))||'A0';
}
export function skillEvidence(snapshot,skill){
 const practice=snapshot.skills.find(s=>s.skill===skill);
 const placement=snapshot.placement?.skills?.[skill];
 if(practice?.total>=3)return {...practice,source:'practice',percent:Math.round(100*practice.correct/practice.total)};
 if(placement?.total>=2)return {...placement,source:'placement',percent:Math.round(100*placement.correct/placement.total)};
 return {total:practice?.total||0,correct:practice?.correct||0,percent:null,source:'insufficient'};
}
export function dueMistakes(snapshot){
 const now=Date.parse(snapshot.generatedAt);
 return snapshot.notebook.filter(n=>!n.lastCorrect||Date.parse(n.dueAt)<=now)
  .sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt)||a.unitId.localeCompare(b.unitId)||a.questionId.localeCompare(b.questionId));
}
export function makeDailyPlan(snapshot){
 const goal=[10,20,30].includes(snapshot.preferences?.minutes)?snapshot.preferences.minutes:20;
 const level=learningLevel(snapshot);
 const weak=SKILLS.map(skill=>({skill,...skillEvidence(snapshot,skill)})).filter(s=>s.percent!==null&&s.percent<70)
  .sort((a,b)=>a.percent-b.percent||SKILLS.indexOf(a.skill)-SKILLS.indexOf(b.skill));
 const units=snapshot.units.filter(u=>u.level===level).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
 const unfinished=units.find(u=>!u.completed);
 const review=[...units].filter(u=>u.completed&&u.best<70).sort((a,b)=>a.best-b.best||a.position-b.position)[0];
 const lesson=unfinished||review||units[0];
 const tasks=[];let remaining=goal;
 const due=dueMistakes(snapshot);
 for(const item of due.slice(0,goal===10?1:2)){
  tasks.push({kind:'revision',minutes:3,item,title:'Revisit a saved mistake',reason:`${item.level} · ${item.title}`});remaining-=3;
 }
 if(lesson){
  const exerciseMinutes=remaining>=7?Math.min(5,Math.floor(remaining/3)):0;
  const minutes=Math.min(Math.max(1,Number(lesson.minutes)||10),remaining-exerciseMinutes);
  tasks.push({kind:'lesson',minutes,unit:lesson,title:unfinished?'Continue your course':'Review and consolidate',
   reason:unfinished?'Your next unfinished lesson.':review?'Revisit a lesson with a quiz score below 70%.':'You have completed the published lessons at this level. Revisit this one or choose another level.'});
  remaining-=minutes;
  if(exerciseMinutes){
   const skill=weak[0]?.skill||'vocabulary';
   const prompts={
    grammar:'Choose one grammar pattern from this lesson. Write three new examples, then compare them with the lesson explanation.',
    vocabulary:'Hide the English translations. Recall five French words from this lesson, then reveal the translations and check yourself.',
    reading:'Reread one French passage or dialogue from this lesson. Summarize its main idea and identify two supporting details.',
    listening:'Play the French vocabulary or listening audio. Repeat two phrases, then check the transcript. If audio is unavailable, use a reading exercise instead.'
   };
   tasks.push({kind:'exercise',minutes:exerciseMinutes,unit:lesson,skill,title:`Focused ${skill} practice`,reason:weak.length?'Prioritized from your measured skill evidence.':'A useful practice habit while more skill evidence is collected.',instructions:prompts[skill]});
   remaining-=exerciseMinutes;
  }
 }
 return {level,goal,tasks,weak,plannedMinutes:goal-remaining};
}
