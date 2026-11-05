export function encodeWav(samples,sampleRate){
 const count=Math.floor(samples.length*16000/sampleRate);
 const bytes=new Uint8Array(44+count*2),v=new DataView(bytes.buffer);
 const str=(offset,value)=>{for(let i=0;i<value.length;i++)bytes[offset+i]=value.charCodeAt(i)};
 str(0,'RIFF');v.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){
  const start=Math.floor(i*sampleRate/16000),end=Math.max(start+1,Math.floor((i+1)*sampleRate/16000));let sum=0;
  for(let j=start;j<end&&j<samples.length;j++)sum+=samples[j];
  const value=Math.max(-1,Math.min(1,sum/(end-start)));v.setInt16(44+i*2,value<0?value*32768:value*32767,true);
 }
 return bytes;
}
export function audioBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
export function mountRecorder(parent,onReady=()=>{}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
 const box=el('section');box.className='hz-ai-recorder';
 const record=el('button','● Record French'),stop=el('button','Stop recording'),clear=el('button','Clear recording');
 for(const b of [record,stop,clear]){b.type='button';b.className='hz-btn hz-btn-alt'}stop.disabled=true;stop.dataset.locked='true';clear.hidden=true;
 const status=el('p','Record up to 30 seconds.');status.setAttribute('role','status');
 const playback=el('audio');playback.controls=true;playback.hidden=true;playback.setAttribute('aria-label','Your French recording');
 box.append(record,stop,clear,status,playback);parent.append(box);
 let disposed=false,stream=null,context=null,source=null,processor=null,gain=null,timer=null,url=null,data=null,chunks=[],frames=0,rate=16000,recording=false;
 function release(){recording=false;clearTimeout(timer);for(const node of [source,processor,gain])try{node?.disconnect()}catch{};stream?.getTracks().forEach(t=>t.stop());stream=null;if(context){void context.close().catch(()=>{});context=null}}
 function erase(){if(url)URL.revokeObjectURL(url);url=null;data=null;playback.pause();playback.removeAttribute('src');playback.hidden=true;clear.hidden=true;onReady(null)}
 function finish(){
  if(!recording)return;release();record.disabled=false;stop.disabled=true;stop.dataset.locked='true';record.dataset.locked='false';
  if(disposed)return;
  const samples=new Float32Array(frames);let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length}chunks=[];
  if(frames/rate<.5){status.textContent='Record at least one second and try again.';return}
  const wav=encodeWav(samples,rate);data=audioBase64(wav);url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));playback.src=url;playback.hidden=false;clear.hidden=false;
  status.textContent=`Recording ready · ${(frames/rate).toFixed(1)} seconds.`;record.textContent='● Record again';onReady(data);
 }
 record.addEventListener('click',async()=>{
  if(disposed||recording)return;erase();record.disabled=true;record.dataset.locked='true';status.textContent='Opening microphone…';
  try{
   const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!navigator.mediaDevices?.getUserMedia||!AudioContext)throw Error('Use a browser with microphone recording enabled.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
   if(disposed){release();return}
   context=new AudioContext();await context.resume();if(disposed){release();return}
   rate=context.sampleRate;chunks=[];frames=0;source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);gain=context.createGain();gain.gain.value=0;
   processor.onaudioprocess=event=>{
    if(!recording)return;const input=event.inputBuffer.getChannelData(0),length=Math.min(input.length,Math.max(0,Math.floor(rate*30)-frames));
    if(length){chunks.push(new Float32Array(input.subarray(0,length)));frames+=length}if(frames>=rate*30)finish();
   };
   source.connect(processor);processor.connect(gain);gain.connect(context.destination);recording=true;stop.disabled=false;stop.dataset.locked='false';
   status.textContent='Recording… speak French, then choose Stop recording.';timer=setTimeout(finish,30000);
  }catch{release();if(!disposed){record.disabled=false;record.dataset.locked='false';status.textContent='Microphone access is unavailable. Enable it in your browser and try again.'}}
 });
 stop.addEventListener('click',finish);clear.addEventListener('click',()=>{erase();status.textContent='Record up to 30 seconds.'});
 return {getAudio:()=>data,isRecording:()=>recording,dispose(){disposed=true;release();erase();chunks=[]}};
}
