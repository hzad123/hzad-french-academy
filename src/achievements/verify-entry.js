import {mountVerification} from './verification.js';
const back=document.querySelector('a.hz-global-back');
back?.addEventListener('click',event=>{
 if(document.referrer&&history.length>1){try{const from=new URL(document.referrer);if(from.origin===location.origin||from.origin==='https://www.teftcf.hzadeducation.org'){event.preventDefault();history.back()}}catch{}}
});
const panel=document.querySelector('#certificate-verification');
if(panel){mountVerification(panel);panel.querySelector('details').open=true;}
