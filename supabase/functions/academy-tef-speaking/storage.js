// Private Storage broker. Student browsers never receive a service role credential
// or a public object URL. Edge endpoint authorizes by attempt owner before reading.
export function createTefAudioStorage({url,serviceKey,fetcher=fetch}){
 const bucket='academy-tef-speaking';
 const keyFor=(user,attempt,callId)=>[user,attempt,callId+'.wav'].join('/');
 const headers=()=>({Authorization:'Bearer '+serviceKey,apikey:serviceKey});
 const decode=base64=>{
  const binary=atob(base64);const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
 };
 return {
  async save({user,attempt,callId,audio}){
   const bytes=decode(audio);
   if(bytes.length<16044||bytes.length>1100000)throw Error('Recording exceeds private storage size limit.');
   const res=await fetcher(url+'/storage/v1/object/'+bucket+'/'+keyFor(user,attempt,callId),{
    method:'POST',headers:{...headers(),'Content-Type':'audio/wav','x-upsert':'true'},
    body:bytes,signal:AbortSignal.timeout(20000)
   });
   if(!res.ok)throw Error('Private speaking recording could not be saved.');
   return true;
  },
  async read({user,attempt,callId}){
   const res=await fetcher(url+'/storage/v1/object/'+bucket+'/'+keyFor(user,attempt,callId),{
    headers:headers(),signal:AbortSignal.timeout(20000)
   });
   if(!res.ok)throw Error('Saved recording is not available.');
   return new Uint8Array(await res.arrayBuffer());
  }
 };
}
