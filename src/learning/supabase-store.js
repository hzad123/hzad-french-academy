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
   const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError||!session?.access_token)throw Error('Your login session is missing. Sign out and sign in again.');
   if(session.expires_at && session.expires_at*1000<Date.now()+30000){
     const {data:refreshed,error:refreshError}=await client.auth.refreshSession();
     if(refreshError||!refreshed.session)throw Error('Your login session expired. Sign out and sign in again.');
   }
   const {data:verified,error:verifyError}=await client.auth.getUser();
   if(verifyError||!verified.user)throw Error('Supabase could not authenticate this session. Sign out and sign in again.');
   const {data,error}=await client.rpc('academy_check_answer',{p_unit_id:unitId,p_question_id:questionId,p_answer:answer});
   if(error){
     if(error.code==='42501'||/permission denied for function/i.test(error.message||'')){
       throw Error('Supabase rejected the quiz request (42501) despite a verified user. Check the request Authorization role and the live database function grants.');
     }
     throw error;
   }return data;
  },
  async submitQuiz(unitId,answers){
   const {data,error}=await client.rpc('academy_submit_quiz',{p_unit_id:unitId,p_answers:answers});
   if(error)throw error;return data;
  }
 };
}
