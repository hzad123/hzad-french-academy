import {verifyCertificate} from './store.js';
export function mountVerification(container){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
 const details=el('details'),summary=el('summary','Verify an HZad certificate');details.append(summary);
 const form=el('form'),idLabel=el('label','Certificate ID'),id=el('input'),nameLabel=el('label','Name printed on the certificate'),name=el('input');
 id.required=true;id.maxLength=36;id.setAttribute('aria-label','Certificate ID');idLabel.append(id);
 name.required=true;name.maxLength=80;name.setAttribute('aria-label','Certificate holder name');nameLabel.append(name);
 const submit=el('button','Verify certificate');submit.type='submit';submit.className='hz-btn';const status=el('p');status.setAttribute('role','status');
 form.append(idLabel,nameLabel,submit,status);details.append(form);container.append(details);let active=true;
 try{const requested=new URLSearchParams(globalThis.location?.search).get('verifyCertificate');if(requested){id.value=requested;details.open=true}}catch{}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;submit.disabled=true;status.textContent='Checking certificate…';
  try{
   const r=await verifyCertificate(id.value.trim(),name.value);if(!active)return;
   status.textContent=r.valid?`✓ Valid HZad ${r.level} course-completion certificate, issued ${new Date(r.issuedAt).toLocaleDateString()}. Score: ${r.score}%. Required lessons: ${r.lessonCount}. Assessment version: ${r.version}. ${r.scope}..`:'No valid certificate matches this ID and printed name. Check the details or contact the academy.';
  }catch(e){if(active)status.textContent=e.message}finally{if(active)submit.disabled=false}
 });return ()=>{active=false};
}
