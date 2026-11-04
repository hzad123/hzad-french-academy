import {checkAcademyAccess} from '../auth/access.js';
import {SessionRequiredError,isSessionRequired} from '../auth/session.js';
import {isRateLimited,showCooldown} from '../auth/rate-limit.js';
import {mountSecureA0} from './secure-a0.js';

// One shared, access-controlled lesson workspace for A0 through C2.
// It reuses the successful A0 authentication and quiz flow.
const LEVELS=new Set(['A0','A1','A2','B1','B2','C1','C2']);
export function wireA0(root,client){
 const button=root.querySelector('#hz-open-a0'),area=root.querySelector('#hz-a0-learning');
 const courses=root.querySelector('#hz-courses');
 if(!button||!area)return;
 let open=false,generation=0,stopCooldown=null,activeLevel=null;
 const focus=value=>courses?.classList.toggle('hz-hidden',value);
 const reset=()=>{
   generation++;open=false;stopCooldown?.();stopCooldown=null;activeLevel=null;
   focus(false);
   area.dataset.mountToken='';area.classList.add('hz-hidden');area.replaceChildren();
   button.disabled=false;button.textContent='Start A0 lessons';
 };
 const requestLogin=()=>{reset();root.dispatchEvent(new CustomEvent('hzad-auth-required',{bubbles:true}))};
 area.addEventListener('hzad-session-expired',requestLogin);
 async function openLevel(level){
   if(!LEVELS.has(level)||button.disabled)return;
   if(open&&activeLevel===level){reset();return}
   if(open)reset();
   const ticket=++generation;let cooling=false;
   button.disabled=true;area.classList.remove('hz-hidden');area.textContent='Opening '+level+' lessons...';
   try{
     const access=await checkAcademyAccess(client);
     if(ticket!==generation)return;
     if(access.kind==='signed_out')throw new SessionRequiredError();
     if(access.kind==='error')throw access.error||Error('Access could not be checked.');
     if(access.kind!=='active')throw Error(access.kind==='unverified'?'Please verify your email.':'No active academy access is assigned to this account.');
     await mountSecureA0(area,client,level);
     if(ticket!==generation)return;
     open=true;activeLevel=level;button.textContent='Close '+level+' lessons';focus(true);
     area.scrollIntoView?.({behavior:'smooth',block:'start'});
   }catch(error){
     if(ticket!==generation)return;
     if(isRateLimited(error)){
       cooling=true;
       stopCooldown=showCooldown(area,client,error,()=>{if(ticket===generation)button.disabled=false});
       return;
     }
     if(isSessionRequired(error)){requestLogin();return}
     area.textContent='Unable to open '+level+' lessons: '+error.message;
   }finally{if(ticket===generation&&!cooling)button.disabled=false}
 }
 button.addEventListener('click',()=>{if(open)reset();else void openLevel('A0')});
 courses?.addEventListener('click',event=>{
   const target=event.target?.closest?.('[data-course-level]');
   if(!target||!courses.contains(target))return;
   void openLevel(target.dataset.courseLevel);
 });
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')reset()});
 root.addEventListener('hzad-clear-lessons',reset);
}
