import {WritingFailure} from '../academy-tcf-writing/failures.js';

// This request sees ONLY the microphone WAV: no exam scenario, examiner role or
// previous dialogue. Those belong to the separate examiner reply request.
export async function transcribeTefWav({audio,key,fetcher=fetch}){
 if(typeof audio!=='string'||!audio)throw new WritingFailure('INVALID_AUDIO');
 let binary;
 try{binary=atob(audio)}catch{throw new WritingFailure('INVALID_AUDIO')}
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const form=new FormData();
 form.append('file',new Blob([bytes],{type:'audio/wav'}),'student-response.wav');
 form.append('model','gpt-4o-mini-transcribe');
 form.append('language','fr');
 // Deliberately do not include task topics, example dialogue, or expected words:
 // context can bias speech recognition to produce words never spoken.
 let response;
 try{response=await fetcher('https://api.openai.com/v1/audio/transcriptions',{
  method:'POST',headers:{Authorization:'Bearer '+key},body:form,
  signal:AbortSignal.timeout(45000)
 })}catch{throw new WritingFailure('NETWORK')}
 if(!response.ok){
  const err=await response.json().catch(()=>({}));
  throw new WritingFailure('PROVIDER_HTTP',{status:response.status,providerCode:err.error?.code});
 }
 let raw;try{raw=await response.json()}catch{throw new WritingFailure('INVALID_JSON')}
 if(typeof raw?.text!=='string')throw new WritingFailure('TRANSCRIPT_MISSING');
 // Never generate or correct transcript text from the exam scenario.
 const transcript=raw.text.trim();
 if(transcript.length>1100)throw new WritingFailure('TRANSCRIPT_LIMIT');
 return {transcript,usage:raw.usage||null};
}
