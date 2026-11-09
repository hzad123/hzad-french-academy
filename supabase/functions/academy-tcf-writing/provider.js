import {assessmentMessages,validateWritingFeedback} from './scoring.js';
export function createWritingProvider({key,fetcher=fetch}){return {
 ready:()=>typeof key==='string'&&!!key.trim(),
 async run(input,configuration){
  // One bounded request, no automatic paid retries. Respect the wallet's
  // reserved model/output ceiling rather than a browser-supplied setting.
  const response=await fetcher('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:configuration.model,messages:assessmentMessages(input.test,input.responses),max_tokens:configuration.maxOutputTokens,response_format:{type:'json_object'},store:false}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('Writing provider failed.');
  const raw=await response.json();if(raw.choices?.[0]?.finish_reason==='length')throw Error('Incomplete writing feedback.');
  const result=validateWritingFeedback(JSON.parse(raw.choices?.[0]?.message?.content),input);
  if(new TextEncoder().encode(JSON.stringify(result)).length>22000)throw Error('Writing feedback is too long.');
  const usage={model:String(raw.model||configuration.model).slice(0,100)};
  for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(raw.usage?.[k])&&raw.usage[k]>=0)usage[k]=raw.usage[k];
  return {result,usage};
 }
}}
