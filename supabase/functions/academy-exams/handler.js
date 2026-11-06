import {BANKS} from './banks.js';
import {createAttempt,applyEvent,tick,publicAttempt,completedReview,ExamError,wordCount} from './engine.js';
import {uuid,inspectAudio,fingerprint} from '../academy-ai/contracts.js';
import {reviewQuestion,completedDebrief} from './content.js';
const origins=new Set(['https://www.teftcf.hzadeducation.org','https://hzad123.github.io']);
async function body(request){
 let length=0,text='';const reader=request.body?.getReader(),decoder=new TextDecoder();if(!reader)throw Error('Choose an exam action.');
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>1400000){await reader.cancel();throw Error('Exam request too large.')}text+=decoder.decode(value,{stream:true})}
 return JSON.parse(text+decoder.decode());
}
export function createExamHandler({authenticate,db,storage,provider,clock=Date.now,banks=BANKS}){
 return async request=>{
 const origin=request.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin is not allowed.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!token)return reply({error:'Please sign in.'},401);
  const user=await authenticate(token);if(!user?.id||!user.email_confirmed_at)return reply({error:'Sign in with a verified email.'},401);
  const command=(action,id,payload={})=>db.adminRpc('academy_exam_command',{p_user:user.id,p_action:action,p_id:id,p_payload:payload});
  const reviewCapability=async()=>{try{const state=await db.adminRpc('academy_exam_audio_command',{p_user:user.id,p_action:'state'});return Array.isArray(state?.assets)?state:null}catch{return null}};
  if(request.method==='GET'&&!new URL(request.url).searchParams.has('attempt')){
   const catalog=await db.userRpc(token,'academy_exam_catalog',{});
   return reply({...catalog,canReviewContent:!!await reviewCapability(),exams:catalog.exams.map(e=>({...e,enabled:e.enabled&&provider.ready(),sections:banks[e.exam]?.specification.sections}))});
  }
  const input=request.method==='POST'?await body(request):{kind:'read',id:new URL(request.url).searchParams.get('attempt')};
  if(input.kind==='content-review'||input.kind==='content-audio'){
   const capability=await reviewCapability();if(!capability)return reply({error:'Content review is restricted to the academy administrator.'},403);
   await db.userRpc(token,'academy_exam_catalog',{});
   const bank=banks[input.exam],view=reviewQuestion(bank,input.skill,input.index);
   if(view.skill==='listening'){
    const item=bank.sections.find(s=>s.skill==='listening').items[input.index],asset=capability.assets.find(a=>a.path===item.audioPath);
    view.audioReady=asset?.status==='ready';view.audioReviewed=!!asset?.reviewed;
    if(input.kind==='content-audio'){
     if(!view.audioReady)return reply({error:'This recording still needs generation.'},409);
     return reply({audioUrl:await storage.listeningUrl(item.audioPath)});
    }
   }else if(input.kind==='content-audio')return reply({error:'This is not a listening question.'},400);
   return reply(view);
  }
  if(!uuid(input.id))return reply({error:'Invalid exam attempt.'},400);
  const now=clock();let row,bank;
  if(input.kind==='start'){
   bank=banks[input.exam];if(!bank||!Number.isSafeInteger(input.expectedCredits)||!provider.ready())return reply({error:'Refresh the exam catalogue before starting.'},409);
   const state=createAttempt(bank,{id:input.id,userId:user.id,paidAccessId:input.id,now});
   row=await command('start',input.id,{exam:bank.exam,version:bank.version,credits:input.expectedCredits,state});
  }else row=await command('read',input.id);
  bank=banks[row.exam];if(!bank||row.version!==bank.version)throw new ExamError('This exam version is unavailable.','EXAM_VERSION');
  let state=structuredClone(row.state);
  // Recover persisted provider results after disconnects, without redispatch or
  // another charge. The completed call table is service-only and owner-scoped.
  for(const result of row.callResults||[]){
   if(result.kind==='assess')state.feedback={...state.feedback,[result.taskId]:result};
   else{
    const clips=state.speechEvidence?.[result.taskId]||[];
    if(!clips.some(e=>e.id===result.recordingId))state.speechEvidence={...state.speechEvidence,[result.taskId]:[...clips,{id:result.recordingId,transcript:result.transcript,reply:result.reply,observations:result.observations}]};
   }
  }
  state=tick(state,bank,{userId:user.id,now});
  const save=async next=>{row=await command('save',input.id,{revision:row.revision,state:next});state=row.state};
  // Persist deadline transitions even when the caller returns after a long gap.
  if(JSON.stringify(state)!==JSON.stringify(row.state))await save(state);
  const output=()=>{
   const visible=publicAttempt(state,bank,{userId:user.id,now:clock()});
   visible.closed=!!row.closed_at;visible.credits=row.credits;
   if(visible.skill==='listening')visible.played=!!state.played?.[visible.question.id];
   if(visible.status==='completed'){
    visible.review=completedReview(state,bank,{userId:user.id});
    visible.tasks=bank.sections.filter(s=>['writing','speaking'].includes(s.skill)).flatMap(s=>s.items.map(t=>({id:t.id,skill:s.skill,prompt:t.prompt,criteria:t.criteria,words:wordCount(state.writing[t.id]||''),minWords:t.minWords,maxWords:t.maxWords,response:state.writing[t.id]||state.speechEvidence?.[t.id]?.map(e=>e.transcript).join(' ')||'',recordings:state.speaking[t.id]?.length||0,observedRecordings:state.speechEvidence?.[t.id]?.length||0,missingRecordingIds:(state.speaking[t.id]||[]).filter(r=>!state.speechEvidence?.[t.id]?.some(e=>e.id===r.id)).map(r=>r.id)})));
    visible.writingIssues=visible.tasks.filter(t=>t.skill==='writing').flatMap(t=>!t.words?[{taskId:t.id,issue:'Task not attempted.'}]:t.words<t.minWords?[{taskId:t.id,issue:`Below the ${t.minWords}-word minimum.`}]:t.maxWords&&t.words>t.maxWords?[{taskId:t.id,issue:`Above the ${t.maxWords}-word maximum.`}]:[]);
    for(const task of visible.tasks)task.debrief=completedDebrief(task.id);
   }
   if(visible.skill==='speaking')visible.conversation=state.speechEvidence?.[visible.question.id]?.map(e=>({transcript:e.transcript,reply:e.reply}))||[];
   return visible;
  };
  if(input.kind==='read'||input.kind==='start')return reply(output());
  if(row.closed_at&&input.kind!=='close')return reply({error:'This attempt is closed. Your saved review remains available.'},409);
  if(input.kind==='event'){
   if(!input.event||!['answer','writing','move','finish-section'].includes(input.event.kind))return reply({error:'Invalid exam action.'},400);
   await save(applyEvent(state,bank,{userId:user.id,now,event:input.event}));return reply(output());
  }
  if(input.kind==='close'){
   if(state.status==='active')await save({...state,status:'cancelled',finishedAt:now,deadline:null});
   row=await command('close',input.id);return reply(output());
  }
  if(input.kind==='listen'){
   const view=output();if(view.skill!=='listening'||view.question.id!==input.taskId)throw Error('This listening question is not active.');
   if(state.played?.[input.taskId])throw Error('This recording has already been played.');
   const item=bank.sections[state.section].items[state.item];
   // Fetch before consuming playback. A signed/private URL never contains text.
   const url=await storage.listeningUrl(item.audioPath);
   await save({...state,played:{...state.played,[input.taskId]:true}});return reply({...output(),audioUrl:url});
  }
  if(!['turn','assess','recover'].includes(input.kind)||!uuid(input.callId))return reply({error:'Invalid examiner action.'},400);
  if(!provider.ready())return reply({error:'The examiner is unavailable.'},503);
  const productive=bank.sections.find(s=>s.items.some(t=>t.id===input.taskId)),task=productive?.items.find(t=>t.id===input.taskId);
  if(!task||!['writing','speaking'].includes(productive.skill))throw Error('Invalid assessment task.');
  let next=state,response='',evidence=[],audio,history=[];
  if(input.kind==='turn'){
   if(productive.skill!=='speaking')throw Error('This is not a speaking task.');
   const info=inspectAudio(input.audio);audio=input.audio;
   next=applyEvent(state,bank,{userId:user.id,now,event:{kind:'recording',section:input.section,itemId:task.id,recording:{id:input.callId,seconds:info.seconds,storagePath:user.id+'/'+input.id+'/'+task.id+'/'+input.callId+'.wav'}}});
   if((next.speaking[task.id]?.length||0)>40)throw Error('Task recording limit reached.');
   history=state.speechEvidence?.[task.id]?.map(e=>({learner:e.transcript,interlocutor:e.reply}))||[];
  }else if(input.kind==='recover'){
   const recording=state.speaking[task.id]?.find(r=>r.id===input.recordingId);
   if(!recording||state.speechEvidence?.[task.id]?.some(e=>e.id===recording.id))throw Error('This recording does not need recovery.');
   audio=await storage.recording(recording.storagePath);inspectAudio(audio);
  }else{
   if(state.status!=='completed')throw Error('Finish all sections before requesting feedback.');
   if(state.feedback?.[task.id])return reply(output());
   if(productive.skill==='writing')response=state.writing[task.id]||'';
   else{
    const clips=state.speechEvidence?.[task.id]||[];
    if(clips.length!==(state.speaking[task.id]||[]).length)throw Error('Recover the missing recording feedback before grading this task.');
    response=clips.map(e=>e.transcript).join(' ');evidence=clips.flatMap(e=>e.observations);
    // No recording is an unattempted task, not fabricated acoustic evidence.
    if(!clips.length)evidence=['No audio submitted. All dimensions must receive 0; there is no acoustic evidence.'];
   }
  }
  const hash=await fingerprint({kind:input.kind,taskId:task.id,audio,response,evidence,recordingId:input.recordingId||null});
  const claim=await command('claim-call',input.id,{callId:input.callId,hash,purpose:input.kind==='assess'?'assessment':'turn'});
  let generated;
  if(!claim.claimed){
   if(claim.status==='dispatched')return reply({status:'processing',callId:input.callId},202);
   if(claim.status!=='completed')return reply({error:'This examiner request failed. Your responses remain saved.'},409);
   generated=claim.result;
  }else{
   try{
    if(input.kind==='turn'){
     await storage.saveRecording(user.id+'/'+input.id+'/'+task.id+'/'+input.callId+'.wav',audio);
     await save(next);
    }
    const result=await provider.run({kind:input.kind==='assess'?'assessment':'turn',task,skill:productive.skill,response,evidence,audio,history,settings:row.settings});
    generated={taskId:task.id,kind:input.kind,recordingId:input.recordingId||input.callId,...result.result};
    await command('finish-call',input.id,{callId:input.callId,result:generated,usage:result.usage});
   }catch{
    await command('finish-call',input.id,{callId:input.callId,result:null,usage:{outcome:'provider-or-storage-failure'}}).catch(()=>{});
    return reply({error:'The examiner could not finish. Your saved answers remain available. Check this attempt before retrying.'},502);
   }
  }
  // Merge into the latest revision; another read may have advanced the timer.
  for(let retry=0;retry<3;retry++){
   row=await command('read',input.id);state=row.state;
   if(input.kind==='assess')next={...state,feedback:{...state.feedback,[task.id]:generated}};
   else{
    const clips=state.speechEvidence?.[task.id]||[];
    next={...state,speechEvidence:{...state.speechEvidence,[task.id]:clips.some(e=>e.id===generated.recordingId)?clips:[...clips,{id:generated.recordingId,transcript:generated.transcript,reply:generated.reply,observations:generated.observations}]}};
   }
   try{await save(next);return reply(output())}catch(error){if(retry===2)throw error}
  }
 }catch(error){
  const message=String(error?.message||'');
  if(/access required|not found|permission denied/i.test(message))return reply({error:'An active academy account is required to open this attempt.'},403);
  if(error instanceof ExamError||/Refresh|changed|top-up|allowance|limit|already|prepared|paused|closed|Finish|Recover|active|Invalid|Choose|Record|quiet|recording|task|current mock|too large/i.test(message))return reply({error:message.slice(0,240)},409);
  return reply({error:'The exam could not connect. Your saved answers are retained.'},503);
 }
 };
}
