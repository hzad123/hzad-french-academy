import {formatCredits,creditLabel} from './credit-scale.js';
import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
import {retryAfterMs} from '../auth/rate-limit.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(label,fn,cls='')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',fn);return b};
export function makeTutorStore(client,fetcher=globalThis.fetch.bind(globalThis)){
 let pauseUntil=0;
 return async(query='',payload,signal)=>{
  const session=await requireSession(client);
  if(Date.now()<pauseUntil)throw Error('Requests are briefly paused. Try again shortly.');
  const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timeout=setTimeout(cancel,85000);
  try{
   const r=await fetcher(SUPABASE_URL+'/functions/v1/academy-french-tutor'+query,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:controller.signal});
   const d=await r.json().catch(()=>({}));if(r.status===429)pauseUntil=Date.now()+retryAfterMs(r.headers.get('Retry-After'),Date.now());
   if(!r.ok){const e=Error(d.error||'The tutor could not connect.');e.status=r.status;e.requestStatus=d.status;throw e}return d;
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel)}
 };
}
export function wireFrenchTutor(root,client,{fetcher}={}){
 const dashboard=root.querySelector('#hz-dashboard');if(!dashboard)return;
 const call=makeTutorStore(client,fetcher);
 let viewer=null,epoch=0,controller=null,open=false,active=false,busy=false,snapshot=null,conversation=null,pending=null,initialized=false,notice='',draft='';
 const dock=el('div',undefined,'hz-tutor-dock hz-hidden');dashboard.append(dock);
 const launcher=btn('✦ HZad French Tutor',()=>toggle(!open),'hz-tutor-launch');
 launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','hz-french-tutor-panel');
 const panel=el('section',undefined,'hz-tutor-panel hz-hidden');panel.id='hz-french-tutor-panel';panel.setAttribute('aria-label','HZad French Tutor');
 const head=el('header',undefined,'hz-tutor-head'),brand=el('div',undefined,'hz-tutor-brand');brand.append(el('strong','HZad French Tutor'),el('span','Your French learning assistant'));
 const close=btn('×',()=>toggle(false),'hz-tutor-close');close.setAttribute('aria-label','Minimize French tutor');head.append(brand,close);
 const balance=el('div',undefined,'hz-tutor-balance'),actions=el('div',undefined,'hz-tutor-actions'),log=el('div',undefined,'hz-tutor-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
 const status=el('p',undefined,'hz-tutor-status');status.setAttribute('role','status');const form=el('form',undefined,'hz-tutor-form');
 const input=el('textarea');input.rows=2;input.maxLength=2000;input.placeholder='Ask a question in any language…';input.setAttribute('aria-label','Your message to HZad French Tutor');
 const send=el('button','Send','hz-tutor-send');send.type='submit';
 form.append(input,send);panel.append(head,balance,actions,log,status,form);dock.append(panel,launcher);
 const validWallet=()=>{const w=snapshot?.wallet,c=snapshot?.credits;return !!snapshot?.enabled&&Number.isSafeInteger(c)&&c>0&&!!w&&w.available>=c&&w.budgetAvailable&&Date.parse(w.expiresAt)>Date.now()};
 function controls(){input.disabled=!active;send.disabled=busy||!active||!validWallet()||!!pending||!input.value.trim()||!!conversation&&conversation.messages.length>=24;send.textContent=Number.isSafeInteger(snapshot?.credits)?'Send · '+creditLabel(snapshot.credits):'Send';}
 function reset(){epoch++;controller?.abort();controller=null;viewer=null;active=false;busy=false;open=false;snapshot=null;conversation=null;pending=null;initialized=false;notice='';draft='';input.value='';dock.classList.add('hz-hidden');panel.classList.add('hz-hidden');launcher.setAttribute('aria-expanded','false');render()}
 root.addEventListener('hzad-clear-lessons',reset);
 root.addEventListener('hzad-access-active',event=>{const id=event.detail?.userId;if(!id)return;if(viewer&&viewer!==id)reset();viewer=id;active=true;dock.classList.remove('hz-hidden');controls()});
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset()});
 function toggle(next){if(!active)return;open=next;panel.classList.toggle('hz-hidden',!open);launcher.setAttribute('aria-expanded',String(open));launcher.classList.toggle('hz-tutor-launch-open',open);if(open){if(!busy)void run(async signal=>refresh(signal));input.focus()}else launcher.focus()}
 root.addEventListener('hzad-open-french-tutor',()=>toggle(true));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();toggle(false)}});
 input.addEventListener('input',()=>{draft=input.value;controls()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!send.disabled)form.requestSubmit()}});
 form.addEventListener('submit',e=>{e.preventDefault();if(send.disabled)return;pending={id:crypto.randomUUID(),text:draft.trim(),conversationId:conversation?.id||null,expectedCredits:snapshot.credits};draft='';input.value='';void run(submitPending)});
 async function run(work){if(busy||!active)return;busy=true;const ticket=epoch;controller=new AbortController();render();try{await work(controller.signal,ticket)}catch(e){if(ticket===epoch)notice=e.name==='AbortError'?'Connection interrupted. Check your saved message before sending again.':e.message||'The tutor could not connect.'}finally{if(ticket===epoch){busy=false;controller=null;render()}}}
 async function refresh(signal,ticket=epoch){
  const s=await call('',undefined,signal);if(ticket!==epoch)return;snapshot=s;
  if(!initialized){initialized=true;const latest=s.conversations?.[0];if(latest){const c=await call('?conversation='+encodeURIComponent(latest.id),undefined,signal);if(ticket!==epoch)return;conversation=c}}
  if(!pending){const saved=s.history?.find(x=>x.status==='reserved'||x.status==='dispatched');if(saved)pending={id:saved.id,conversationId:saved.conversationId,recovered:true}}
  if(!validWallet()&&s.wallet&&(!s.wallet.available||Date.parse(s.wallet.expiresAt)<=Date.now()||!s.wallet.budgetAvailable))notice='AI credits expired or exhausted. Top up to continue.';
 }
 async function receive(r,signal,ticket){
  if(ticket!==epoch)return;
  if(r.status==='completed'){
   if(r.conversationId){const c=await call('?conversation='+encodeURIComponent(r.conversationId),undefined,signal);if(ticket!==epoch)return;conversation=c}
   pending=null;notice='';await refresh(signal,ticket);
  }else if(r.status==='failed'){pending=null;notice='This message did not complete. Your credit was returned.';await refresh(signal,ticket)}
  else notice='Your message is being checked. Use Check message to retrieve it without another charge.';
 }
 async function submitPending(signal,ticket){
  if(!pending||pending.recovered)return;const payload={...pending};notice='';
  try{const r=await call('',payload,signal);await receive(r,signal,ticket)}
  catch(e){if(ticket!==epoch)return;if(e.requestStatus==='failed'||[400,401,403,409].includes(e.status)){pending=null;draft=payload.text;input.value=draft;try{await refresh(signal,ticket)}catch{}}throw e}
 }
 function render(){
  balance.replaceChildren();actions.replaceChildren();log.replaceChildren();
  const c=snapshot?.credits,w=snapshot?.wallet;
  balance.append(el('strong',Number.isSafeInteger(c)?creditLabel(c)+' per message':'Loading credit price…'),el('span',w?formatCredits(w.available)+' credits remaining':''));
  if(snapshot&&!validWallet()){let url;try{const u=new URL(snapshot.topUpUrl);if(u.protocol==='https:')url=u.href}catch{}if(url){const a=el('a','Top up credits');a.href=url;a.target='_blank';a.rel='noopener noreferrer';balance.append(a)}else balance.append(el('span',snapshot.enabled?'Contact the academy for credit top-ups.':'Tutor temporarily unavailable.'))}
  const newChat=btn('New chat',()=>{conversation=null;notice='';initialized=true;render();input.focus()});newChat.disabled=busy||!!pending;
  const reload=btn('Refresh balance',()=>void run(refresh));reload.disabled=busy;actions.append(newChat,reload);
  if(snapshot?.conversations?.length){const history=el('select');history.setAttribute('aria-label','Saved tutor chats');history.append(el('option','Saved chats'));history.options[0].value='';for(const row of snapshot.conversations){const o=el('option',new Date(row.updatedAt).toLocaleString()+' · '+row.turns+' messages');o.value=row.id;history.append(o)}history.value=conversation?.id||'';history.disabled=busy||!!pending;history.onchange=()=>{const id=history.value;if(id)void run(async(signal,ticket)=>{const c=await call('?conversation='+encodeURIComponent(id),undefined,signal);if(ticket===epoch){conversation=c;notice=''}})};actions.append(history)}
  if(!conversation?.messages?.length)log.append(el('div','Bonjour ! I’m your HZad French Tutor. Ask me for a meaning, translation, grammar explanation, or examples.','hz-tutor-bubble hz-tutor-assistant'));
  for(const m of conversation?.messages||[]){const bubble=el('div',m.content,'hz-tutor-bubble '+(m.role==='user'?'hz-tutor-user':'hz-tutor-assistant'));bubble.setAttribute('aria-label',m.role==='user'?'You':'HZad French Tutor');log.append(bubble)}
  if(pending?.text)log.append(el('div',pending.text,'hz-tutor-bubble hz-tutor-user'));
  if(busy&&pending)log.append(el('div','Thinking…','hz-tutor-bubble hz-tutor-assistant'));
  if(pending&&!busy){const check=btn('Check message',()=>void run(async(signal,ticket)=>receive(await call('?request='+encodeURIComponent(pending.id),undefined,signal),signal,ticket)));actions.append(check);if(!pending.recovered)actions.append(btn('Retry same message',()=>void run(submitPending)))}
  status.textContent=notice||(busy?'Connecting…':conversation?.messages?.length>=24?'Start a new chat to continue.':'');
  log.scrollTop=log.scrollHeight;controls();
 }
 render();return {reset,toggle};
}
