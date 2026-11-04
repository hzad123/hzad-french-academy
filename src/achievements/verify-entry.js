import {mountVerification} from './verification.js';
const panel=document.querySelector('#certificate-verification');
if(panel){mountVerification(panel);panel.querySelector('details').open=true;}
