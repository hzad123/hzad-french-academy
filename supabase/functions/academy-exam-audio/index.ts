import {createAudioAdminHandler} from './handler.js';
import {createAudioRenderer} from './provider.js';
import {providerKey} from '../academy-ai/config.js';
const url=Deno.env.get('SUPABASE_URL')||'',publicKey=Deno.env.get('SUPABASE_ANON_KEY')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const headers={Authorization:'Bearer '+serviceKey,apikey:serviceKey};
const path=(file:string)=>file.split('/').map(encodeURIComponent).join('/');
const db={async command(args:unknown){
 const response=await fetch(url+'/rest/v1/rpc/academy_exam_audio_command',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.message||'Audio database unavailable.')}return response.json();
}};
const storage={async save(file:string,bytes:Uint8Array){
 const response=await fetch(url+'/storage/v1/object/academy-exam-listening/'+path(file),{method:'POST',headers:{...headers,'Content-Type':'audio/mpeg','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Recording upload failed.');
},async signedUrl(file:string){
 const response=await fetch(url+'/storage/v1/object/sign/academy-exam-listening/'+path(file),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Recording playback unavailable.');const result=await response.json();return url+'/storage/v1'+result.signedURL;
}};
async function authenticate(token:string){const response=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:publicKey},signal:AbortSignal.timeout(10000)});return response.ok?response.json():null}
Deno.serve(createAudioAdminHandler({authenticate,db,storage,renderer:createAudioRenderer({key:providerKey(name=>Deno.env.get(name))})}));
