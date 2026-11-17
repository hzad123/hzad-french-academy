import {requireSession} from '../../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../../config.js';
export function makeTefSpeakingStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 const endpoint=SUPABASE_URL+'/functions/v1/academy-tef-speaking';
 async function call(query='',body,signal,{wav=false}={}){
  const session=await requireSession(client),controller=new AbortController();
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(cancel,body?.audio?150000:90000);
  try{
   const response=await fetcher(endpoint+query,{
    method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,
     ...(!wav?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,signal:controller.signal
   });
   if(wav){
    if(!response.ok)throw Error('Cet enregistrement n’est plus disponible.');
    return response.blob();
   }
   const result=await response.json();
   if(!response.ok){
    const code=/^[A-Z_]{3,36}$/.test(result.code||'')?' · '+result.code:'';
    const error=Error((result.error||'Connexion à l’épreuve TEF impossible.')+code);
    error.status=response.status;throw error;
   }
   return result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
 }
 return {catalog:signal=>call('',null,signal),read:(id,signal)=>call('?attempt='+encodeURIComponent(id),null,signal),
  send:(body,signal)=>call('',body,signal),
  recording:(attemptId,callId,signal)=>call('?attempt='+encodeURIComponent(attemptId)+'&recording='+encodeURIComponent(callId),null,signal,{wav:true})};
}
