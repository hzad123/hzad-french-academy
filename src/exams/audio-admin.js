import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
import {recordView} from '../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn,alt=false)=>{const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
export function makeAudioAdminStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 return async(body,signal)=>{
  const session=await requireSession(client),controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,120000);
  try{
   const response=await fetcher(SUPABASE_URL+'/functions/v1/academy-exam-audio',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   const data=await response.json();if(!response.ok){const error=Error(data.error||'Audio setup could not connect.');error.status=response.status;error.state=data.state;throw error}return data;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
 };
}
export function wireExamAudioAdmin(root,client,{fetcher}={}){
 const dashboard=root.querySelector('#hz-dashboard'),actions=root.querySelector('.hz-dashboard-actions'),chooser=root.querySelector('#hz-course-chooser');if(!dashboard||!actions)return;
 const call=makeAudioAdminStore(client,fetcher),area=el('section',undefined,'hz-exams hz-hidden');area.id='hz-exam-audio-admin';area.setAttribute('aria-label','Exam audio setup');dashboard.append(area);
 const launch=button('Exam audio setup',()=>{void open()});launch.id='hz-exam-audio-admin-launch';launch.hidden=true;actions.append(launch);
 let snapshot=null,epoch=0,identity=null,checked=null,controller=null,visible=false,running=false,stop=false,activeAudio=null,reviewError='';
 function clear(){epoch++;stop=true;running=false;visible=false;controller?.abort();controller=null;activeAudio?.pause();activeAudio=null;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();identity=null;checked=null;snapshot=null;launch.hidden=true}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 async function discover(session){
  const id=session?.user?.id;if(!id){reset();return}if(identity&&identity!==id)reset();identity=id;if(checked===id)return;checked=id;
  try{const data=await call();if(identity!==id)return;snapshot=data;launch.hidden=false}catch{if(identity===id)launch.hidden=true}
 }
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT')reset();else if(session?.user?.id){const id=session.user.id;if(identity&&identity!==id)reset();identity=id;setTimeout(()=>{if(identity===id)void discover(session)},0)}});
 const initialEpoch=epoch;void client.auth.getSession().then(({data})=>{if(initialEpoch===epoch)return discover(data?.session)}).catch(()=>{});
 function status(text,error=false){let n=area.querySelector('.hz-exam-status');if(!n){n=el('p',undefined,'hz-exam-status');area.append(n)}n.textContent=text;n.setAttribute('role',error?'alert':'status')}
 async function open(){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;stop=false;chooser.classList.add('hz-hidden');area.classList.remove('hz-hidden');area.append(el('p','Loading saved audio progress…'));const ticket=epoch;controller=new AbortController();
  try{const data=await call(null,controller.signal);if(ticket!==epoch)return;snapshot=data;launch.hidden=false;render();recordView(root,'exam-audio-setup',open)}catch(error){if(ticket===epoch){status(error.message,true);if(error.status===401||error.status===403)launch.hidden=true}}
 }
 async function generate(){
  if(running)return;running=true;stop=false;const ticket=epoch;controller=new AbortController();render();
  try{
   while(!stop&&ticket===epoch){
    const data=await call({action:'generate-next'},controller.signal);if(ticket!==epoch)return;snapshot=data;render();
    if(data.busy||data.assets.some(a=>a.status==='generating')){status('A recording is already processing. Refresh saved progress shortly.');break}
    if(!data.assets.some(a=>a.status==='pending')){status('Generation finished. Listen to each recording and approve it below.');break}
   }
  }catch(error){if(ticket===epoch){if(error.state)snapshot=error.state;reviewError=error.name==='AbortError'?'Connection interrupted. Refresh saved progress before starting again.':error.message;render()}}
  finally{if(ticket===epoch){running=false;render()}}
 }
 async function listen(row,container,check,approve){
  const ticket=epoch;const b=container.querySelector('button');b.disabled=true;
  try{
   const result=await call({action:'listen',path:row.path,hash:row.audioHash});if(ticket!==epoch)return;activeAudio?.pause();const audio=el('audio');activeAudio=audio;audio.controls=true;audio.preload='metadata';audio.src=result.url;audio.setAttribute('aria-label','Recording '+row.ordinal);container.append(audio);
   audio.addEventListener('ended',()=>{check.disabled=false;check.dataset.heard='true';status('Playback complete. Check the French and the question before approving.')});
   audio.addEventListener('error',()=>status('This recording could not play. Refresh the link and try again.',true));
   // Controls support mobile autoplay restrictions without another paid call.
   void audio.play().catch(()=>status('Press Play on the audio player to listen.'));
   b.textContent='Refresh playback link';
  }catch(error){if(ticket===epoch)status(error.message,true)}finally{if(ticket===epoch)b.disabled=false}
 }
 async function approve(row,control){
  if(running)return;control.disabled=true;const ticket=epoch;
  try{const data=await call({action:'review',path:row.path,hash:row.audioHash,checked:true});if(ticket===epoch){snapshot=data;render();status('Recording approved.')}}catch(error){if(ticket===epoch){status(error.message,true);control.disabled=false}}
 }
 function render(){
  if(!visible)return;activeAudio?.pause();activeAudio=null;area.replaceChildren();const hero=el('header',undefined,'hz-exam-hero');hero.append(el('p','ACADEMY ADMINISTRATION','hz-eyebrow'),el('h3','Exam audio setup'),el('p','Generate once. Review the French. Reuse recordings for every student.'));area.append(hero);
  if(!snapshot)return;
  const counts={pending:0,generating:0,ready:0,failed:0};snapshot.assets.forEach(a=>counts[a.status]++);const reviewed=snapshot.assets.filter(a=>a.reviewed).length;
  area.append(el('p',`${counts.ready}/${snapshot.assets.length} generated · ${reviewed} approved`,'hz-ai-balance'));
  const progress=el('progress');progress.max=snapshot.assets.length;progress.value=counts.ready;progress.setAttribute('aria-label','Audio recordings generated');area.append(progress);
  area.append(el('p','Estimated OpenAI generation cost: CAD $2–$5 for this set. Student credits are unaffected.'));
  const generateButton=button(counts.ready?'Continue generating exam audio':'Generate exam audio',()=>{void generate()});generateButton.disabled=running||!snapshot.providerReady||!counts.pending||!!counts.generating;area.append(generateButton);
  if(running){const pause=button(stop?'Stopping after this recording…':'Stop after this recording',()=>{stop=true;pause.textContent='Stopping after this recording…';pause.disabled=true},true);pause.disabled=stop;area.append(pause,el('p','Generating one recording at a time. Keep this page open to continue the set.'))}
  else area.append(button('Refresh saved progress',()=>{void open()},true));
  if(counts.generating&&!running)area.append(el('p','A saved generation request is still processing. Refresh before continuing.'));
  if(counts.failed)area.append(el('p',`${counts.failed} recording(s) need attention. They will not be charged again automatically.`,'hz-exam-status'));
  if(!snapshot.providerReady)area.append(el('p','The server OpenAI key needs configuration.'));
  if(reviewError)status(reviewError,true);
  area.append(el('h4','Listen and approve recordings'));
  for(const exam of ['tef-canada','tcf-canada']){
   const group=el('details');group.open=true;group.append(el('summary',exam==='tef-canada'?'TEF Canada recordings':'TCF Canada recordings'));
   for(const row of snapshot.assets.filter(a=>a.exam===exam)){
    const card=el('article',undefined,'hz-exam-review-item');card.append(el('h5',`Recording ${row.ordinal} · ${row.reviewed?'Approved':row.status}`));
    if(row.status==='ready'){
     const text=el('details');text.append(el('summary','Expected French script'),el('p',row.script));card.append(text);
     const label=el('label'),check=el('input');check.type='checkbox';check.disabled=true;label.append(check,el('span',' I listened to the complete recording and checked the French, question, pacing and volume.'));
     const approval=button('Approve recording',()=>{void approve(row,approval)},true);approval.disabled=true;check.addEventListener('change',()=>{approval.disabled=!check.checked||check.dataset.heard!=='true'||running});
     const play=button('Listen to recording',()=>{void listen(row,card,check,approval)},true);play.disabled=running;card.append(play);
     if(!row.reviewed)card.append(label,approval);
    }
    group.append(card);
   }
   area.append(group);
  }
 }
 return {open,reset};
}
