import {createHandler} from './handler.js';
import {createOpenAiProvider} from './provider.js';
import {AiError} from './contracts.js';

const url=Deno.env.get('SUPABASE_URL')||'';
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
async function rpc(token:string,key:string,name:string,args:unknown){
 const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.message||'AI database request failed')}
 return response.status===204?null:response.json();
}
const db={userRpc:(token:string,name:string,args:unknown)=>rpc(token,publicKey,name,args),adminRpc:(name:string,args:unknown)=>rpc(serviceKey,serviceKey,name,args)};
async function authenticate(token:string){
 const response=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:publicKey},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new AiError('Please sign in again to use AI Learning.',401,'AI_AUTH');
 return response.json();
}
const provider=createOpenAiProvider({key:Deno.env.get('OPENAI_API_KEY')||''});
Deno.serve(createHandler({authenticate,db,provider}));
