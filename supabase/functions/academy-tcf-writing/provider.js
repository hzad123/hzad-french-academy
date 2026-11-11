import {assessmentMessages,validateWritingFeedback} from './scoring.js';
import {WritingFailure} from './failures.js';
import {createWritingResponseFormat} from './response-schema.js';
import {resolveWritingSources} from './sources.js';
const VALIDATION_CODES=new Set(['FEEDBACK_FIELDS','FEEDBACK_BOUNDS','FEEDBACK_TASKS','FEEDBACK_CRITERIA','UNCHANGED_CORRECTION']);
export function createWritingProvider({key,fetcher=fetch}){return {
 ready:()=>typeof key==='string'&&!!key.trim(),
 async run(input,configuration){
  // One bounded request, no automatic paid retries. Respect the wallet's
  // reserved model/output ceiling rather than a browser-supplied setting.
  let response;try{response=await fetcher('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:configuration.model,messages:assessmentMessages(input.test,input.responses),max_tokens:configuration.maxOutputTokens,response_format:createWritingResponseFormat(input.responses),store:false}),signal:AbortSignal.timeout(45000)});}catch{throw new WritingFailure('NETWORK')}
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new WritingFailure('PROVIDER_HTTP',{status:response.status,providerCode:body.error?.code})}
  let raw;try{raw=await response.json()}catch{throw new WritingFailure('INVALID_JSON')}if(raw.choices?.[0]?.finish_reason==='length')throw new WritingFailure('TRUNCATED',{usage:raw.usage});
  let parsed;try{parsed=JSON.parse(raw.choices?.[0]?.message?.content)}catch{throw new WritingFailure('INVALID_JSON',{usage:raw.usage})}
  let result;try{result=validateWritingFeedback(resolveWritingSources(parsed,input.responses),input)}catch(error){const reason=String(error.message||'');throw new WritingFailure(VALIDATION_CODES.has(error.validationCode)?error.validationCode:/score/i.test(reason)?'INVALID_SCORE':/Invented|evidence/i.test(reason)?'UNVERIFIED_QUOTE':'INVALID_FEEDBACK',{usage:raw.usage})}
  if(new TextEncoder().encode(JSON.stringify(result)).length>22000)throw new WritingFailure('OUTPUT_TOO_LARGE',{usage:raw.usage});
  const usage={model:String(raw.model||configuration.model).slice(0,100)};
  for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(raw.usage?.[k])&&raw.usage[k]>=0)usage[k]=raw.usage[k];
  return {result,usage};
 }
}}
