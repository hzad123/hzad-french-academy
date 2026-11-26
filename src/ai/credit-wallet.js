import {requireSession} from '../auth/session.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';
import {setCreditScale,creditScale,formatCredits,creditLabel} from './credit-scale.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b};
const activities=[['tutor','French Tutor · message'],['writing','Writing trainer · review'],['pronunciation','Pronunciation · review'],['conversation','Conversation · turn'],['tef-writing','TEF writing · review'],['tef-speaking-turn','TEF speaking · response'],['tef-speaking-feedback','TEF speaking · evaluation'],['tcf-writing','TCF writing · review'],['tcf-speaking-turn','TCF speaking · response'],['tcf-speaking-feedback','TCF speaking · evaluation']];
export function wireCreditWallet(root,client,{fetcher=globalThis.fetch.bind(globalThis)}={}){
 const dashboard=root.querySelector('#hz-dashboard');if(!dashboard)return {prepare:async()=>{}};
 let viewer=null,epoch=0,timer=null,pending=null,snap=null,open=false,busy=false,checkoutId=null,checkoutReady=false,status='';
 const dock=el('div',undefined,'hz-credit-dock hz-hidden'),launcher=button('AI credits · Loading…',()=>toggle(!open));launcher.className='hz-credit-launch';launcher.setAttribute('aria-expanded','false');
 const panel=el('section',undefined,'hz-credit-panel hz-hidden');panel.setAttribute('aria-label','Your AI credit wallet');dock.append(panel,launcher);dashboard.append(dock);
 function render(){
  launcher.textContent='AI credits · '+(snap?formatCredits(snap.available):'Unavailable');
  panel.replaceChildren();const head=el('div',undefined,'hz-credit-heading');head.append(el('strong','Your AI credits'),button('×',()=>toggle(false)));panel.append(head);
  if(snap){panel.append(el('strong',formatCredits(snap.available),'hz-credit-total'),el('span','Available credits','hz-credit-muted'));if(snap.reserved>0)panel.append(el('p',creditLabel(snap.reserved)+' reserved for work in progress.'));if(snap.paymentHold)panel.append(el('p','Payment review required. Contact the academy.'));if(!snap.budgetAvailable)panel.append(el('p',snap.available>0?'Budget reconciliation required. Contact the academy.':'AI budget exhausted. Top up to continue.'));if(snap.lastCharge)panel.append(el('p','Last completed AI activity: '+creditLabel(snap.lastCharge.credits)));if(snap.expiresAt)panel.append(el('p','Wallet expires '+new Date(snap.expiresAt).toLocaleDateString()+'.','hz-credit-muted'))}
  const refresh=button('Refresh balance',()=>void update());refresh.disabled=!!pending;panel.append(refresh);
  const details=el('details');details.append(el('summary','AI activity prices'));const list=el('dl',undefined,'hz-credit-prices');for(const [key,name] of activities){const price=snap?.activities?.[key];list.append(el('dt',name),el('dd',price?.enabled?creditLabel(price.credits):'Unavailable'))}list.append(el('dt','Reading, listening, lessons'),el('dd','Free'));details.append(list);if(snap?.scale===100)details.append(el('p','Maximum quotes shown. Successful actions settle based on recorded usage; unused credits are released.','hz-credit-muted'));panel.append(details);
  panel.append(el('h4','Top up your balance'));
  if(snap?.scale===100){for(const cents of [1000,2000,3000]){const b=button('CAD $'+cents/100+' · '+cents/10+' credits',()=>void purchase(cents));b.className='hz-credit-package';b.disabled=busy||!checkoutReady||!!snap.paymentHold;panel.append(b)}}
  else panel.append(el('p','New credit packages are being prepared.','hz-credit-muted'));
  if(!checkoutReady)panel.append(el('p','Secure online top-ups are not enabled yet.','hz-credit-muted'));
  else panel.append(el('p','One-time payment through Stripe Checkout. Credits are added after payment verification.','hz-credit-muted'));
  if(status){const p=el('p',status);p.setAttribute('role','status');panel.append(p)}
 }
 async function request(method='GET',body){
  const session=await requireSession(client);const r=await fetcher(SUPABASE_URL+'/functions/v1/academy-credit-checkout',{method,headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Secure checkout unavailable');return data
 }
 async function update(){
  if(!viewer)return;if(pending)return pending;const current=epoch,uid=viewer;
  pending=(async()=>{try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);let reply;try{const request=client.rpc('academy_credit_wallet');reply=await (typeof request.abortSignal==='function'?request.abortSignal(controller.signal):request)}finally{clearTimeout(timeout)}const {data,error}=reply;if(current!==epoch||viewer!==uid)return;if(error||!data||![1,100].includes(data.scale))throw Error('Balance unavailable');if(snap&&data.scale!==snap.scale){status='Credit pricing updated. Reload this page before continuing.';snap=data;setCreditScale(data.scale);render();globalThis.location?.reload?.();return}setCreditScale(data.scale);snap=data;if(open){try{const config=await request();if(current!==epoch)return;checkoutReady=!!config.ready}catch{checkoutReady=false}}if(current===epoch)render()}catch{if(current===epoch){snap=null;checkoutReady=false;status='Could not refresh your balance. Please retry.';render()}}finally{if(current===epoch)pending=null}})();return pending
 }
 function toggle(next){open=next;panel.classList.toggle('hz-hidden',!open);launcher.setAttribute('aria-expanded',String(open));if(open)void update();render()}
 async function purchase(cents){
  if(busy||!checkoutReady||snap?.scale!==100)return;busy=true;status='Opening secure checkout…';render();const current=epoch;
  try{if(!checkoutId||checkoutId.cents!==cents)checkoutId={id:crypto.randomUUID(),cents};const result=await request('POST',checkoutId);if(current!==epoch)return;const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Checkout could not open');globalThis.location.assign(url.href)}
  catch(e){if(current===epoch)status=e.message||'Checkout unavailable'}finally{if(current===epoch){busy=false;render()}}
 }
 function reset(){epoch++;viewer=null;clearInterval(timer);timer=null;pending=null;snap=null;open=false;busy=false;checkoutId=null;checkoutReady=false;status='';dock.classList.add('hz-hidden');panel.classList.add('hz-hidden');launcher.setAttribute('aria-expanded','false');setCreditScale(1);render()}
 async function prepare(userId){if(viewer!==userId){reset();viewer=userId}await update()}
 root.addEventListener('hzad-access-active',event=>{const id=event.detail?.userId;if(!id)return;if(viewer!==id){reset();viewer=id}dock.classList.remove('hz-hidden');if(!timer)timer=setInterval(()=>{if(!document.hidden)void update()},10000);void update();if(new URLSearchParams(globalThis.location?.search||'').get('credits')==='return'){status='We’re checking your payment. Your balance increases only after Stripe confirms payment.';toggle(true)}});
 root.addEventListener('hzad-open-credit-wallet',()=>{if(viewer)toggle(true)});root.addEventListener('hzad-clear-lessons',reset);client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset()});
 globalThis.addEventListener?.('hzad-credit-changed',()=>void update());globalThis.addEventListener?.('focus',()=>void update());document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)void update()});
 render();return {prepare,reset}
}
