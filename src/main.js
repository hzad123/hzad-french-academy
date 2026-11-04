import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,REDIRECT_URL} from './config.js';
import {checkAcademyAccess} from './auth/access.js';
import {getAcademyClient,SESSION_BUILD} from './auth/client.js';
import {requireSession} from './auth/session.js';
import {renderCourseCards} from './dashboard/courses.js';
import {template} from './ui/template.js';
import {wireA0} from './learning/dashboard-integration.js';
import {wirePlacement} from './placement/ui.js';
import {wireTracker} from './tracker/ui.js';

export function mountAcademy(host,createClient){
  if(host.dataset.initialized)return;
  host.dataset.initialized='1';
  host.innerHTML=template();
  const root=host.querySelector('#hzad-french-academy');
  const $=id=>root.querySelector('#'+id);
  const client=getAcademyClient(createClient,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  let tab='login',busy=false,recovering=false,accessSequence=0;
  const show=which=>['hz-auth','hz-pending','hz-dashboard','hz-recovery'].forEach(id=>$(id).classList.toggle('hz-hidden',id!==which));
  const clearMsg=id=>{$(id).textContent='';$(id).classList.add('hz-hidden')};
  const msg=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.classList.remove('hz-hidden');el.classList.toggle('hz-error',error)};
  const setBusy=value=>{busy=value;$('hz-submit').disabled=value;$('hz-refresh').disabled=value;$('hz-recovery-submit').disabled=value};
  const clearLessons=()=>root.dispatchEvent(new CustomEvent('hzad-clear-lessons'));
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
  function requireLogin(message='Please sign in to continue.'){
    accessSequence++;recovering=false;clearLessons();
    $('hz-user-label').textContent='';setTab('login');show('hz-auth');
    msg('hz-auth-message',message);
  }
  async function accessCheck(){
    if(recovering)return;
    const sequence=++accessSequence;
    const result=await checkAcademyAccess(client);
    if(sequence!==accessSequence||recovering)return;
    $('hz-user-label').textContent=result.user?.email||'';
    if(result.kind==='signed_out'){clearLessons();show('hz-auth');return}
    if(result.kind==='active'){clearMsg('hz-pending-message');show('hz-dashboard');return}
    clearLessons();show('hz-pending');clearMsg('hz-pending-message');
    if(result.kind==='unverified')$('hz-pending-text').textContent='Please verify your email using the link in your inbox.';
    else if(result.kind==='error'){
      $('hz-pending-text').textContent='Access could not be checked. Your session has not been reset.';
      msg('hz-pending-message',result.error?.message||'Please check your connection and retry.',true);
    }else $('hz-pending-text').textContent='No active academy entitlement is linked to this account yet.';
  }
  async function submit(ev){
    ev.preventDefault();if(busy)return;setBusy(true);clearMsg('hz-auth-message');
    const email=$('hz-email').value.trim(),password=$('hz-password').value;
    try{
      if(tab==='signup'){
        const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT_URL,data:{display_name:$('hz-name').value.trim()}}});
        if(error)throw error;
        if(data.session)await accessCheck();
        else msg('hz-auth-message','Check your inbox to verify your email. Then return here and sign in.');
      }else if(tab==='reset'){
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:REDIRECT_URL});
        if(error)throw error;
        msg('hz-auth-message','If this address belongs to an account, a password-reset link has been sent.');
      }else{
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        if(!data?.session?.access_token)throw Error('Sign-in did not return a session. Please retry.');
        await requireSession(client);
        $('hz-password').value='';
        await accessCheck();
      }
    }catch(e){msg('hz-auth-message',e.message||'Sign-in could not complete. Please retry.',true)}
    finally{setBusy(false)}
  }
  async function updatePassword(ev){
    ev.preventDefault();if(busy)return;
    const password=$('hz-new-password').value;
    if(password!==$('hz-confirm-password').value){msg('hz-recovery-message','Passwords do not match.',true);return}
    setBusy(true);clearMsg('hz-recovery-message');
    try{
      const {error}=await client.auth.updateUser({password});if(error)throw error;
      $('hz-new-password').value='';$('hz-confirm-password').value='';
      const {error:signOutError}=await client.auth.signOut({scope:'local'});if(signOutError)throw signOutError;
      requireLogin('Password updated. Please sign in with your new password.');
    }catch(e){msg('hz-recovery-message',e.message||'Could not update password.',true)}
    finally{setBusy(false)}
  }
  async function logout(){
    const {error}=await client.auth.signOut({scope:'local'});
    if(error){msg('hz-pending-message',error.message,true);return}
    $('hz-password').value='';requireLogin('You have signed out.');
  }
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(!busy)setTab(b.dataset.tab)}));
  root.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',logout));
  $('hz-auth-form').addEventListener('submit',submit);
  $('hz-recovery-form').addEventListener('submit',updatePassword);
  $('hz-refresh').addEventListener('click',async()=>{setBusy(true);try{await accessCheck()}finally{setBusy(false)}});
  root.addEventListener('hzad-auth-required',()=>requireLogin());
  renderCourseCards($('hz-courses'));
  wireA0(root,client);
  wirePlacement(root,client);
  wireTracker(root,client);
  const footer=root.querySelector('.hz-foot');
  if(footer){const version=document.createElement('small');version.textContent=' | '+SESSION_BUILD;footer.append(version)}
  client.auth.onAuthStateChange(event=>{
    if(event==='PASSWORD_RECOVERY'){accessSequence++;recovering=true;clearLessons();show('hz-recovery')}
    else if(event==='SIGNED_OUT'){requireLogin()}
    else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){
      setTimeout(()=>accessCheck().catch(e=>msg('hz-auth-message',e.message||'Access check failed.',true)),0);
    }
  });
  accessCheck().catch(e=>msg('hz-auth-message',e.message||'Could not initialize session.',true));
}
