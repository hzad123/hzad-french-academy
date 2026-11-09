import {requireSession} from '../../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../../config.js';
export function makeWritingStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 async function call(query='',body,signal){
  const session=await requireSession(client),controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,70000);
  try{
   const response=await fetcher(SUPABASE_URL+'/functions/v1/academy-tcf-writing'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'TCF writing could not connect.');return data;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
 }
 return {catalog:signal=>call('',null,signal),read:(id,signal)=>call('?attempt='+encodeURIComponent(id),null,signal),send:(body,signal)=>call('',body,signal)};
}
