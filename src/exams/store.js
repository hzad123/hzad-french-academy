import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
export function makeExamStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 async function call(body,signal){
  const session=await requireSession(client),controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,75000);
  try{
   const response=await fetcher(SUPABASE_URL+'/functions/v1/academy-exams',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Your exam could not connect.');return result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
 }
 return {catalog:signal=>call(null,signal),send:(body,signal)=>call(body,signal)};
}
