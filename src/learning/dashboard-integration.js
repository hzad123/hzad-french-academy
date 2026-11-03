import {checkAcademyAccess} from '../auth/access.js';
import {SessionRequiredError,isSessionRequired} from '../auth/session.js';
import {isRateLimited,showCooldown} from '../auth/rate-limit.js';
import {mountSecureA0} from './secure-a0.js';

export function wireA0(root,client){
 const button=root.querySelector('#hz-open-a0'),area=root.querySelector('#hz-a0-learning');
 const courses=root.querySelector('#hz-courses');
 if(!button||!area)return;
 let open=false,generation=0,stopCooldown=null;
 const focus=value=>courses?.classList.toggle('hz-hidden',value);
 const reset=()=>{
   generation++;open=false;stopCooldown?.();stopCooldown=null;
   focus(false);
   area.dataset.mountToken='';area.classList.add('hz-hidden');area.replaceChildren();
   button.disabled=false;button.textContent='Start A0 lessons';
 };
 const requestLogin=()=>{reset();root.dispatchEvent(new CustomEvent('hzad-auth-required',{bubbles:true}))};
 area.addEventListener('hzad-session-expired',requestLogin);
 button.addEventListener('click',async()=>{
   if(button.disabled)return;
   if(open){reset();return}
   const ticket=++generation;let cooling=false;
   button.disabled=true;area.classList.remove('hz-hidden');area.textContent='Opening your lessons...';
   try{
     const access=await checkAcademyAccess(client);
     if(ticket!==generation)return;
     if(access.kind==='signed_out')throw new SessionRequiredError();
     if(access.kind==='error')throw access.error||Error('Access could not be checked.');
     if(access.kind!=='active')throw Error(access.kind==='unverified'?'Please verify your email.':'No active academy access is assigned to this account.');
     await mountSecureA0(area,client);
     if(ticket!==generation)return;
     open=true;button.textContent='Close A0 lessons';focus(true);
     area.scrollIntoView?.({behavior:'smooth',block:'start'});
   }catch(error){
     if(ticket!==generation)return;
     if(isRateLimited(error)){
       cooling=true;
       stopCooldown=showCooldown(area,client,error,()=>{if(ticket===generation)button.disabled=false});
       return;
     }
     if(isSessionRequired(error)){requestLogin();return}
     area.textContent='Unable to open A0 lessons: '+error.message;
   }finally{if(ticket===generation&&!cooling)button.disabled=false}
 });
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')reset()});
 root.addEventListener('hzad-clear-lessons',reset);
}
