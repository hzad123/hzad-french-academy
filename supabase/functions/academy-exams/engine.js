// Server-only deterministic mock-exam engine. Never import into the browser.
// The storage adapter must load an attempt by verified user identity, lock it,
// call one transition, and commit the resulting state in one transaction.
export class ExamError extends Error{constructor(message,code='EXAM_INPUT'){super(message);this.code=code}}
const objective=new Set(['reading','listening']);
const productive=new Set(['writing','speaking']);
const clone=value=>structuredClone(value);
function insist(condition,message,code){if(!condition)throw new ExamError(message,code)}
export function validateBank(bank){
 insist(bank&&['tef-canada','tcf-canada'].includes(bank.exam),'Choose an exam.');
 insist(typeof bank.version==='string'&&bank.version.length>0,'Missing bank version.');
 insist(bank.specification?.verified===true&&typeof bank.specification.verifiedAt==='string'&&bank.specification.sources?.length>=1,'Official format sources must be verified before starting.','EXAM_UNVERIFIED');
 insist(Array.isArray(bank.sections)&&bank.sections.length===4,'An exam needs all four skills.');
 const skills=bank.sections.map(s=>s.skill);insist(new Set(skills).size===4&&skills.every(s=>objective.has(s)||productive.has(s)),'Exam skills are incomplete.');
 const ids=new Set();
 for(const section of bank.sections){
  insist(Number.isInteger(section.seconds)&&section.seconds>0&&section.seconds<=7200,'Invalid section duration.');
  insist(['review','forward'].includes(section.navigation),'Invalid section navigation.');
  const expected=bank.specification.sections[section.skill];
  insist(expected&&Number.isInteger(expected.items)&&expected.items>0&&Array.isArray(section.items)&&section.seconds===expected.seconds&&section.items.length===expected.items,'The bank does not match its verified specification.');
  for(const item of section.items){
   insist(typeof item.id==='string'&&!ids.has(item.id),'Duplicate/missing task ID.');ids.add(item.id);
   insist(typeof item.prompt==='string'&&item.prompt.trim().length>0,'A task is empty.');
   if(objective.has(section.skill)){
    insist(Array.isArray(item.options)&&item.options.length===4&&new Set(item.options).size===4&&item.options.every(o=>typeof o==='string'&&o.trim()),'An objective item needs four distinct choices.');
    insist(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4&&typeof item.explanation==='string'&&item.explanation.trim(),'An objective item needs an authoritative key and explanation.');
    if(section.skill==='listening'){
     insist(typeof item.audioPath==='string'&&item.audioPath.startsWith(bank.version+'/')&&!item.audioPath.includes('..'),'Missing private listening audio.');
     insist(typeof item.transcript==='string'&&item.transcript.trim(),'Missing listening transcript for completed review.');
    }
   }else{
    insist(Array.isArray(item.criteria)&&item.criteria.length>=3&&new Set(item.criteria).size===item.criteria.length,'Missing assessment criteria.');
    if(section.skill==='writing')insist(Number.isInteger(item.minWords)&&item.minWords>0&&(item.maxWords==null||Number.isInteger(item.maxWords)&&item.maxWords>=item.minWords),'Invalid writing constraints.');
    else insist(Number.isInteger(item.responseSeconds)&&item.responseSeconds>0&&item.responseSeconds<=section.seconds&&typeof item.examinerRole==='string'&&item.examinerRole.trim(),'Missing speaking timing/role.');
   }
  }
 }
 return true;
}
export function createAttempt(bank,{id,userId,paidAccessId,now}){
 validateBank(bank);insist(id&&userId&&paidAccessId&&Number.isFinite(now),'Paid, owned exam access is required.');
 return {id,userId,paidAccessId,exam:bank.exam,version:bank.version,status:'active',section:0,item:0,startedAt:now,sectionStartedAt:now,itemStartedAt:now,deadline:now+bank.sections[0].seconds*1000,answers:{},writing:{},speaking:{},sectionResults:[],finishedAt:null,feedback:{}};
}
function context(attempt,bank,userId){
 insist(attempt.userId===userId,'Exam attempt not found.','EXAM_OWNERSHIP');
 insist(attempt.version===bank.version&&attempt.exam===bank.exam,'The attempt bank is unavailable.','EXAM_VERSION');
}
export function wordCount(text){return text.trim()?text.trim().split(/\s+/u).length:0}
function resultFor(section,attempt){
 if(objective.has(section.skill))return {skill:section.skill,correct:section.items.filter(q=>attempt.answers[q.id]===q.answer).length,total:section.items.length};
 if(section.skill==='writing')return {skill:'writing',tasks:section.items.map(t=>({id:t.id,words:wordCount(attempt.writing[t.id]||''),submitted:!!attempt.writing[t.id]?.trim()}))};
 return {skill:'speaking',tasks:section.items.map(t=>({id:t.id,recordings:(attempt.speaking[t.id]||[]).length,seconds:(attempt.speaking[t.id]||[]).reduce((sum,r)=>sum+r.seconds,0)}))};
}
function nextSection(attempt,bank,when){
 const section=bank.sections[attempt.section];attempt.sectionResults.push(resultFor(section,attempt));attempt.section++;attempt.item=0;
 if(attempt.section>=bank.sections.length){attempt.status='completed';attempt.finishedAt=when;attempt.deadline=null;return}
 attempt.sectionStartedAt=when;attempt.itemStartedAt=when;attempt.deadline=when+bank.sections[attempt.section].seconds*1000;
}
export function tick(state,bank,{userId,now}){
 context(state,bank,userId);insist(Number.isFinite(now),'Invalid server clock.');const attempt=clone(state);
 while(attempt.status==='active'){
  const section=bank.sections[attempt.section],item=section.items[attempt.item];
  if(now>=attempt.deadline){nextSection(attempt,bank,attempt.deadline);continue}
  if(section.skill==='speaking'||section.skill==='writing'&&item.responseSeconds){
   const end=attempt.itemStartedAt+((item.preparationSeconds||0)+item.responseSeconds)*1000;
   if(now>=end){if(attempt.item+1<section.items.length){attempt.item++;attempt.itemStartedAt=end}else nextSection(attempt,bank,end);continue}
  }
  break;
 }
 return attempt;
}
export function applyEvent(state,bank,{userId,now,event}){
 const attempt=tick(state,bank,{userId,now});
 insist(attempt.status==='active','This exam is complete.','EXAM_FINISHED');
 const section=bank.sections[attempt.section];
 insist(event&&event.section===attempt.section,'This section has ended.','EXAM_STALE');
 if(event.kind==='finish-section'){
  nextSection(attempt,bank,now);return attempt;
 }
 const item=section.items[attempt.item];insist(item&&event.itemId===item.id,'This question is not active.','EXAM_ELIGIBILITY');
 if(event.kind==='answer'){
  insist(objective.has(section.skill)&&Number.isInteger(event.choice)&&event.choice>=0&&event.choice<4,'Choose one of the four answers.');
  if(section.navigation==='forward'&&Object.hasOwn(attempt.answers,item.id))insist(attempt.answers[item.id]===event.choice,'This answer has already been saved.','EXAM_REPLAY');
  attempt.answers[item.id]=event.choice;
 }else if(event.kind==='writing'){
  insist(section.skill==='writing'&&typeof event.text==='string'&&event.text.length<=12000,'Invalid written response.');
  attempt.writing[item.id]=event.text;
 }else if(event.kind==='recording'){
  insist(section.skill==='speaking'&&event.recording&&typeof event.recording.id==='string'&&event.recording.storagePath===userId+'/'+attempt.id+'/'+item.id+'/'+event.recording.id+'.wav','This recording is not owned by this task.','EXAM_AUDIO');
  insist(Number.isFinite(event.recording.seconds)&&event.recording.seconds>=.5&&event.recording.seconds<=30,'Record one speaking turn, up to 30 seconds.');
  const responseStart=attempt.itemStartedAt+(item.preparationSeconds||0)*1000;
  insist(now>=responseStart,'Preparation time is still running.');
  const recordings=attempt.speaking[item.id]||(attempt.speaking[item.id]=[]),existing=recordings.find(r=>r.id===event.recording.id);
  if(existing){insist(existing.seconds===event.recording.seconds,'Recording ID already used.');return attempt}
  insist(recordings.reduce((sum,r)=>sum+r.seconds,0)+event.recording.seconds<=item.responseSeconds,'Task recording limit reached.');
  insist(recordings.reduce((sum,r)=>sum+r.seconds,0)+event.recording.seconds<=(now-responseStart)/1000+1,'Recording exceeds elapsed response time.');
  // storagePath/duration are storage-adapter verified, not browser claims.
  recordings.push({id:event.recording.id,storagePath:event.recording.storagePath,seconds:event.recording.seconds});
 }else if(event.kind==='move'){
  insist(Number.isInteger(event.index)&&event.index>=0&&event.index<section.items.length,'Invalid question.');
  if(section.navigation==='forward')insist(event.index===attempt.item+1,'You can only move to the next question.');
  // Timed productive tasks cannot be restarted or skipped with a move event.
  insist(section.skill!=='speaking'&&!item.responseSeconds,'This task advances when its timer ends.');
  attempt.item=event.index;
 }else throw new ExamError('Unknown exam action.');
 return attempt;
}
export function publicAttempt(state,bank,{userId,now}){
 const attempt=tick(state,bank,{userId,now});
 const summary={id:attempt.id,exam:attempt.exam,version:attempt.version,status:attempt.status,startedAt:attempt.startedAt,finishedAt:attempt.finishedAt,sectionResults:clone(attempt.sectionResults),sections:bank.sections.map(s=>({skill:s.skill,seconds:s.seconds,items:s.items.length,answered:s.items.flatMap((q,i)=>Object.hasOwn(attempt.answers,q.id)||!!attempt.writing[q.id]?.trim()||(attempt.speaking[q.id]||[]).length?[i]:[])}))};
 if(attempt.status==='completed')return {...summary,feedback:clone(attempt.feedback)};
 const section=bank.sections[attempt.section],item=section.items[attempt.item];
 const question={id:item.id,prompt:item.prompt};
 if(item.passage)question.passage=item.passage;
 if(objective.has(section.skill)){question.options=clone(item.options);question.savedAnswer=attempt.answers[item.id]??null;if(section.skill==='listening')question.audioPath=item.audioPath}
 else if(section.skill==='writing'){question.minWords=item.minWords;question.maxWords=item.maxWords;question.savedText=attempt.writing[item.id]||'';if(item.responseSeconds)question.responseRemainingSeconds=Math.max(0,Math.ceil((attempt.itemStartedAt+item.responseSeconds*1000-now)/1000))}
 else{question.responseSeconds=item.responseSeconds;question.preparationSeconds=item.preparationSeconds||0;question.savedRecordings=(attempt.speaking[item.id]||[]).length;const responseStart=attempt.itemStartedAt+question.preparationSeconds*1000;question.phase=now<responseStart?'preparation':'response';question.preparationRemainingSeconds=Math.max(0,Math.ceil((responseStart-now)/1000));question.responseRemainingSeconds=Math.max(0,Math.ceil((responseStart+item.responseSeconds*1000-Math.max(now,responseStart))/1000))}
 return {...summary,serverNow:now,section:attempt.section,skill:section.skill,itemIndex:attempt.item,totalItems:section.items.length,navigation:section.navigation,deadline:attempt.deadline,remainingSeconds:Math.max(0,Math.ceil((attempt.deadline-now)/1000)),question};
}
export function completedReview(state,bank,{userId}){
 context(state,bank,userId);insist(state.status==='completed','Finish the exam to open corrections.');
 return bank.sections.filter(s=>objective.has(s.skill)).map(s=>({skill:s.skill,items:s.items.map(q=>({id:q.id,prompt:q.prompt,passage:q.passage,options:clone(q.options),chosen:state.answers[q.id]??null,correct:q.answer,explanation:q.explanation,...(s.skill==='listening'?{transcript:q.transcript}:{})}))}));
}
