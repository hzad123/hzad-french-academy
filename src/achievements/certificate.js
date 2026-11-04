export function renderCertificate(popup,certificate){
 if(!popup||popup.closed)throw Error('Allow the certificate window to open, then try again.');
 if(certificate.revoked){popup.close();throw Error('This certificate has been revoked. Please contact the academy.');}
 const doc=popup.document;doc.title=`HZad ${certificate.level} Course Completion Certificate`;doc.documentElement.lang='en';
 const meta=doc.createElement('meta');meta.setAttribute('charset','utf-8');doc.head.append(meta);
 const style=doc.createElement('style');style.textContent=`
 @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Georgia,serif;color:#15345d;margin:20px;background:#f3f6fc}
 .certificate{max-width:1100px;margin:auto;padding:48px;border:5px double #c59325;background:white;text-align:center;min-height:650px}
 .issuer{letter-spacing:3px;font-family:Arial,sans-serif;font-size:18px}h1{font-size:34px;margin-top:32px}h2{font-size:38px;margin:24px}h3{font-size:27px;color:#a05a12}
 .scope{font-size:17px;line-height:1.6}.detail{font-family:Arial,sans-serif;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
 .notice{border-top:1px solid #c59325;padding-top:20px;font-size:13px;line-height:1.6}.actions{text-align:center;padding:18px}button{padding:14px 22px;background:#174d83;color:white;border:0;border-radius:8px;font-size:16px;cursor:pointer}
 @media print{body{background:white;margin:0}.certificate{padding:20px;min-height:0;height:180mm;max-width:none;display:flex;flex-direction:column;justify-content:center}.actions{display:none}
 h1{font-size:28px;margin:18px 0}h2{font-size:30px;margin:14px 0}h3{font-size:22px;margin:12px 0}p{margin:10px 0}
 .issuer{font-size:14px;margin:8px 0}.scope{font-size:14px;margin:10px 0;line-height:1.35}.detail{font-size:10px;margin:7px 0;line-height:1.3}.notice{font-size:10px;margin-top:12px;padding-top:12px;line-height:1.3}}

 .certificate{position:relative;overflow:hidden;border:1px solid #d1dbee;border-radius:18px;box-shadow:0 22px 70px #15345d20;background:radial-gradient(ellipse at top right,#fff3d2,transparent 55%),white}
 .certificate:before{content:'';position:absolute;inset:0 0 auto;height:12px;background:linear-gradient(90deg,#123267,#286bc3 65%,#e8b53e)}
 .certificate:after{content:'HZAD';position:absolute;bottom:20px;right:22px;width:72px;height:72px;border:3px double #c59325;border-radius:50%;display:grid;place-items:center;font:700 13px Arial;letter-spacing:2px;color:#a7771f;opacity:.55}
 .popup-back{position:fixed;top:16px;left:16px;z-index:2;background:#123267}
 @media screen{.certificate{padding-bottom:112px}}
 @media print{.certificate{box-shadow:none;border-radius:0}.popup-back{display:none}}
 `;doc.head.append(style);doc.body.replaceChildren();
 const add=(parent,tag,text,cls)=>{const n=doc.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.append(n);return n};
 const sheet=doc.createElement('main');sheet.className='certificate';doc.body.append(sheet);
 add(sheet,'p','HZAD FRENCH ACADEMY · HZAD EDUCATION','issuer');
 add(sheet,'h1','Certificate of Course Completion');add(sheet,'p','Awarded to');add(sheet,'h2',certificate.holder);
 add(sheet,'h3',`${certificate.level} French Course`);
 add(sheet,'p',`Completed ${certificate.lessonCount} required lessons and passed the HZad end-of-level assessment with ${certificate.score}%.`,'scope');
 add(sheet,'p','Assessment scope: '+certificate.scope,'scope');
 add(sheet,'p','Issued '+new Date(certificate.issuedAt).toLocaleDateString(),'detail');
 add(sheet,'p','Certificate ID: '+certificate.id,'detail');
 add(sheet,'p','Assessment version: '+certificate.version,'detail');
 add(sheet,'p','Verify this ID and printed holder name at the academy’s certificate verification form.','detail');
 add(sheet,'a','Open certificate verification','detail').href='https://hzad123.github.io/hzad-french-academy/certificates/?verifyCertificate='+encodeURIComponent(certificate.id);

 const back=doc.createElement('button');back.textContent='← Back';back.className='popup-back';back.addEventListener('click',()=>popup.close());doc.body.prepend(back);
 const actions=doc.createElement('div');actions.className='actions';doc.body.append(actions);
 const print=add(actions,'button','Print / Save as PDF');print.type='button';print.addEventListener('click',()=>popup.print());
}
