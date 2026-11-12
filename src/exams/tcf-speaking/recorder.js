import {encodeWav,audioBase64} from '../../ai/audio.js';
// The microphone stays ready between turns; only the student's answer is saved.
export function createSpeakingRecorder({onLimit=()=>{},onStatus=()=>{}}={}){
 let disposed=false,stream,context,source,processor,gain,timer,recording=false,chunks=[],frames=0,data=null,limit=30,preparing=null;
 function stop(){
  clearTimeout(timer);if(!recording)return data;recording=false;
  const samples=new Float32Array(frames);let at=0;for(const chunk of chunks){samples.set(chunk,at);at+=chunk.length}chunks=[];
  if(frames/context.sampleRate<.5){onStatus('Speak for at least one second before submitting.');data=null;return null}
  let energy=0;for(const x of samples)energy+=x*x;
  if(Math.sqrt(energy/samples.length)<.003){onStatus('No audible speech detected. Check your microphone and try again.');data=null;return null}
  data=audioBase64(encodeWav(samples,context.sampleRate));return data;
 }
 async function prepare(){
  if(preparing){void context?.resume().catch(()=>{});return preparing}
  preparing=setup();try{return await preparing}finally{preparing=null}
 }
 async function setup(){
  if(disposed)throw Error('The microphone was closed. Reopen this test.');
  if(stream&&context){await context.resume();return}
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!navigator.mediaDevices?.getUserMedia||!AudioContext)throw Error('Microphone recording requires HTTPS and a supported browser.');
  // Resume within the start/submit gesture, before permission or network waits.
  context=new AudioContext();const activeContext=context,resumed=context.resume();onStatus('Allow microphone access to begin.');
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
   if(disposed){stream.getTracks().forEach(t=>t.stop());throw Error('Microphone closed.')}
   await resumed;source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);gain=context.createGain();gain.gain.value=0;
   processor.onaudioprocess=event=>{
    if(!recording)return;const input=event.inputBuffer.getChannelData(0),n=Math.min(input.length,Math.max(0,Math.floor(context.sampleRate*limit)-frames));
    if(n){chunks.push(new Float32Array(input.subarray(0,n)));frames+=n}
    if(frames>=context.sampleRate*limit)finish()
   };
   source.connect(processor);processor.connect(gain);gain.connect(context.destination);onStatus('Microphone ready.');
  }catch(error){stream?.getTracks().forEach(t=>t.stop());stream=null;void activeContext.close().catch(()=>{});context=null;throw error}
 }
 function finish(){if(!recording||disposed)return;const audio=stop();queueMicrotask(()=>{if(!disposed)onLimit(audio)})}
 async function start(seconds=30){await prepare();if(disposed)return;stop();data=null;chunks=[];frames=0;limit=Math.min(30,Math.max(.5,seconds));recording=true;onStatus('● Recording — speak now. Press Submit response when finished.');timer=setTimeout(finish,limit*1000)}
 return {prepare,start,stop,isRecording:()=>recording,getAudio:()=>data,dispose(){disposed=true;recording=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());for(const node of [source,processor,gain])try{node?.disconnect()}catch{};void context?.close().catch(()=>{});chunks=[];data=null}};
}
