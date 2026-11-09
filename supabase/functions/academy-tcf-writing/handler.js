import bank from '../../exams/tcf-writing-tests.json' with {type:'json'};
import {uuid,fingerprint} from '../academy-ai/contracts.js';
const tests=new Map(bank.tests.map(t=>[t.id,t]));
export function createWritingHandler({authenticate,db,provider,allowedOrigins=new Set(['https://www.teftcf.hzadeducation.org','https://hzad123.github.io'])}){
 return async request=>{
  const origin=request.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(origin&&allowedOrigins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowedOrigins.has(origin))return reply({error:'This origin is not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  try{
   const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!token)return reply({error:'Sign in to open TCF writing.'},401);
   const user=await authenticate(token);
   if(!user?.id||!user.email_confirmed_at)return reply({error:'Sign in with a verified email.'},401);
   const command=(action,id=null,payload={})=>db.adminRpc('academy_tcf_writing_command',{p_user:user.id,p_action:action,p_id:id,p_payload:payload});
   if(request.method==='GET'){
    const id=new URL(request.url).searchParams.get('attempt');
    if(id){if(!uuid(id))return reply({error:'Invalid writing attempt.'},400);return reply(await command('read',id))}
    const [state,history]=await Promise.all([db.userRpc(token,'academy_ai_state',{}),command('list')]);
    const activity=state.activities?.['tcf-writing'];
    return reply({version:bank.version,durationSeconds:bank.durationSeconds,tests:bank.tests,history,wallet:state.wallet,topUpUrl:state.topUpUrl,credits:activity?.credits??null,enabled:!!state.enabled&&!!activity?.enabled&&provider.ready()});
   }
   const reader=request.body?.getReader();if(!reader)return reply({error:'Choose a writing action.'},400);
   let bytes=0,chunks=[];
   while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>40000){await reader.cancel();return reply({error:'Writing request is too long.'},413)}chunks.push(value)}
   const all=new Uint8Array(bytes);let at=0;for(const part of chunks){all.set(part,at);at+=part.length}
   let input;try{input=JSON.parse(new TextDecoder().decode(all))}catch{return reply({error:'Invalid writing request.'},400)}
   if(!input||Array.isArray(input)||Object.keys(input).some(k=>!['kind','id','testId','revision','responses','expectedCredits'].includes(k))||!uuid(input.id)||!['start','save','review'].includes(input.kind))return reply({error:'Invalid writing request.'},400);
   if(input.kind==='start'){
    if(!tests.has(input.testId))return reply({error:'Choose one of the 20 writing tests.'},400);
    return reply(await command('start',input.id,{testId:input.testId}));
   }
   if(input.kind==='save'){
    if(!Number.isSafeInteger(input.revision)||input.revision<0||!Array.isArray(input.responses)||input.responses.length!==3||input.responses.some(s=>typeof s!=='string'||s.length>3500)||input.responses.join('').length>6500)return reply({error:'Check the three writing responses (6,500 characters total).'},400);
    return reply(await command('save',input.id,{revision:input.revision,responses:input.responses}));
   }
   let attempt=await command('read',input.id);
   if(attempt.reviewStatus==='completed')return reply(attempt);
   if(attempt.reviewStatus==='dispatched')return reply({...attempt,processing:true},202);
   if(attempt.reviewStatus==='failed')return reply({error:'This assessment failed and its credits were returned. Your responses are saved. Start a new attempt to try again.'},409);
   if(!Number.isSafeInteger(input.expectedCredits)||input.expectedCredits<1||input.expectedCredits>10000)return reply({error:'Refresh the assessment credit charge.'},400);
   if(!provider.ready())return reply({error:'Writing assessment is unavailable. Your responses remain saved.'},503);
   // Price/availability preview; reserve below remains the atomic authority.
   const snapshot=await db.userRpc(token,'academy_ai_state',{}),activity=snapshot.activities?.['tcf-writing'];
   if(!snapshot.enabled||!activity?.enabled)return reply({error:'AI marking is not open yet. You can keep writing and saving your tests.'},409);
   if(activity.credits!==input.expectedCredits)return reply({error:'The assessment credit charge changed. Reopen the test before submitting.'},409);
   attempt=await command('submit',input.id);
   const test=tests.get(attempt.testId);
   if(!test||attempt.version!==bank.version)throw Error('Unsupported writing test version.');
   const hash=await fingerprint({module:'tcf-writing',version:attempt.version,testId:attempt.testId,responses:attempt.responses});
   const reserved=await db.adminRpc('academy_ai_reserve',{p_user:user.id,p_id:input.id,p_kind:'tcf-writing',p_level:'B2',p_hash:hash,p_expected_credits:input.expectedCredits,p_session:null,p_scenario:null});
   if(reserved.status==='completed')return reply(await command('read',input.id));
   if(reserved.status==='dispatched')return reply({...await command('read',input.id),processing:true},202);
   if(reserved.status==='failed')return reply({error:'This assessment failed. Your responses remain saved; start a new attempt to retry.'},409);
   const claim=await db.adminRpc('academy_ai_claim',{p_user:user.id,p_id:input.id});
   if(!claim.claimed)return reply({...await command('read',input.id),processing:true},202);
   let generated;
   try{generated=await provider.run({test,responses:attempt.responses},claim)}catch{
    let refunded=false;try{await db.adminRpc('academy_ai_fail',{p_user:user.id,p_id:input.id});refunded=true}catch{}
    return reply({error:refunded?'AI marking could not finish. Your credits were returned and responses saved.':'AI marking is being checked. Reopen the saved attempt before retrying.',processing:!refunded},refunded?502:202);
   }
   try{await db.adminRpc('academy_ai_finish',{p_user:user.id,p_id:input.id,p_result:generated.result,p_usage:generated.usage,p_student_text:null})}
   catch{return reply({...await command('read',input.id),processing:true},202)}
   return reply(await command('read',input.id));
  }catch(error){
   const message=String(error?.message||'');
   if(/active academy access|Verified email|not found|permission denied/i.test(message))return reply({error:'Sign in with active academy access to open this writing attempt.'},403);
   if(/Writing|writing|AI credit|Not enough|Daily|allowance|period has ended|already|not available|paused|another|Finish an open/i.test(message))return reply({error:message.slice(0,220)},409);
   return reply({error:'TCF writing could not connect. Your saved responses remain available.'},503);
  }
 };
}
