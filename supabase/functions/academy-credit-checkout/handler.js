const origins=new Set(['https://www.teftcf.hzadeducation.org','https://teftcf.hzadeducation.org','https://hzad123.github.io']);
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const marker='hzad-french-academy-credits-v1';
export const PACKAGES=[1000,2000,3000];
const enc=new TextEncoder();
export async function verifyStripeSignature(body,header,secret,now=Date.now()){
 if(!secret?.startsWith('whsec_')||typeof header!=='string')return false;
 const parts=header.split(',').map(p=>p.trim().split('='));
 const ts=parts.filter(([k])=>k==='t');if(ts.length!==1||!/^\d+$/.test(ts[0][1]))return false;
 const timestamp=Number(ts[0][1]);if(!Number.isSafeInteger(timestamp)||Math.abs(now/1000-timestamp)>300)return false;
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const [k,v] of parts){if(k!=='v1'||!/^[0-9a-f]{64}$/i.test(v))continue;const bytes=new Uint8Array(v.match(/../g).map(h=>parseInt(h,16)));if(await crypto.subtle.verify('HMAC',key,bytes,enc.encode(timestamp+'.'+body)))return true}
 return false;
}
const liveKey=key=>/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key||'');
const stripeId=(s,prefix)=>typeof s==='string'&&s.startsWith(prefix)&&/^[A-Za-z0-9_]+$/.test(s)&&s.length<200;
export function validatePaidSession(s,expectedSession){
 const pi=s?.payment_intent;
 if(!s||s.id!==expectedSession||!stripeId(s.id,'cs_live_')||s.livemode!==true||s.mode!=='payment'||s.status!=='complete'||s.payment_status!=='paid'||s.currency!=='cad'||!PACKAGES.includes(s.amount_total)||s.amount_subtotal!==s.amount_total||s.metadata?.product!==marker||!uuid(s.metadata?.order_id)||s.client_reference_id!==s.metadata.order_id||!pi||pi.livemode!==true||!stripeId(pi.id,'pi_')||pi.status!=='succeeded'||pi.currency!=='cad'||pi.amount_received!==s.amount_total||pi.metadata?.product!==marker||pi.metadata?.order_id!==s.metadata.order_id||!pi.latest_charge||pi.latest_charge.paid!==true||pi.latest_charge.refunded!==false||pi.latest_charge.amount_refunded!==0||pi.latest_charge.disputed!==false)throw Error('Checkout verification failed');
 return {p_id:s.metadata.order_id,p_session:s.id,p_intent:pi.id,p_cents:s.amount_total};
}
export function createCreditCheckout({authenticate,userRpc,adminRpc,key,webhookSecret,liveEnabled=false,fetcher=fetch,clock=Date.now}){
 const ready=()=>liveEnabled&&liveKey(key)&&webhookSecret?.startsWith('whsec_');
 async function stripe(path,{params,idempotency}={}){
  const headers={Authorization:'Bearer '+key};if(params)headers['Content-Type']='application/x-www-form-urlencoded';if(idempotency)headers['Idempotency-Key']=idempotency;
  const r=await fetcher('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers,body:params?.toString(),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Stripe request failed');return r.json();
 }
 return async req=>{
  const origin=req.headers.get('origin'),webhook=new URL(req.url).pathname.endsWith('/webhook');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
  if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(webhook){
   if(req.method!=='POST'||!ready())return response({error:'Webhook unavailable'},503);
   let body;try{body=await req.text();if(body.length>1000000||!await verifyStripeSignature(body,req.headers.get('stripe-signature'),webhookSecret,clock()))return response({error:'Invalid signature'},400)}catch{return response({error:'Invalid signature'},400)}
   try{
    const e=JSON.parse(body);if(e.livemode!==true)return response({received:true});
    const obj=e.data?.object;
    if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(e.type)){
     if(obj?.metadata?.product!==marker)return response({received:true});
     if(!stripeId(obj.id,'cs_live_'))throw Error('Invalid session');
     const s=await stripe('checkout/sessions/'+encodeURIComponent(obj.id)+'?expand%5B%5D=payment_intent.latest_charge');
     if(s.payment_status!=='paid')return response({received:true});
     await adminRpc('academy_stripe_fulfill',validatePaidSession(s,obj.id));
    }else if(['charge.refunded','charge.dispute.created'].includes(e.type)){
     let paymentIntent=obj?.payment_intent;
     if(!paymentIntent&&stripeId(obj?.charge,'ch_'))paymentIntent=(await stripe('charges/'+encodeURIComponent(obj.charge))).payment_intent;
     if(!stripeId(paymentIntent,'pi_'))return response({received:true});
     const pi=await stripe('payment_intents/'+encodeURIComponent(paymentIntent));
     if(pi.livemode===true&&pi.metadata?.product===marker&&uuid(pi.metadata?.order_id))await adminRpc('academy_stripe_review',{p_id:pi.metadata.order_id,p_intent:pi.id,p_reason:e.type==='charge.refunded'?'refund':'dispute'});
    }
    return response({received:true});
   }catch{console.warn('academy-credit-checkout webhook requires retry or reconciliation');return response({error:'Unable to reconcile payment'},503)}
  }
  if(origin&&!origins.has(origin))return response({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return response({error:'Method not allowed'},405);
  const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];let user;
  try{if(token)user=await authenticate(token)}catch{}
  if(!user?.id||!user.email_confirmed_at)return response({error:'Sign in with a verified academy account'},401);
  try{
   const wallet=await userRpc(token,'academy_credit_wallet',{});
   if(req.method==='GET')return response({ready:!!(ready()&&wallet.topupsEnabled),packages:PACKAGES.map(cents=>({cents,credits:cents/10}))});
   if(!ready()||!wallet.topupsEnabled)return response({error:'Credit purchases are not available yet'},503);
   const raw=await req.text();if(raw.length>1024)return response({error:'Invalid checkout request'},400);
   let input;try{input=JSON.parse(raw)}catch{return response({error:'Invalid checkout request'},400)}
   if(!input||Array.isArray(input)||Object.keys(input).some(k=>!['id','cents'].includes(k))||!uuid(input.id)||!PACKAGES.includes(input.cents))return response({error:'Select a valid credit package'},400);
   const order=await adminRpc('academy_stripe_prepare',{p_user:user.id,p_id:input.id,p_cents:input.cents});
   if(order.id!==input.id||order.cents!==input.cents)throw Error('Order mismatch');
   const returnUrl='https://www.teftcf.hzadeducation.org/hzadfrenchacademy';
   const params=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'cad','line_items[0][price_data][unit_amount]':String(order.cents),'line_items[0][price_data][product_data][name]':String(order.cents/10)+' HZad French Academy AI credits',success_url:returnUrl+'?credits=return',cancel_url:returnUrl+'?credits=cancel',client_reference_id:order.id,'metadata[product]':marker,'metadata[order_id]':order.id,'payment_intent_data[metadata][product]':marker,'payment_intent_data[metadata][order_id]':order.id});
   if(user.email)params.set('customer_email',user.email);
   const session=await stripe('checkout/sessions',{params,idempotency:'hzad-credit-'+order.id});
   const url=new URL(session.url);if(session.livemode!==true||!stripeId(session.id,'cs_live_')||url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Invalid checkout URL');
   return response({url:url.href});
  }catch{console.warn('academy-credit-checkout could not create checkout');return response({error:'Checkout could not start. Try again or contact the academy.'},503)}
 };
}
