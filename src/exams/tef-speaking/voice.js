// iOS Safari/WebKit may refuse automatic SpeechSynthesis playback after an
// asynchronous exam request. A DIRECT tap must invoke speak() synchronously.
export function examinerVoiceNeedsTap(navigatorInfo=globalThis.navigator){
 const ua=String(navigatorInfo?.userAgent||'');
 return /iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&Number(navigatorInfo?.maxTouchPoints||0)>1);
}
// Browser speech synthesis is a low-cost voice option. Voices are selected
// explicitly when available, with visible text as an accessibility fallback.
export function createFrenchVoicePlayer({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){
 let cancelCurrent=null,disposed=false;
 const pickVoice=()=>{
  const voices=synthesis?.getVoices?.()||[];
  return voices.find(v=>/^fr-CA$/i.test(v.lang))||
    voices.find(v=>/^fr-FR$/i.test(v.lang))||
    voices.find(v=>/^fr[-_]/i.test(v.lang))||null;
 };
 const stop=()=>{
  cancelCurrent?.();cancelCurrent=null;
  try{synthesis?.cancel?.()}catch{}
 };
 async function speak(text){
  stop();if(disposed||!text?.trim()||!synthesis||!Utterance)return false;
  // Do not await voiceschanged here: any asynchronous wait loses the iOS
  // user gesture and may cause silently blocked speech playback. A French
  // language tag works even before the voices list finishes loading.
  return new Promise(resolve=>{
   let done=false;
   const finish=spoken=>{
    if(done)return;done=true;clearTimeout(timeout);cancelCurrent=null;resolve(spoken);
   };
   cancelCurrent=()=>finish(false);
   const utterance=new Utterance(text);utterance.lang='fr-CA';utterance.rate=.96;
   const voice=pickVoice();if(voice)utterance.voice=voice;
   utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);
   const timeout=setTimeout(()=>{try{synthesis.cancel()}catch{}finish(false)},Math.min(26000,Math.max(5500,text.length*130)));
   try{synthesis.resume?.();synthesis.speak(utterance)}catch{finish(false)}
  });
 }
 return {speak,stop,dispose(){disposed=true;stop()},selectedVoice:()=>pickVoice()?.name||null};
}
