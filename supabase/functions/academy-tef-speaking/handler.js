import {BANK,resolveTest,attemptTest,publicTest,publicCatalog} from './bank.js';
import {uuid,inspectAudio,fingerprint} from '../academy-ai/contracts.js';
import {failureMetadata} from '../academy-tcf-writing/failures.js';
import {speakingTurns} from './provider.js';
const VALID_ACTIONS=new Set(['start','advance','begin_b','turn','feedback_a','feedback_b']);
const ALLOWED_ORIGINS=new Set(['https://www.teftcf.hzadeducation.org','https://hzad123.github.io']);
export function createTefSpeakingHandler({authenticate,db,provider,storage,
 reportFailure=meta=>console.error('HZAD_TEF_SPEAKING_FAILURE '+JSON.stringify(meta)),
 allowedOrigins=ALLOWED_ORIGINS}){
 return async request=>{
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
   'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
   'Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(origin&&allowedOrigins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!allowedOrigins.has(origin))return reply({error:'Origine non autorisée.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply({error:'Méthode non autorisée.'},405);
  try{
   const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!token)return reply({error:'Connectez-vous pour ouvrir votre épreuve TEF.'},401);
   const user=await authenticate(token);
   if(!user?.id||!user.email_confirmed_at)return reply({error:'Vérifiez votre courriel et reconnectez-vous.'},401);
   const command=async(action,id=null,payload={})=>{
    const result=await db.adminRpc('academy_tef_speaking_command',{
     p_user:user.id,p_action:action,p_id:id,p_payload:payload
    });
    return action==='list'?result:{...result,test:publicTest(attemptTest(result))};
   };
   if(request.method==='GET'){
    const search=new URL(request.url).searchParams;
    const id=search.get('attempt'),recording=search.get('recording');
    if(recording){
     if(!uuid(id)||!uuid(recording))return reply({error:'Enregistrement invalide.'},400);
     const attempt=await command('read',id);
     const call=attempt.calls.find(c=>c.id===recording&&c.kind==='turn');
     if(!call)return reply({error:'Enregistrement introuvable.'},404);
     const audio=await storage.read({user:user.id,attempt:id,callId:recording});
     return new Response(audio,{status:200,headers:{...headers,'Content-Type':'audio/wav',
      'Content-Disposition':'inline; filename="reponse-tef.wav"','X-Content-Type-Options':'nosniff'}});
    }
    if(id){if(!uuid(id))return reply({error:'Épreuve introuvable.'},400);return reply(await command('read',id))}
    const [state,history]=await Promise.all([db.userRpc(token,'academy_ai_state',{}),command('list')]);
    return reply({version:BANK.version,tests:publicCatalog(),history,activities:{
     turn:state.activities?.['tef-speaking-turn']||null,
     feedback:state.activities?.['tef-speaking-feedback']||null
    },wallet:state.wallet,enabled:!!state.enabled&&provider.ready()});
   }
   if(!request.body)return reply({error:'Choisissez une action de l’épreuve.'},400);
   const reader=request.body.getReader(),chunks=[];let size=0;
   while(true){
    const {value,done}=await reader.read();if(done)break;
    size+=value.length;
    if(size>1800000){await reader.cancel();return reply({error:'Enregistrement trop volumineux.'},413)}
    chunks.push(value);
   }
   const buffer=new Uint8Array(size);let offset=0;
   for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
   let input;try{input=JSON.parse(new TextDecoder().decode(buffer))}catch{return reply({error:'Requête incorrecte.'},400)}
   if(!input||Array.isArray(input)||typeof input!=='object'
     ||Object.keys(input).some(k=>!['kind','id','testId','version','callId','expectedCredits','audio'].includes(k))
     ||!uuid(input.id)||!VALID_ACTIONS.has(input.kind))return reply({error:'Action TEF incorrecte.'},400);
   if(input.kind==='start'){
    const test=resolveTest(input.testId,input.version);
    return reply(await command('start',input.id,{testId:test.id,version:test.version}));
   }
   if(input.testId!==undefined||input.version!==undefined)return reply({error:'L’épreuve choisie est immuable.'},400);
   if(input.kind==='advance'||input.kind==='begin_b'){
    return reply(await command(input.kind,input.id));
   }
   if(!uuid(input.callId)||!Number.isSafeInteger(input.expectedCredits)||input.expectedCredits<1||input.expectedCredits>10000)
    return reply({error:'Actualisez le prix en crédits.'},400);
   if(!provider.ready())return reply({error:'Examinateur temporairement indisponible.'},503);
   let attempt=await command('read',input.id);
   const call=attempt.calls.find(c=>c.id===input.callId);
   if(call?.status==='completed')return reply(attempt);
   if(call?.status==='dispatched')return reply({processing:true},202);
   if(call?.status==='failed')return reply({error:'Cette tentative a échoué. Les crédits ont été rendus. Recommencez avec un nouveau tour.'},409);
   const kind=input.kind==='turn'?'tef-speaking-turn':'tef-speaking-feedback';
   let recordingSeconds=0,used=0;
   if(input.kind==='turn'){
    if(![0,2].includes(attempt.phase))return reply({error:'Cette section n’est plus en cours.'},409);
    if(typeof input.audio!=='string')return reply({error:'Enregistrez une réponse avant de l’envoyer.'},400);
    recordingSeconds=inspectAudio(input.audio,30).seconds;
    used=speakingTurns(attempt,attempt.phase).reduce((n,t)=>n+t.seconds,0);
    if(used+recordingSeconds>(attempt.phase===0?300:600)+.2)
     return reply({error:'La durée de cette section est atteinte.'},409);
   }else{
    if(input.audio!==undefined)return reply({error:'Aucun fichier audio n’est attendu pour l’évaluation.'},400);
    if(input.kind==='feedback_a'&&attempt.phase<1)return reply({error:'Terminez la section A avant son évaluation.'},409);
    if(input.kind==='feedback_b'&&attempt.phase!==3)return reply({error:'Terminez la section B avant son évaluation.'},409);
    const relevant=speakingTurns(attempt,input.kind==='feedback_a'?0:2);
    if(!relevant.some(t=>t.intelligible&&t.transcript.trim()))
     return reply({error:'Parlez en français dans cette section avant de demander une évaluation.'},409);
    if(attempt.calls.some(c=>c.kind===input.kind&&c.status==='completed'))return reply(attempt);
   }
   // The call ID, WAV hash and owner are immutable once the attempt is locked.
   // Repeated uploads of the same call never trigger a second reserved charge.
   const hash=await fingerprint({attempt:input.id,phase:attempt.phase,kind:input.kind,audio:input.audio||null});
   await command('lock',input.id,{callId:input.callId,hash,kind:input.kind});
   try{
    if(input.kind==='turn'){
     await storage.save({user:user.id,attempt:input.id,callId:input.callId,audio:input.audio});
    }
    const reservation=await db.adminRpc('academy_ai_reserve',{
     p_user:user.id,p_id:input.callId,p_kind:kind,p_level:'B2',p_hash:hash,
     p_expected_credits:input.expectedCredits,p_session:null,p_scenario:null
    });
    if(reservation.status==='completed')return reply(await command('read',input.id));
    if(reservation.status==='failed')return reply({error:'Cette demande a échoué; les crédits ont été remboursés.'},409);
    if(reservation.status==='dispatched')return reply({processing:true},202);
    const claim=await db.adminRpc('academy_ai_claim',{p_user:user.id,p_id:input.callId});
    if(!claim.claimed)return reply({processing:true},202);
    let generated;
    try{generated=await provider.run({kind:input.kind,audio:input.audio,attempt},claim)}
    catch(error){
     const failure=failureMetadata(error);try{reportFailure(failure)}catch{}
     let refunded=false;
     try{await db.adminRpc('academy_ai_fail',{p_user:user.id,p_id:input.callId});refunded=true}catch{}
     return reply({error:refunded?'L’examinateur n’a pas pu terminer. Crédits remboursés; les réponses restent sauvegardées.':'Vérifiez votre tentative sauvegardée avant de réessayer.',
      code:failure.code,processing:!refunded},refunded?502:202);
    }
    const result=input.kind==='turn'?{...generated.result,seconds:recordingSeconds,audioStored:true}:generated.result;
    try{await db.adminRpc('academy_ai_finish',{
     p_user:user.id,p_id:input.callId,p_result:result,p_usage:generated.usage,p_student_text:null
    })}catch{return reply({processing:true},202)}
    return reply(await command('read',input.id));
   }catch(error){
    await command('unlock',input.id,{callId:input.callId}).catch(()=>{});
    throw error;
   }
  }catch(error){
   const message=String(error?.message||'');
   if(/active academy access|not found|permission denied|requires a verified/i.test(message))
    return reply({error:'Un accès actif à l’Académie est nécessaire.'},403);
   if(/Recording|audio|microphone|quiet|speaking|Speaking|section|Section|TEF|credit|credits|allowance|exceeds|not available|already|Finish|pending|limit|durée|temps|saved|dossier/i.test(message))
    return reply({error:message.slice(0,220)},409);
   return reply({error:'Connexion temporairement impossible. Rouvrez votre épreuve sauvegardée.'},503);
  }
 };
}
