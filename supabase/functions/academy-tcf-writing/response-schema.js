// Native Structured Outputs supplies the shape; server validation still verifies
// score, task coverage, bounded text and every learner/source evidence excerpt.
// Use basic supported schema types/enums only. Prompt + validator enforce the
// tighter display/array bounds without relying on unsupported schema keywords.
const text={type:'string'};
const taskNumber={type:'integer',enum:[1,2,3]};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=items=>({type:'array',items});
export const WRITING_RESPONSE_SCHEMA=object({
 score:{type:'integer',enum:Array.from({length:21},(_,i)=>i)},
 scoreReason:text,
 criteria:array(object({
  id:{type:'string',enum:['linguistic','pragmatic','sociolinguistic']},
  evidence:array(object({task:taskNumber,quote:text})),
  reason:text,
  improvement:text
 })),
 tasks:array(object({
  number:taskNumber,
  onTopic:{type:'boolean'},
  mistakes:array(object({original:text,corrected:text,explanation:text})),
  issues:array(text)
 }))
});
export const WRITING_RESPONSE_FORMAT={type:'json_schema',json_schema:{
 name:'hzad_tcf_writing_feedback',strict:true,schema:WRITING_RESPONSE_SCHEMA
}};
