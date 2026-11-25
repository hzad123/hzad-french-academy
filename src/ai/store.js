import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
import {retryAfterMs} from '../auth/rate-limit.js';
// Bound the entire operation, including session restoration and response decoding.
export async function boundedAiRequest(work,signal,timeoutMs){
 const controller=new AbortController(),cancel=()=>controller.abort();
 let rejectAbort;
 const aborted=new Promise((_,reject)=>{rejectAbort=reject});
 const onAbort=()=>rejectAbort(new DOMException('AI request interrupted','AbortError'));
 controller.signal.addEventListener('abort',onAbort,{once:true});
 signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted)cancel();
 const timeout=setTimeout(cancel,timeoutMs);
 try{return await Promise.race([aborted,Promise.resolve().then(()=>{if(controller.signal.aborted)throw new DOMException('AI request interrupted','AbortError');return work(controller.signal)})])}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',onAbort)}
}
export function makeAiStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 const endpoint=SUPABASE_URL+'/functions/v1/academy-ai';let pausedUntil=0;
 async function call(query='',body,signal){
  return boundedAiRequest(async requestSignal=>{
   const session=await requireSession(client);
   if(requestSignal.aborted)throw new DOMException('AI request interrupted','AbortError');
   if(Date.now()<pausedUntil)throw Error('AI requests are paused briefly. Please try again shortly.');
   const response=await fetcher(endpoint+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:requestSignal});
   const result=await response.json().catch(()=>({}));
   if(response.status===429)pausedUntil=Date.now()+retryAfterMs(response.headers.get('Retry-After'),Date.now());
   if(!response.ok){const error=Error(result.error||'AI Learning could not connect. Please try again shortly.');error.status=response.status;error.code=result.code;error.activityStatus=result.status;throw error}
   return result;
  },signal,body?.kind==='conversation'?125000:body?65000:12000);
 }
 return {state:signal=>call('',undefined,signal),activity:(id,signal)=>call('?request='+encodeURIComponent(id),undefined,signal),conversation:(id,signal)=>call('?conversation='+encodeURIComponent(id),undefined,signal),submit:(payload,signal)=>call('',payload,signal)};
}
