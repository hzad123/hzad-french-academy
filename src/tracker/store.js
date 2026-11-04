import {requireSession} from '../auth/session.js';
export function makeTrackerStore(client){
 const call=async(name,args)=>{
  await requireSession(client);
  const {data,error}=await client.rpc(name,args);
  if(error)throw error;
  return data;
 };
 return {
  snapshot:(offset=0)=>call('academy_tracker_snapshot',{p_offset:offset}),
  preferences:(minutes,level)=>call('academy_tracker_preferences',{p_minutes:minutes,p_level:level||null}),
  revise:(unitId,questionId,choice)=>call('academy_tracker_revise',{p_unit_id:unitId,p_question_id:questionId,p_answer:choice})
 };
}
