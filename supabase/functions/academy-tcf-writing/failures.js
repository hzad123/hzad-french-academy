const CODES=new Set(['NETWORK','TRUNCATED','INVALID_JSON','INVALID_SCORE','UNVERIFIED_QUOTE','INVALID_FEEDBACK','OUTPUT_TOO_LARGE','UNKNOWN']);
export class WritingFailure extends Error{
 constructor(code,{status,providerCode,usage}={}){super('Writing assessment failed.');this.name='WritingFailure';this.code=code;this.status=status;this.providerCode=providerCode;this.usage=usage}
}
export function failureMetadata(error){
 const out={code:CODES.has(error?.code)?error.code:'UNKNOWN'};
 if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599){out.code='PROVIDER_HTTP';out.status=error.status}
 const allowed=['invalid_api_key','insufficient_quota','model_not_found','rate_limit_exceeded','unsupported_parameter','invalid_request_error','permission_denied'];
 if(allowed.includes(error?.providerCode))out.providerCode=error.providerCode;
 const usage={};for(const key of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isSafeInteger(error?.usage?.[key])&&error.usage[key]>=0)usage[key]=error.usage[key];
 if(Object.keys(usage).length)out.usage=usage;return out;
}
