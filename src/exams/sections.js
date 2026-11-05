export const EXAM_SKILLS=['reading','listening','writing','speaking'];
export const SKILL_NAMES={reading:'Reading',listening:'Listening',writing:'Writing',speaking:'Speaking'};
export const SKILL_ICONS={reading:'▤',listening:'◖',writing:'✎',speaking:'◌'};
export const itemLabel=(skill,index)=>`${skill==='reading'||skill==='listening'?'Question':'Task'} ${index+1}`;
// An outline is navigation metadata, never the protected question/answer bank.
export function examSections(catalog,attempt){
 const frozen=attempt?.sections;
 return EXAM_SKILLS.map(skill=>{
  const entry=frozen?.find(s=>s.skill===skill)||catalog?.sections?.[skill];
  const count=skill===attempt?.skill?attempt.totalItems:entry?.items;
  return {skill,name:SKILL_NAMES[skill],icon:SKILL_ICONS[skill],items:Number.isInteger(count)&&count>0&&count<=100?count:0,seconds:entry?.seconds||0,answered:entry?.answered||[]};
 });
}
export function canSelectQuestion(attempt,skill,index){
 if(!attempt||attempt.status!=='active'||attempt.skill!==skill||!Number.isInteger(index)||index<0||index>=attempt.totalItems)return false;
 if(index===attempt.itemIndex)return true;
 return attempt.navigation==='review'&&(skill==='reading'||skill==='writing')&&attempt.question?.responseRemainingSeconds===undefined;
}
