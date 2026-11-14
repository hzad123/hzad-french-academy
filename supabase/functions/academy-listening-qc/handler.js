import {modelRequest,validateResult,MODEL,MAX_OUTPUT,PRICES,POLICY_VERSION,policyFingerprint} from './contracts.js';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createQcHandler({adminToken,providerKey,fetcher=fetch}) {
 return async request=>{
  // This endpoint is exclusively for a trusted offline authoring runner.
  // Students and the public cannot call the model or spend provider funds.
  const supplied=request.headers.get('x-listening-qc-token');
  if(typeof adminToken!=='string'||adminToken.length<32||supplied!==adminToken)return reply(401,{error:'QC_ADMIN_REQUIRED'});
  if(request.method!=='POST')return reply(405,{error:'METHOD'});
  if(!providerKey)return reply(503,{error:'QC_PROVIDER_NOT_CONFIGURED'});
  let stage,input,body,expectedPolicyHash;
  try {
   const bytes=await request.arrayBuffer();if(bytes.byteLength>350000)return reply(413,{error:'INPUT_LIMIT'});
   ({stage,input,policyHash:expectedPolicyHash}=JSON.parse(new TextDecoder().decode(bytes)));
   if(stage==='health')return reply(200,{ready:true,policy:POLICY_VERSION,policyHash:await policyFingerprint(),model:MODEL});
   body=modelRequest(stage,input);
  }catch{return reply(400,{error:'QC_INPUT'});}
  const policyHash=await policyFingerprint();
  if(expectedPolicyHash!==policyHash)return reply(409,{error:'QC_POLICY_MISMATCH'});
  try {
   const response=await fetcher('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+providerKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
   if(!response.ok)return reply(502,{error:'QC_PROVIDER',providerStatus:response.status});
   const raw=await response.json();
   if(raw.choices?.[0]?.finish_reason!=='stop')return reply(502,{error:'QC_INCOMPLETE_OUTPUT'});
   const result=validateResult(stage,JSON.parse(raw.choices[0].message.content));
   const usage=raw.usage;
   if(!raw.id||!Number.isInteger(usage?.prompt_tokens)||!Number.isInteger(usage?.completion_tokens)||usage.prompt_tokens<0||usage.completion_tokens<0||usage.completion_tokens>MAX_OUTPUT[stage])return reply(502,{error:'QC_USAGE'});
   return reply(200,{stage,policy:POLICY_VERSION,policyHash,model:raw.model||MODEL,responseId:raw.id,result,usage,
    costUsd:(usage.prompt_tokens*PRICES.inputPerMillion+usage.completion_tokens*PRICES.outputPerMillion)/1e6});
  }catch{return reply(502,{error:'QC_PROVIDER_OR_SCHEMA'});}
 };
}
