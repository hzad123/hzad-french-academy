import {checkAcademyAccess} from '../auth/access.js';
import {mountSecureA0} from './secure-a0.js';

export function wireA0(root,client){
 const button=root.querySelector('#hz-open-a0');
 const area=root.querySelector('#hz-a0-learning');
 if(!button||!area)return;
 let open=false;
 const reset=()=>{open=false;area.classList.add('hz-hidden');area.replaceChildren();button.textContent='Start A0 lessons'};
 button.addEventListener('click',async()=>{
   if(button.disabled)return;
   if(open){reset();return}
   button.disabled=true;
   try{
     const access=await checkAcademyAccess(client);
     if(access.kind!=='active')throw Error('Your active academy access could not be verified. Please sign in again.');
     area.classList.remove('hz-hidden');
     await mountSecureA0(area,client);
     open=true;button.textContent='Close A0 lessons';
   }catch(e){area.textContent='Unable to open A0 lessons: '+e.message;area.classList.remove('hz-hidden')}
   finally{button.disabled=false}
 });
 client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')reset()});
}
