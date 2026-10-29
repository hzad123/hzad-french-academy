import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,REDIRECT_URL} from './config.js';
import {checkAcademyAccess} from './auth/access.js';
import {renderCourseCards} from './dashboard/courses.js';
import {template} from './ui/template.js';
import {wireA0} from './learning/dashboard-integration.js';

export function mountAcademy(host,createClient){
  if(host.dataset.initialized)return;
  host.dataset.initialized='1';
  host.innerHTML=template();
  const root=host.querySelector('#hzad-french-academy');
  const $=id=>root.querySelector('#'+id);
  const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let tab='login',busy=false,recovering=false;
  const show=which=>['hz-auth','hz-pending','hz-dashboard','hz-recovery'].forEach(id=>$(id).classList.toggle('hz-hidden',id!==which));
  const clearMsg=id=>{$(id).textContent='';$(id).classList.add('hz-hidden')};
  const msg=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.classList.remove('hz-hidden');el.classList.toggle('hz-error',error)};
  const setBusy=value=>{busy=value;$('hz-submit').disabled=value;$('hz-refresh').disabled=value;$('hz-recovery-submit').disabled=value};
  function setTab(next){
    tab=next;
    root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===next)));
    $('hz-name-wrap').classList.toggle('hz-hidden',next!=='signup');
    $('hz-password').classList.toggle('hz-hidden',next==='reset');
    $('hz-password-label').classList.toggle('hz-hidden',next==='reset');
    $('hz-password').required=next!=='reset';
    $('hz-password').autocomplete=next==='signup'?'new-password':'current-password';
    $('hz-password-hint').classList.toggle('hz-hidden',next!=='signup');
    $('hz-submit').textContent=next==='signup'?'Create account':next==='reset'?'Send reset link':'Sign in';
    clearMsg('hz-auth-message');
  }
  async function accessCheck(){
    if(recovering)return;
    const result=await checkAcademyAccess(client);
    $('hz-user-label').textContent=result.user?.email||'';
    if(result.kind==='signed_out'){show('hz-auth');return}
    if(result.kind==='active'){clearMsg('hz-pending-message');show('hz-dashboard');return}
    show('hz-pending');clearMsg('hz-pending-message');
    if(result.kind==='unverified')$('hz-pending-text').textContent='Please verify your email address using the link Supabase sent you, then sign in again.';
    else if(result.kind==='error'){$('hz-pending-text').textContent='We could not verify your access right now. Please try again shortly.';msg('hz-pending-message','Access verification failed: '+result.error.message,true)}
    else $('hz-pending-text').textContent='Your email is verified, but no active academy entitlement is linked to your account yet.';
  }
  async function submit(ev){
    ev.preventDefault();if(busy)return;setBusy(true);clearMsg('hz-auth-message');
    const email=$('hz-email').value.trim(),password=$('hz-password').value;
    try{
      if(tab==='signup'){
        const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT_URL,data:{display_name:$('hz-name').value.trim()}}});
        if(error)throw error;
        if(data.session)await accessCheck();
        else msg('hz-auth-message','Check your inbox for the verification email. After confirming, return here and sign in.');
      }else if(tab==='reset'){
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:REDIRECT_URL});
        if(error)throw error;
        msg('hz-auth-message','If this email belongs to an account, a password-reset link has been sent.');
      }else{
        const {error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        await accessCheck();
      }
    }catch(e){msg('hz-auth-message',e.message||'Something went wrong. Please try again.',true)}
    finally{setBusy(false)}
  }
  async function updatePassword(ev){
    ev.preventDefault();if(busy)return;
    const pass=$('hz-new-password').value;
    if(pass!==$('hz-confirm-password').value){msg('hz-recovery-message','Passwords do not match.',true);return}
    setBusy(true);clearMsg('hz-recovery-message');
    try{
      const {error}=await client.auth.updateUser({password:pass});if(error)throw error;
      recovering=false;$('hz-new-password').value='';$('hz-confirm-password').value='';
      await client.auth.signOut();setTab('login');show('hz-auth');
      msg('hz-auth-message','Password updated. Please sign in with your new password.');
    }catch(e){msg('hz-recovery-message',e.message||'Could not update password.',true)}
    finally{setBusy(false)}
  }
  async function logout(){recovering=false;await client.auth.signOut();$('hz-password').value='';setTab('login');show('hz-auth')}
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  root.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',logout));
  $('hz-auth-form').addEventListener('submit',submit);
  $('hz-recovery-form').addEventListener('submit',updatePassword);
  $('hz-refresh').addEventListener('click',async()=>{setBusy(true);try{await accessCheck()}finally{setBusy(false)}});
  renderCourseCards($('hz-courses'));
  wireA0(root,client);
  client.auth.onAuthStateChange(event=>{
    if(event==='PASSWORD_RECOVERY'){recovering=true;show('hz-recovery')}
    else if(event==='SIGNED_OUT'){recovering=false;show('hz-auth')}
    else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){setTimeout(()=>accessCheck().catch(console.error),0)}
  });
  accessCheck().catch(e=>msg('hz-auth-message',e.message||'Could not initialize session.',true));
}
