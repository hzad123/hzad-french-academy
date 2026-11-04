import {requireSession} from '../auth/session.js';
export function makePlacementStore(client){
 const call=async(name,args)=>{
  await requireSession(client);
  const {data,error}=await client.rpc(name,args);
  if(error)throw error;
  if(!data||!Array.isArray(data.history))throw Error('Invalid placement response.');
  return data;
 };
 return {
  state:id=>call('academy_placement_state',{p_attempt:id||null}),
  start:()=>call('academy_placement_start'),
  answer:(id,question,choice,mode)=>call('academy_placement_answer',{p_attempt:id,p_question:question,p_choice:choice,p_mode:mode})
 };
}
