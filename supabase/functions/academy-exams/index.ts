import {createExamHandler} from './handler.js';
import {createExamProvider} from './provider.js';
import {providerKey} from '../academy-ai/config.js';
const url=Deno.env.get('SUPABASE_URL')||'',publicKey=Deno.env.get('SUPABASE_ANON_KEY')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
async function rpc(token:string,key:string,name:string,args:unknown){
 const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+token,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.message||'Exam database unavailable')}
 return response.json();
}
const db={userRpc:(token:string,name:string,args:unknown)=>rpc(token,publicKey,name,args),adminRpc:(name:string,args:unknown)=>rpc(serviceKey,serviceKey,name,args)};
const path=(value:string)=>value.split('/').map(encodeURIComponent).join('/');
const auth={Authorization:'Bearer '+serviceKey,apikey:serviceKey};
const storage={
 async listeningUrl(file:string){
  const response=await fetch(url+'/storage/v1/object/sign/academy-exam-listening/'+path(file),{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('The listening recording is unavailable.');
  const data=await response.json();return url+'/storage/v1'+data.signedURL;
 },
 async saveRecording(file:string,audio:string){
  const bytes=Uint8Array.from(atob(audio),c=>c.charCodeAt(0));
  const response=await fetch(url+'/storage/v1/object/academy-exam-recordings/'+path(file),{method:'POST',headers:{...auth,'Content-Type':'audio/wav','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Your recording could not be saved.');
 },
 async recording(file:string){
  const response=await fetch(url+'/storage/v1/object/authenticated/academy-exam-recordings/'+path(file),{headers:auth,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Your saved recording is unavailable.');
  const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
 }
};
async function authenticate(token:string){
 const response=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:publicKey},signal:AbortSignal.timeout(10000)});
 if(!response.ok)return null;return response.json();
}
Deno.serve(createExamHandler({authenticate,db,storage,provider:createExamProvider({key:providerKey(name=>Deno.env.get(name))})}));
