import {TESTS,resolveTest,attemptTest,publicTest} from './bank.js';
import {uuid,inspectAudio,fingerprint} from '../academy-ai/contracts.js';
import {failureMetadata} from '../academy-tcf-writing/failures.js';
export function createSpeakingHandler({authenticate,db,provider}){return async request=>{
 const origin=request.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
 const allowed=['https://www.teftcf.hzadeducation.org','https://hzad123.github.io'];if(allowed.includes(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
 if(origin&&!allowed.includes(origin))return reply({error:'Origin not allowed'},403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!token)return reply({error:'Sign in to open speaking'},401);
  const user=await authenticate(token);if(!user?.id||!user.email_confirmed_at)return reply({error:'Sign in with verified email'},401);
  const command=async(action,id=null,payload={})=>{const result=await db.adminRpc('academy_tcf_speaking_command',{p_user:user.id,p_action:action,p_id:id,p_payload:payload});return action==='list'?result:{...result,test:publicTest(attemptTest(result))}};
  if(request.method==='GET'){
   const id=new URL(request.url).searchParams.get('attempt');if(id){if(!uuid(id))return reply({error:'Invalid speaking attempt'},400);return reply(await command('read',id))}
   const [state,history]=await Promise.all([db.userRpc(token,'academy_ai_state',{}),command('list')]);
   const tests=TESTS.map(publicTest),test=tests[0];
   return reply({test,tests,activities:state.activities,wallet:state.wallet,enabled:state.enabled&&provider.ready(),history});
  }
  const reader=request.body?.getReader();let bytes=0,parts=[];if(!reader)return reply({error:'Choose a speaking action'},400);
  while(true){const x=await reader.read();if(x.done)break;bytes+=x.value.length;if(bytes>11600000){await reader.cancel();return reply({error:'Recording too large'},413)}parts.push(x.value)}
  const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length}const input=JSON.parse(new TextDecoder().decode(all));
  if(!input||Object.keys(input).some(k=>!['kind','id','callId','audio','expectedCredits','testId','version'].includes(k))||!uuid(input.id)||!['start','advance','begin_monologue','turn','feedback'].includes(input.kind))return reply({error:'Invalid speaking request'},400);
  if(input.kind!=='start'&&(input.testId!==undefined||input.version!==undefined))return reply({error:'Speaking paper is fixed for this saved attempt'},400);
  if(input.kind==='start'){const paper=resolveTest(input.testId,input.version);return reply(await command('start',input.id,{testId:paper.id,version:paper.version}))}
  if(['advance','begin_monologue'].includes(input.kind))return reply(await command(input.kind,input.id));
  if(!uuid(input.callId)||!Number.isSafeInteger(input.expectedCredits)||input.expectedCredits<1)return reply({error:'Refresh the speaking price'},400);
  let attempt=await command('read',input.id);if(input.kind==='feedback'&&attempt.calls.some(c=>c.kind==='feedback'&&c.status==='completed'))return reply(attempt);
  if(!provider.ready())return reply({error:'Speaking examiner is unavailable'},503);
  let recordingSeconds;
  if(input.kind==='turn'){
   recordingSeconds=inspectAudio(input.audio,attempt.phase===3?270:30).seconds;
   if(![0,2,3].includes(attempt.phase))return reply({error:'This speaking task is not active'},409);
   const used=attempt.calls.filter(c=>c.id!==input.callId&&c.kind==='turn'&&c.phase===attempt.phase&&c.status==='completed').reduce((n,c)=>n+(c.result?.seconds||0),0);
   if(used+recordingSeconds>attemptTest(attempt).phases[attempt.phase].seconds+.01)return reply({error:'Recorded speaking time for this task is complete'},409);
  }
  else if(input.audio||attempt.phase!==4)return reply({error:'Finish all three tasks before feedback'},409);
  if(input.kind==='feedback'&&!attempt.calls.some(c=>c.kind==='turn'&&c.status==='completed'&&c.result?.intelligible&&c.result?.transcript?.trim()))return reply({error:'Record intelligible French before requesting a score.'},409);
  const kind='tcf-speaking-'+(input.kind==='turn'?'turn':'feedback'),hash=await fingerprint({attempt:input.id,phase:attempt.phase,kind:input.kind,audio:input.audio||null});
  await command('lock',input.id,{callId:input.callId,hash,kind:input.kind});
  try{
   const reservation=await db.adminRpc('academy_ai_reserve',{p_user:user.id,p_id:input.callId,p_kind:kind,p_level:'B2',p_hash:hash,p_expected_credits:input.expectedCredits,p_session:null,p_scenario:null});
   if(reservation.status==='completed')return reply(await command('read',input.id));
   if(reservation.status==='failed')return reply({error:'That examiner request failed. Your credits were returned. Record a new turn when ready.'},409);
   if(reservation.status==='dispatched')return reply({processing:true},202);
   const claim=await db.adminRpc('academy_ai_claim',{p_user:user.id,p_id:input.callId});if(!claim.claimed)return reply({processing:true},202);
   let generated;try{generated=await provider.run({kind:input.kind,audio:input.audio,attempt},claim)}catch(error){
    const failure=failureMetadata(error);await db.adminRpc('academy_ai_fail',{p_user:user.id,p_id:input.callId});await command('read',input.id);return reply({error:'The examiner could not finish. Credits returned; saved speaking turns remain available. Reference: '+(failure.providerCode||failure.code),failure},502);
   }
   try{await db.adminRpc('academy_ai_finish',{p_user:user.id,p_id:input.callId,p_result:input.kind==='turn'?{...generated.result,seconds:recordingSeconds}:generated.result,p_usage:generated.usage,p_student_text:null})}catch{return reply({processing:true},202)}
   return reply(await command('read',input.id));
  }catch(error){await command('unlock',input.id,{callId:input.callId}).catch(()=>{});throw error}
 }catch(error){
  const m=String(error.message||'');if(/not found|access|Verified|permission denied/i.test(m))return reply({error:'Active academy access is required'},403);
  if(/Speaking|speaking|credit|allowance|period|examiner|preparation|task|record|quiet|pending|available|limit|Finish|Complete|Use|already/i.test(m))return reply({error:m.slice(0,220)},409);
  return reply({error:'Speaking could not connect. Reopen the saved attempt before sending again.'},503);
 }
}}
