import {requireSession} from '../auth/session.js';
// Database transport consumes the cached session, not a fresh Auth request.
export function makeLearningStore(client,level='A0'){
 if(!['A0','A1','A2','B1','B2','C1','C2'].includes(level))throw Error('Unknown French level');
 return {
  async listUnits(){
   await requireSession(client);
   const {data,error}=await client.rpc('academy_list_units',{p_level:level});
   if(error)throw error;
   return (data||[]).map(row=>({id:row.id,title:row.title,minutes:row.minutes,
     sections:row.content?.sections||[],vocabulary:row.content?.vocabulary||[],
     listeningChecks:row.content?.listening_checks||[],practiceTasks:row.content?.practice_tasks||[],
     assessmentDomains:row.content?.assessment_domains||[],
     quiz:(row.quiz||[]).map(({id,type,prompt,options})=>({id,type,prompt,options}))}));
  },
  async readProgress(){
   await requireSession(client);
   const {data,error}=await client.from('academy_learning_progress').select('unit_id,attempts,best_percent,completed,updated_at');
   if(error)throw error;
   return Object.fromEntries((data||[]).map(x=>[x.unit_id,{attempts:x.attempts,best:x.best_percent,completed:x.completed,updatedAt:x.updated_at}]));
  },
  async checkAnswer(unitId,questionId,answer){
   await requireSession(client);
   const {data,error}=await client.rpc('academy_check_answer',{p_unit_id:unitId,p_question_id:questionId,p_answer:answer});
   if(error)throw error;
   if(typeof data?.correct!=='boolean')throw Error('Answer checking returned an invalid response.');
   return data;
  },
  async submitQuiz(unitId,answers){
   await requireSession(client);
   const {data,error}=await client.rpc('academy_submit_quiz',{p_unit_id:unitId,p_answers:answers});
   if(error)throw error;return data;
  }
 };
}
