import {buildWritingSources,NO_WRITING_EVIDENCE} from './sources.js';
// Native shape references trusted source IDs, never AI-copied original text.
// Basic supported types/enums only; server checks tighter output/evidence bounds.
const text={type:'string'};
const taskNumber={type:'integer',enum:[1,2,3]};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=items=>({type:'array',items});
export function createWritingResponseFormat(responses){
 const ids=buildWritingSources(responses).flatMap(group=>group.sources.filter(source=>source.text.trim()).map(source=>source.sourceId));
 const sourceId={type:'string',enum:ids.length?ids:[NO_WRITING_EVIDENCE]};
 const schema=object({
  score:{type:'integer',enum:Array.from({length:21},(_,i)=>i)},
  scoreReason:text,
  criteria:array(object({
   id:{type:'string',enum:['linguistic','pragmatic','sociolinguistic']},
   evidence:object({sourceId}),reason:text,improvement:text
  })),
  tasks:array(object({
   number:taskNumber,onTopic:{type:'boolean'},
   mistakes:array(object({sourceId,corrected:text,explanation:text})),issues:array(text)
  }))
 });
 return {type:'json_schema',json_schema:{name:'hzad_tcf_writing_feedback',strict:true,schema}};
}
export const WRITING_RESPONSE_FORMAT=createWritingResponseFormat(['','','']);
export const WRITING_RESPONSE_SCHEMA=WRITING_RESPONSE_FORMAT.json_schema.schema;
