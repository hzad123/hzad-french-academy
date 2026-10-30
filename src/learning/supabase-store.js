// Paid content and progress come from entitlement-protected Supabase tables.
// Do not fall back to public bundled curriculum for unauthorized students.
export function makeLearningStore(client){
 return {
  async listUnits(){
   const {data,error}=await client.rpc('academy_list_units',{p_level:'A0'});
   if(error)throw error;
   // Answer keys must not be used for grading; database RPC grades submissions.
   return (data||[]).map(row=>({
    id:row.id,title:row.title,minutes:row.minutes,
    objectives:row.content?.objectives||[],
    sections:row.content?.sections||[],
    vocabulary:row.content?.vocabulary||[],
    quiz:(row.quiz||[]).map(({id,type,prompt,options})=>({id,type,prompt,options}))
   }));
  },
  async readProgress(){
   const {data,error}=await client.from('academy_learning_progress')
     .select('unit_id,attempts,best_percent,completed,updated_at');
   if(error)throw error;
   return Object.fromEntries((data||[]).map(x=>[x.unit_id,{
    attempts:x.attempts,best:x.best_percent,completed:x.completed,updatedAt:x.updated_at
   }]));
  },
  async checkAnswer(unitId,questionId,answer){
   const {data,error}=await client.rpc('academy_check_answer',{p_unit_id:unitId,p_question_id:questionId,p_answer:answer});
   if(error)throw error;return data;
  },
  async submitQuiz(unitId,answers){
   const {data,error}=await client.rpc('academy_submit_quiz',{p_unit_id:unitId,p_answers:answers});
   if(error)throw error;return data;
  }
 };
}
