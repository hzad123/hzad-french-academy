import {checkAcademyAccess} from '../auth/access.js';
import {mountSecureA0} from './secure-a0.js';

// Recover a missing session in the lesson panel rather than leaving a stale
// dashboard visible and telling students to sign in elsewhere.
export function wireA0(root,client){
 const button=root.querySelector('#hz-open-a0');
 const area=root.querySelector('#hz-a0-learning');
 if(!button||!area)return;
 let open=false;
 const reset=()=>{open=false;area.classList.add('hz-hidden');area.replaceChildren();button.textContent='Start A0 lessons'};
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
 async function load(){
   const access=await checkAcademyAccess(client);
   if(access.kind!=='active'){
     if(access.kind==='signed_out')return showLogin();
     throw Error(access.kind==='error'?'Entitlement lookup failed: '+(access.error?.message||'Unknown database error'):access.kind==='unverified'?'Your email is not verified.':'No active academy entitlement was found for this account.');
   }
   await mountSecureA0(area,client);
 }
 function showLogin(){
   area.replaceChildren();
   const form=node('form');
   const heading=node('h3','Sign in to continue your A0 lessons');
   const info=node('p','Your previous session ended. Sign in here to restore quiz grading and lesson access.');
   const email=node('input'),password=node('input'),submit=node('button','Sign in and reopen A0 lessons'),error=node('p');
   email.type='email';email.autocomplete='username';email.placeholder='Email';email.required=true;
   password.type='password';password.autocomplete='current-password';password.placeholder='Password';password.required=true;
   submit.type='submit';submit.className='hz-btn';error.setAttribute('role','alert');
   form.append(heading,info,email,password,submit,error);
   form.addEventListener('submit',async ev=>{
     ev.preventDefault();submit.disabled=true;error.textContent='';
     try{
       const result=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});
       if(result.error)throw result.error;
       password.value='';
       await load();
     }catch(e){error.textContent=e.message||'Sign in failed.'}
     finally{submit.disabled=false}
   });
   area.append(form);
 }
 button.addEventListener('click',async()=>{
   if(button.disabled)return;
   if(open){reset();return}
   button.disabled=true;
   area.classList.remove('hz-hidden');
   try{
     await load();
     open=true;button.textContent='Close A0 lessons';
   }catch(e){area.textContent='Unable to open A0 lessons: '+e.message}
   finally{button.disabled=false}
 });
 client.auth.onAuthStateChange(event=>{
   if(event==='SIGNED_OUT'){
     if(open){open=false;button.textContent='Start A0 lessons';showLogin()}
   }
 });
}
