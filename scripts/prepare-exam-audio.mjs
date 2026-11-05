// Offline plan by default. --render explicitly performs paid TTS requests.
// Run in a trusted operator machine with the existing key in its environment;
// never copy the key into the repository, CLI arguments, or browser bundle.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
const args=process.argv.slice(2),render=args.includes('--render'),output=resolve(args.find(x=>!x.startsWith('--'))||'/tmp/hzad-private-exam-audio');
if(output.includes('/dist')||output.includes('/src/'))throw Error('Use a private output directory outside public assets.');
const assets=Object.values(BANKS).flatMap(bank=>bank.sections.find(s=>s.skill==='listening').items.map((q,index)=>({path:q.audioPath,script:q.transcript+'\n\nQuestion : '+q.prompt,voice:index%2?'coral':'ash',reviewed:false})));
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'plan.json'),JSON.stringify({authorship:'Original HZad scripts',assets},null,2));
console.log(`${assets.length} original audio scripts planned in private output. No recordings are marked reviewed.`);
if(!render){console.log('No model calls made. --render explicitly generates paid audio.');process.exit(0)}
const key=process.env.OPENAI_API_KEYfrench||process.env.HZAD_EXAM_AUDIO_KEY;if(!key)throw Error('Provide the existing OpenAI key through a secure operator environment.');
for(const asset of assets){
 const file=resolve(output,asset.path);await mkdir(dirname(file),{recursive:true});
 try{const existing=await readFile(file);if(existing.length){console.log('Retained existing recording: '+asset.path);continue}}catch{}
 const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:asset.voice,input:asset.script,instructions:'Speak natural, clearly articulated French at a normal examination pace. Read the scenario without adding explanations. Pause before the final question. For a dialogue, distinguish the turns subtly. Do not read punctuation symbols.',response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Audio generation failed for '+asset.path+'. No automatic retry was made.');
 const bytes=new Uint8Array(await response.arrayBuffer());await writeFile(file,bytes);
 await writeFile(file+'.review.json',JSON.stringify({path:asset.path,sha256:createHash('sha256').update(bytes).digest('hex'),reviewed:false,reviewer:null,notes:'Listen for correct French, complete script/question, natural pacing, no added answers, sensible dialogue turns and comfortable volume.'},null,2));
 console.log('Prepared for human listening review: '+asset.path);
}
