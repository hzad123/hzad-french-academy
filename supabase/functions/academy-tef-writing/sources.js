// Server-authored references to frozen learner text. The model chooses IDs;
// it never supplies the original wording displayed as correction/evidence.
export const NO_WRITING_EVIDENCE='__no_evidence__';
const MAX_CHARS=160,MIN_CUT=120;
export function buildWritingSources(responses){return responses.map((response,index)=>{
 const sources=[];let at=0;
 if(!response.trim())return {task:index+1,sources};
 while(at<response.length){
  let end=Math.min(at+MAX_CHARS,response.length);
  if(end<response.length){
   let space=-1;for(let i=end-1;i>=at+MIN_CUT;i--)if(/\s/u.test(response[i])){space=i+1;break}
   if(space>at)end=space;
   // Never divide a UTF-16 surrogate pair. Source text remains byte-for-byte
   // from the response; no accent, apostrophe or whitespace normalisation.
   const before=response.charCodeAt(end-1),after=response.charCodeAt(end);
   if(before>=0xD800&&before<=0xDBFF&&after>=0xDC00&&after<=0xDFFF)end--;
  }
  const text=response.slice(at,end);sources.push({sourceId:`t${index+1}-s${sources.length+1}`,text});at=end;
 }
 return {task:index+1,sources};
})}
function sourceError(){throw Error('Invented source evidence.');}
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
export function resolveWritingSources(raw,responses){
 const groups=buildWritingSources(responses),sources=new Map(groups.flatMap(group=>group.sources.map(source=>[source.sourceId,{...source,task:group.task}])));
 const allBlank=responses.every(text=>!text.trim());
 const get=(sourceId,task)=>{
  const source=sources.get(sourceId);if(!source||!source.text.trim()||task!==undefined&&source.task!==task)sourceError();return source;
 };
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid TCF score.');
 if(!Array.isArray(raw.criteria)||!Array.isArray(raw.tasks))throw Error('Invalid writing feedback.');
 return {...raw,criteria:raw.criteria.map(criterion=>{
  if(!criterion||!exactKeys(criterion.evidence,['sourceId']))sourceError();
  const sourceId=criterion.evidence.sourceId;
  let evidence;
  if(sourceId===NO_WRITING_EVIDENCE&&allBlank&&raw.score===0)evidence=[];
  else{const source=get(sourceId);evidence=[{task:source.task,quote:source.text.trim()}]}
  return {...criterion,evidence};
 }),tasks:raw.tasks.map(task=>{
  if(!task||!Array.isArray(task.mistakes))throw Error('Invalid task feedback.');
  return {...task,mistakes:task.mistakes.map(mistake=>{
   if(!exactKeys(mistake,['sourceId','corrected','explanation']))sourceError();
   const source=get(mistake.sourceId,task.number);
   return {original:source.text.trim(),corrected:mistake.corrected,explanation:mistake.explanation};
  })};
 })};
}
