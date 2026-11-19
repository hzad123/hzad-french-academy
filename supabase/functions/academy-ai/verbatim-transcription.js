import {WritingFailure} from '../academy-tcf-writing/failures.js';

// Independent speech recognition is a DATA CAPTURE step, not a French tutor.
// Never include the task prompt, dialogue history, scoring rubric or expected answer.
export const FRENCH_VERBATIM_PROMPT =
 'Transcription brute, mot pour mot, d’un apprenant de français. '+
 'Conservez exactement les mots prononcés, même les accords faux, '+
 'conjugaisons fautives, articles manquants, hésitations, répétitions, '+
 'faux départs et phrases inachevées. Ne reformulez pas, ne corrigez '+
 'pas la grammaire, ne complétez jamais une phrase ni une idée, '+
 'n’ajoutez aucun mot non entendu. Si rien n’est intelligible, texte vide.';

export async function transcribeFrenchLearnerWav({audio,key,fetcher=fetch,maxChars=5000}={}){
 if(typeof audio!=='string'||!audio||!Number.isInteger(maxChars)||maxChars<1||maxChars>10000)
  throw new WritingFailure('INVALID_AUDIO');
 let binary;
 try{binary=atob(audio)}catch{throw new WritingFailure('INVALID_AUDIO')}
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 // The preferred recognizer supports multilingual hints. Certain accounts
 // reject this newer model/parameter combination with HTTP 400. Fall back
 // ONCE to the supported 4o-mini recognizer, using its singular language field.
 // Never retry an accepted inference, a 429, a 5xx, or a network failure.
 const makeForm=(legacy=false)=>{
  const form=new FormData();
  form.append('file',new Blob([bytes],{type:'audio/wav'}),'student-response.wav');
  form.append('model',legacy?'gpt-4o-mini-transcribe':'gpt-transcribe');
  if(legacy)form.append('language','fr');else form.append('languages[]','fr');
  form.append('response_format','json');
  form.append('prompt',FRENCH_VERBATIM_PROMPT);
  return form;
 };
 const send=async legacy=>{
  try{return await fetcher('https://api.openai.com/v1/audio/transcriptions',{
   method:'POST',headers:{Authorization:'Bearer '+key},body:makeForm(legacy),
   signal:AbortSignal.timeout(65000)
  })}catch{throw new WritingFailure('NETWORK')}
 };
 let response=await send(false),model='gpt-transcribe';
 if(response.status===400){
  // Rejected before transcription; fallback uses the existing paid ASR flow,
  // no additional student credit charge and no changed exam data.
  response=await send(true);
  model='gpt-4o-mini-transcribe';
 }
 if(!response.ok){
  const error=await response.json().catch(()=>({}));
  throw new WritingFailure('PROVIDER_HTTP',{status:response.status,providerCode:error.error?.code});
 }
 let raw;try{raw=await response.json()}catch{throw new WritingFailure('INVALID_JSON')}
 if(typeof raw?.text!=='string')throw new WritingFailure('TRANSCRIPT_MISSING');
 const transcript=raw.text.trim(); // Whitespace only; no grammar/word postprocessing.
 if(transcript.length>maxChars)throw new WritingFailure('TRANSCRIPT_LIMIT');
 // With no confidently detected language, a nonempty result is not reliable
 // evidence for a French proficiency grade. Reject it instead of guessing.
 if(transcript&&Array.isArray(raw.languages)&&raw.languages.length===0)
  throw new WritingFailure('TRANSCRIPT_UNCERTAIN');
 return {transcript,usage:raw.usage??null,model};
}
