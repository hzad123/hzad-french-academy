import {AiError,validateInput,uuid,fingerprint} from './contracts.js';
const MAX_BODY=1400000;
async function readJson(request){
 const reader=request.body?.getReader();if(!reader)throw new AiError('Choose an AI activity.');
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new AiError('Please use a shorter text or recording.',413)}chunks.push(value)}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(data))}catch{throw new AiError('Invalid AI activity.')}
}
function safeError(error){
 if(error instanceof AiError)return error;
 const message=String(error?.message||'');
 if(/Verified email|active academy access/.test(message))return new AiError('Please sign in with active academy access.',403,'AI_ACCESS');
 if(/Not enough AI credits|Included AI learning period|Daily AI practice limit|AI study allowance|already in progress|AI Learning is not available|AI Learning is paused|trainer is paused|Conversation complete|AI credit price changed/.test(message))return new AiError(message,409,'AI_ALLOWANCE');
 if(/not found|Request ID already|Invalid|Choose a conversation/.test(message))return new AiError('This activity could not be opened. Please refresh and retry.',409,'AI_REQUEST');
 return new AiError('AI Learning could not load. Please try again shortly.',503,'AI_UNAVAILABLE');
}
export function createHandler({authenticate,db,provider,allowedOrigins=new Set(['https://www.teftcf.hzadeducation.org','https://hzad123.github.io'])}){
 return async request=>{
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(origin&&allowedOrigins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.has(origin))return reply({error:'This origin is not allowed.',code:'AI_ORIGIN'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  let user,token;
  try{
   token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!token)throw new AiError('Please sign in to use AI Learning.',401,'AI_AUTH');
   user=await authenticate(token);
   if(!user?.id||!user.email_confirmed_at)throw new AiError('Please sign in with a verified email.',401,'AI_AUTH');
   if(request.method==='GET'){
    const id=new URL(request.url).searchParams.get('request');
    const conversationId=new URL(request.url).searchParams.get('conversation');
    if(conversationId){if(!uuid(conversationId))throw new AiError('Invalid conversation ID.');return reply(await db.userRpc(token,'academy_ai_conversation',{p_id:conversationId}))}
    if(id){if(!uuid(id))throw new AiError('Invalid activity ID.');return reply(await db.userRpc(token,'academy_ai_request',{p_id:id}))}
    const state=await db.userRpc(token,'academy_ai_state',{});
    return reply({...state,enabled:!!state.enabled&&provider.ready()});
   }
   const input=validateInput(await readJson(request));
   if(!provider.ready())throw new AiError('AI Learning is being prepared. Please return soon.',503,'AI_UNAVAILABLE');
   const reserved=await db.adminRpc('academy_ai_reserve',{p_user:user.id,p_id:input.id,p_kind:input.kind,p_level:input.level,p_hash:await fingerprint(input),p_expected_credits:input.expectedCredits,p_session:input.conversationId||null,p_scenario:input.scenario||null});
   if(reserved.status==='completed')return reply(reserved);
   if(reserved.status==='failed')return reply({id:input.id,status:'failed',error:'This activity could not complete. Your credits were returned. Start a new activity when ready.'},409);
   if(reserved.status==='dispatched')return reply({id:input.id,status:'processing'},202);
   let claim;
   try{claim=await db.adminRpc('academy_ai_claim',{p_user:user.id,p_id:input.id})}
   catch(error){await db.adminRpc('academy_ai_fail',{p_user:user.id,p_id:input.id}).catch(()=>{});throw error}
   if(!claim.claimed)return reply({id:input.id,status:'processing'},202);
   let generated;
   try{generated=await provider.run(input,claim)}
   catch(error){
    let refunded=false;try{await db.adminRpc('academy_ai_fail',{p_user:user.id,p_id:input.id});refunded=true}catch{}
    return reply({id:input.id,status:refunded?'failed':'processing',error:refunded?'The trainer could not complete this activity. Your credits were returned.':'Your activity is being checked. Open saved activity shortly.'},refunded?502:202);
   }
   try{return reply(await db.adminRpc('academy_ai_finish',{p_user:user.id,p_id:input.id,p_result:generated.result,p_usage:generated.usage,p_student_text:input.kind==='conversation'?(input.text||generated.result.transcript||'Spoken reply'):null}))}
   catch{return reply({id:input.id,status:'processing'},202)}
  }catch(error){const safe=safeError(error);return reply({error:safe.message,code:safe.code},safe.status)}
 };
}
