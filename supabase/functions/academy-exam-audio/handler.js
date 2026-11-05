import {AUDIO_ASSETS,scriptHash} from './manifest.js';
const origins=new Set(['https://www.teftcf.hzadeducation.org','https://hzad123.github.io']);
async function json(request){const reader=request.body?.getReader();if(!reader)throw Error('Invalid action.');let size=0,text='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error('Invalid action.')}text+=decoder.decode(value,{stream:true})}return JSON.parse(text+decoder.decode())}
export function createAudioAdminHandler({authenticate,db,storage,renderer,assets=AUDIO_ASSETS}){
 return async request=>{
  const origin=request.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'Origin is not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  try{
   const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!token)return reply({error:'Please sign in.'},401);
   const user=await authenticate(token);if(!user?.id||!user.email_confirmed_at)return reply({error:'Please sign in with a verified email.'},401);
   const command=(action,path=null,hash=null,claim=null,data={})=>db.command({p_user:user.id,p_action:action,p_path:path,p_hash:hash,p_claim:claim,p_data:data});
   // This service-only RPC checks the pinned operator UUID on EVERY action.
   const initial=await command('state');
   const visible=state=>({...state,providerReady:renderer.ready(),assets:state.assets.map(row=>{const spec=assets.find(a=>a.path===row.path);return {...row,script:spec?.script||'',voice:spec?.voice||''}})});
   if(request.method==='GET')return reply(visible(initial));
   const input=await json(request);if(!input||Object.keys(input).some(k=>!['action','path','hash','checked'].includes(k)))return reply({error:'Invalid action.'},400);
   if(input.action==='generate-next'){
    if(!renderer.ready())return reply({error:'The server OpenAI key is not configured.'},503);
    const pending=initial.assets.find(row=>row.status==='pending');if(!pending)return reply(visible(initial));
    const asset=assets.find(a=>a.path===pending.path);if(!asset)throw Error('Recording version unavailable.');
    const hash=await scriptHash(asset);if(hash!==pending.scriptHash)return reply({error:'The audio script changed. Deployment review is required.'},409);
    const claim=await command('claim',asset.path,hash);if(!claim.claimed)return reply({...visible(await command('state')),busy:true});
    try{
     const bytes=await renderer.render(asset);
     const digest=await crypto.subtle.digest('SHA-256',bytes),sha256=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
     await storage.save(asset.path,bytes);
     await command('finish',asset.path,hash,claim.id,{sha256,bytes:bytes.length});
    }catch{
     await command('fail',asset.path,hash,claim.id).catch(()=>{});
     return reply({error:'This recording needs attention. Completed files are saved; no automatic retry was made.',state:visible(await command('state'))},502);
    }
    return reply(visible(await command('state')));
   }
   const asset=assets.find(a=>a.path===input.path);if(!asset)return reply({error:'Invalid recording.'},400);
   if(input.action==='listen'){
    await command('preview',asset.path,input.hash);
    const url=await storage.signedUrl(asset.path);return reply({url});
   }
   if(input.action==='review'){
    if(input.checked!==true)return reply({error:'Confirm you checked the recording.'},400);
    await command('review',asset.path,input.hash);return reply(visible(await command('state')));
   }
   return reply({error:'Invalid action.'},400);
  }catch(error){
   const message=String(error?.message||'');
   if(/operator|required|permission denied/i.test(message))return reply({error:'This tool is restricted to the academy audio administrator.'},403);
   if(/Recording|recording|changed|preview|already|Invalid/.test(message))return reply({error:message.slice(0,180)},409);
   return reply({error:'The audio setup could not connect. Refresh to check saved progress.'},503);
  }
 };
}
