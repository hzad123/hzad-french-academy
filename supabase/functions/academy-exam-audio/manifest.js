import {BANKS} from '../academy-exams/banks.js';
export const AUDIO_ASSETS=Object.values(BANKS).flatMap(bank=>bank.sections.find(s=>s.skill==='listening').items.map((item,index)=>({path:item.audioPath,exam:bank.exam,version:bank.version,ordinal:index+1,script:item.transcript+'\n\nQuestion : '+item.prompt,voice:index%2?'coral':'ash'})));
export async function scriptHash(asset){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({model:'gpt-4o-mini-tts',script:asset.script,voice:asset.voice})));
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
