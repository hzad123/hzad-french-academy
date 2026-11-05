import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
import {retryAfterMs} from '../auth/rate-limit.js';
export function makeAiStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 const endpoint=SUPABASE_URL+'/functions/v1/academy-ai';let pausedUntil=0;
 async function call(query='',body,signal){
  const session=await requireSession(client);
  if(Date.now()<pausedUntil)throw Error('AI requests are paused briefly. Please try again shortly.');
  const controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timeout=setTimeout(cancel,70000);
  try{
   const response=await fetcher(endpoint+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   const result=await response.json().catch(()=>({}));
   if(response.status===429)pausedUntil=Date.now()+retryAfterMs(response.headers.get('Retry-After'),Date.now());
   if(!response.ok){const error=Error(result.error||'AI Learning could not connect. Please try again shortly.');error.status=response.status;error.code=result.code;error.activityStatus=result.status;throw error}
   return result;
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel)}
 }
 return {state:signal=>call('',undefined,signal),activity:(id,signal)=>call('?request='+encodeURIComponent(id),undefined,signal),conversation:(id,signal)=>call('?conversation='+encodeURIComponent(id),undefined,signal),submit:(payload,signal)=>call('',payload,signal)};
}
