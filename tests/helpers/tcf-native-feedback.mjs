// Convert hand-authored legacy validator fixtures to the native source-ID
// transport while retaining deliberately invalid fields for negative tests.
import {buildWritingSources} from '../../supabase/functions/academy-tcf-writing/sources.js';
export function nativeFeedback(raw,responses){
 const sources=buildWritingSources(responses);
 const find=(task,excerpt)=>sources.find(s=>s.task===task)?.sources.find(s=>typeof excerpt==='string'&&s.text.includes(excerpt));
 return {
  ...raw,
  criteria:raw.criteria?.map(c=>({...c,improvement:c.improvement??'',evidence:{sourceId:c.evidence?.[0]?find(c.evidence[0].task,c.evidence[0].quote)?.sourceId??'unknown-source':responses.every(s=>!s.trim())&&raw.score===0?'__no_evidence__':'unknown-source'}})),
  tasks:raw.tasks?.map(t=>({...t,mistakes:t.mistakes?.map(m=>{
   const source=find(t.number,m.original);
   return {sourceId:source?.sourceId??'unknown-source',corrected:source?source.text.replace(m.original,m.corrected):m.corrected,explanation:m.explanation};
  })}))
 };
}
export function originalResponses(sourceResponses){return sourceResponses.map(task=>task.sources.map(source=>source.text).join(''))}
