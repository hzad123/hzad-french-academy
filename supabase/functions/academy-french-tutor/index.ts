import {createTutorHandler,createTutorProvider} from './handler.js';
const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
async function rpc(token:string,key:string,name:string,args:unknown){
 const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.message||'Database unavailable')}return r.status===204?null:r.json();
}
const db={userRpc:(token:string,name:string,args:unknown)=>rpc(token,anon,name,args),adminRpc:(name:string,args:unknown)=>rpc(service,service,name,args)};
async function authenticate(token:string){const r=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:anon},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Unauthorized');return r.json()}
const provider=createTutorProvider({key:Deno.env.get('OPENAI_API_KEYfrench')||Deno.env.get('OPENAI_API_KEY')||''});
Deno.serve(createTutorHandler({authenticate,db,provider}));
