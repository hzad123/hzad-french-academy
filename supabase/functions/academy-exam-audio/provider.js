export function createAudioRenderer({key,fetcher=fetch}){
 return {ready:()=>!!key,async render(asset){
  const response=await fetcher('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:asset.voice,input:asset.script,instructions:'Speak natural, clearly articulated French at a normal examination pace. Read only the supplied script and question, without explanations. Pause before the final question. In dialogue, distinguish turns subtly. Do not read punctuation symbols.',response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Audio provider failed.');
  if(!response.headers.get('content-type')?.includes('audio/'))throw Error('Audio provider returned no recording.');
  const reader=response.body?.getReader();if(!reader)throw Error('Audio provider returned no recording.');
  const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>10000000){await reader.cancel();throw Error('Recording exceeded its size limit.')}chunks.push(value)}
  if(size<1000)throw Error('Audio recording was incomplete.');
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return bytes;
 }};
}
