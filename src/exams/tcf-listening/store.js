import {requireSession} from '../../auth/session.js';
export function makeListeningStore(client){
 async function call(action,id=null,payload={},signal){
  await requireSession(client);
  const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,15000);
  try{
  let query=client.rpc('academy_tcf_listening_command',{p_action:action,p_id:id,p_payload:payload});
  if(query.abortSignal)query=query.abortSignal(controller.signal);
  const {data,error}=await query;if(error)throw Error(error.message||'Listening could not connect.');
  if(!data)throw Error('Listening could not connect.');return data;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
 }
 return {catalog:signal=>call('catalog',null,{},signal),read:(id,signal)=>call('read',id,{},signal),start:(id,paper,signal)=>call('start',id,{testId:paper.id,version:paper.version},signal),answer:(id,revision,number,choice,signal)=>call('answer',id,{revision,number,choice},signal),next:(id,revision,number,signal)=>call('next',id,{revision,number},signal),submit:(id,revision,signal)=>call('submit',id,{revision},signal)};
}
