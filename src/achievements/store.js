import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
export const deviceTimeZone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Etc/UTC'}catch{return 'Etc/UTC'}};
export function makeAchievementStore(client){
 const call=async(name,args)=>{await requireSession(client);const {data,error}=await client.rpc(name,args);if(error)throw error;return data};
 return {
  rewards:()=>call('academy_rewards_state',{p_timezone:deviceTimeZone()}),
  preferences:(timezone,name,title)=>call('academy_rewards_preferences',{p_timezone:timezone,p_name:name,p_title:title}),
  certificates:()=>call('academy_certificates_state'),
  certificate:id=>call('academy_certificate_get',{p_id:id}),
  start:(level,textSupport)=>call('academy_final_start',{p_level:level,p_text_support:textSupport}),
  state:id=>call('academy_final_state',{p_attempt:id}),
  answer:(id,question,choice,transcript)=>call('academy_final_answer',{p_attempt:id,p_question:question,p_choice:choice,p_transcript:transcript})
 };
}
// Public verification uses the public key, never a student or administrative token.
export async function verifyCertificate(id,holder,fetcher=globalThis.fetch){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||holder.trim().length<2||holder.length>80)throw Error('Enter a valid certificate ID and the name printed on the certificate.');
 const response=await fetcher(SUPABASE_URL+'/rest/v1/rpc/academy_certificate_verify',{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_holder:holder.trim()})});
 if(!response.ok)throw Error('Certificate verification is unavailable. Please retry.');
 const result=await response.json();if(typeof result?.valid!=='boolean')throw Error('Invalid certificate verification response.');return result;
}
