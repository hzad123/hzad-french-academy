import {checkAcademyAccess} from '../auth/access.js';
import {SessionRequiredError,isSessionRequired} from '../auth/session.js';
import {isRateLimited,showCooldown} from '../auth/rate-limit.js';
import {mountSecureA0} from './secure-a0.js';

// One shared, access-controlled lesson workspace for A0 through C2.
// Level cards are direct navigation controls; no single level receives
// privileged or unrestricted access.
const LEVELS=new Set(['A0','A1','A2','B1','B2','C1','C2']);
export function wireA0(root,client){
 const area=root.querySelector('#hz-a0-learning');
 const courses=root.querySelector('#hz-courses');
 const chooser=root.querySelector('#hz-course-chooser');
 const controls=root.querySelector('#hz-level-controls');
 const back=root.querySelector('#hz-back-to-levels');
 const currentLevel=root.querySelector('#hz-current-level');
 if(!area||!courses||!chooser||!controls||!back)return;
 let open=false,loading=false,generation=0,stopCooldown=null,activeLevel=null;
 const setLoading=value=>{
   loading=value;
   courses.querySelectorAll('[data-course-level]').forEach(button=>{button.disabled=value});
 };
 const focus=value=>{
   chooser.classList.toggle('hz-hidden',value);
   controls.classList.toggle('hz-hidden',!value);
 };
 const reset=()=>{
   generation++;open=false;stopCooldown?.();stopCooldown=null;activeLevel=null;
   setLoading(false);
   focus(false);
   if(currentLevel)currentLevel.textContent='';
   area.dataset.mountToken='';area.classList.add('hz-hidden');area.replaceChildren();
 };
 const requestLogin=()=>{reset();root.dispatchEvent(new CustomEvent('hzad-auth-required',{bubbles:true}))};
 area.addEventListener('hzad-session-expired',requestLogin);
 async function openLevel(level,target={}){
   if(!LEVELS.has(level)||loading)return;
   root.dispatchEvent(new CustomEvent('hzad-close-placement'));
   root.dispatchEvent(new CustomEvent('hzad-close-tracker'));
   if(open&&activeLevel===level&&!target.unitId){reset();return}
   if(open)reset();
   const ticket=++generation;let cooling=false;
   setLoading(true);area.classList.remove('hz-hidden');area.textContent='Opening '+level+' lessons...';
   try{
     const access=await checkAcademyAccess(client);
     if(ticket!==generation)return;
     if(access.kind==='signed_out')throw new SessionRequiredError();
     if(access.kind==='error')throw access.error||Error('Access could not be checked.');
     if(access.kind!=='active')throw Error(access.kind==='unverified'?'Please verify your email.':'No active academy access is assigned to this account.');
     await mountSecureA0(area,client,level);
     if(ticket!==generation)return;
     if(target.unitId)area.dispatchEvent(new CustomEvent('hzad-select-unit',{detail:target}));
     open=true;activeLevel=level;
     if(currentLevel)currentLevel.textContent=level+' lessons';
     focus(true);
     controls.scrollIntoView?.({behavior:'smooth',block:'start'});
   }catch(error){
     if(ticket!==generation)return;
     if(isRateLimited(error)){
       cooling=true;
       stopCooldown=showCooldown(area,client,error,()=>{if(ticket===generation)setLoading(false)});
       return;
     }
     if(isSessionRequired(error)){requestLogin();return}
     area.textContent='Unable to open '+level+' lessons: '+error.message;
   }finally{if(ticket===generation&&!cooling)setLoading(false)}
 }
 back.addEventListener('click',()=>{
   reset();
   chooser.scrollIntoView?.({behavior:'smooth',block:'start'});
 });
 root.addEventListener('hzad-open-level',event=>{void openLevel(event.detail?.level,event.detail)});
 courses.addEventListener('click',event=>{
   const target=event.target?.closest?.('[data-course-level]');
   if(!target||!courses.contains(target))return;
   void openLevel(target.dataset.courseLevel);
 });
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')reset()});
 root.addEventListener('hzad-clear-lessons',reset);
}
