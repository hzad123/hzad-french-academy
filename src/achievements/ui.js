import {makeAchievementStore,deviceTimeZone} from './store.js';
import {renderCertificate} from './certificate.js';
import {mountVerification} from './verification.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn,alt=false)=>{const n=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));n.type='button';n.addEventListener('click',fn);return n};
function section(parent){const n=el('section',undefined,'hz-achievements');parent.append(n);return n}
function message(parent,text,error=false){const n=el('p',text);n.setAttribute('role',error?'alert':'status');parent.append(n);return n}
export function wireRewardInitialization(root,client){
 let initialized=null,epoch=0;
 root.addEventListener('hzad-clear-lessons',()=>{initialized=null;epoch++});
 root.addEventListener('hzad-access-active',event=>{
  const id=event.detail?.userId;if(!id||initialized===id)return;
  const ticket=epoch;
  void makeAchievementStore(client).rewards().then(()=>{if(ticket===epoch)initialized=id}).catch(()=>{});
 });
}
export function mountRewards(parent,client){
 const panel=section(parent),store=makeAchievementStore(client);let active=true,busy=false;
 async function load(fn=()=>store.rewards()){
  if(busy)return;busy=true;panel.querySelectorAll('button,input,select').forEach(n=>{n.disabled=true});
  try{const data=await fn();if(active)draw(data)}catch(e){if(active){message(panel,e.message||'Achievements could not load.',true);panel.append(button('Retry achievements',()=>load(),true))}}
  finally{busy=false;if(active)panel.querySelectorAll('button,input,select').forEach(n=>{n.disabled=n.dataset.locked==='true'})}
 }
 function draw(data){
  panel.replaceChildren();panel.append(el('h4','Your learning achievements'));
  const stats=el('div',undefined,'hz-tracker-mastery-grid');
  const days=n=>`${n} ${n===1?'day':'days'}`;
  for(const [label,value] of [['XP earned',data.xp],['Current daily streak',days(data.streak)],['Longest streak',days(data.longestStreak)],['Learning rank',data.rank]]){
   const card=el('div',undefined,'hz-tracker-card');card.append(el('p',label),el('strong',String(value),'hz-xp-number'));stats.append(card);
  }panel.append(stats);
  const progress=el('progress');progress.max=250;progress.value=data.rankProgress;progress.setAttribute('aria-label','XP toward next learning rank');
  panel.append(progress,el('p',`${data.rankProgress}/250 XP toward your next rank. ${data.studiedToday?'Today’s study day is saved.':'Complete a lesson quiz or a due revision to keep your streak going.'}`));
  panel.append(el('p','Earn 50 XP per completed lesson, 10 XP per corrected notebook question, and 200 XP for a first pass on a level’s final assessment. Retakes and repeat corrections do not add duplicate XP. Previously completed lessons count toward XP; streak history starts with recorded study activity.'));
  panel.append(el('h4','Badges and achievements'));
  const badges=el('div',undefined,'hz-tracker-mastery-grid');
  for(const badge of data.badges){
   const card=el('article',undefined,'hz-tracker-card'+(badge.earned?' hz-earned-badge':''));
   card.append(el('h5',(badge.earned?'★ ':'☆ ')+badge.name),el('p',badge.earned?'Achievement earned':`${Math.min(badge.progress,badge.target)}/${badge.target} toward this achievement`));badges.append(card);
  }panel.append(badges,el('h4','Cosmetic rewards and certificate settings'));
  const form=el('form'),nameLabel=el('label','Name for your completion certificates'),name=el('input');name.value=data.profile.certificateName;name.required=true;name.minLength=2;name.maxLength=80;name.setAttribute('aria-label','Certificate display name');nameLabel.append(name);
  const zoneLabel=el('label','Study-day time zone'),zone=el('input');zone.value=data.profile.timezone||deviceTimeZone();zone.required=true;zone.setAttribute('aria-label','Study time zone');zoneLabel.append(zone);
  const titleLabel=el('label','Your unlocked study title'),title=el('select');title.setAttribute('aria-label','Study title');
  for(const reward of data.rewards){const option=el('option',`${reward.name} · ${reward.requiredXp} XP`);option.value=reward.name;option.disabled=data.xp<reward.requiredXp;title.append(option)}title.value=data.profile.title;titleLabel.append(title);
  const save=el('button','Save achievement settings','hz-btn');save.type='submit';
  form.append(nameLabel,zoneLabel,titleLabel,save);form.addEventListener('submit',event=>{event.preventDefault();void load(()=>store.preferences(zone.value.trim(),name.value.trim(),title.value))});
  panel.append(form,el('p','Titles are cosmetic and do not grant credits or course access. Calendar streaks use your saved time zone. After study activity, time-zone changes are limited to once every 30 days. Certificate names are learner-supplied, not verified legal identities. Name changes apply to future certificates; contact the academy to correct an issued certificate.','hz-small'));
 }
 message(panel,'Loading your achievements…');void load();return ()=>{active=false};
}
export function mountCertificates(parent,client,{onSettings,onOpenLevel}){
 const panel=section(parent),store=makeAchievementStore(client);let active=true,busy=false,audioEpoch=0,verifyCleanup=null,pendingPopup=null;
 const cancel=()=>{audioEpoch++;globalThis.speechSynthesis?.cancel()};
 async function run(fn,render){
  if(busy)return;busy=true;panel.querySelectorAll('button,input,select').forEach(n=>{n.disabled=true});
  panel.querySelector('[role=alert]')?.remove();
  try{const result=await fn();if(active)render(result)}catch(e){if(active)message(panel,e.message||'This request could not complete. Please retry.',true)}
  finally{busy=false;if(active)panel.querySelectorAll('button,input,select').forEach(n=>{n.disabled=n.dataset.locked==='true'})}
 }
 function drawList(data){
  cancel();verifyCleanup?.();panel.replaceChildren();
  panel.append(el('h4','HZad level-completion certificates'),el('p','Complete every published lesson in a level with a quiz score of at least 70%, then pass its separate 12-question assessment. A pass requires at least 80% overall and two-thirds correct in every assessed skill. No AI credits are used.'),
   el('p','These are HZad course-completion certificates, not official CEFR, TEF or TCF qualifications. Speaking and writing are not assessed. Text-supported assessments are available; the certificate states that scope.'));
  if(!data.name)panel.append(message(el('div'),'Save your certificate display name first.'),button('Open achievement settings',onSettings,true));
  const form=el('label','Use text-supported assessments (listening replaced with reading support)'),text=el('input');text.type='checkbox';text.checked=!globalThis.speechSynthesis?.getVoices().some(v=>/^fr[-_]/i.test(v.lang));text.setAttribute('aria-label','Text-supported assessment');form.prepend(text);panel.append(form);
  const grid=el('div',undefined,'hz-tracker-mastery-grid');
  for(const level of data.levels){
   const card=el('article',undefined,'hz-tracker-card');card.append(el('h5',level.level),el('p',`${level.ready}/${level.total} lessons completed with a quiz score of 70% or more.`));
   const start=button(level.eligible?'Start / resume final assessment':'Complete lessons to unlock assessment',()=>run(()=>store.start(level.level,text.checked),drawExam));start.disabled=!level.eligible||!data.name;start.dataset.locked=String(start.disabled);
   card.append(start);
   if(!level.eligible&&level.total)card.append(button('Continue required lessons',()=>onOpenLevel(level.level,level.nextUnit),true));
   grid.append(card);
  }panel.append(grid,el('h4','Your earned certificates'));
  if(!data.certificates.length)panel.append(el('p','Your certificates will appear here after you meet the course and assessment requirements.'));
  for(const certificate of data.certificates){
   const card=el('article',undefined,'hz-tracker-card');card.append(el('h5',`HZad ${certificate.level} course completion`),el('p',certificate.revoked?'Revoked — please contact the academy':`Issued ${new Date(certificate.issuedAt).toLocaleDateString()} · ${certificate.score}%`),el('p',certificate.scope));
   const open=button('View / print '+certificate.level+' certificate',()=>{
    const popup=globalThis.open('','_blank');if(!popup){message(panel,'Allow the certificate window to open and try again.',true);return}
    pendingPopup=popup;
    void run(async()=>{try{return await store.certificate(certificate.id)}catch(e){popup.close();pendingPopup=null;throw e}},c=>{try{renderCertificate(popup,c)}catch(e){message(panel,e.message,true)}finally{pendingPopup=null}});
   });open.disabled=certificate.revoked;open.dataset.locked=String(certificate.revoked);card.append(open);panel.append(card);
  }
  if(data.attempts?.length){
   const history=el('details');history.append(el('summary','Recent final assessments'));
   for(const attempt of data.attempts)history.append(button(`${attempt.level} · ${attempt.status} · ${new Date(attempt.startedAt).toLocaleDateString()}`,()=>run(()=>store.state(attempt.id),drawExam),true));panel.append(history);
  }
  verifyCleanup=mountVerification(panel);
  panel.querySelectorAll('button[data-locked=true]').forEach(b=>{b.disabled=true});
 }
 function drawExam(attempt){
  cancel();verifyCleanup?.();verifyCleanup=null;panel.replaceChildren();
  panel.append(el('h4',`${attempt.level} end-of-level assessment`),button('Back to certificates',()=>run(()=>store.certificates(),drawList),true));
  if(attempt.status==='expired'){panel.append(el('p','This assessment expired after seven days. Start a new attempt from Certificates.'));return}
  if(attempt.status==='completed'){
   const result=attempt.result;
   panel.append(el('h5',result.passed?'✓ Assessment passed':'More practice needed'),el('p',`Overall score: ${result.percent}%`),el('p',result.scope));
   const list=el('ul');for(const [skill,score] of Object.entries(result.skills))list.append(el('li',`${skill}: ${score.correct}/${score.total} correct`));panel.append(list);
   if(result.certificateId)panel.append(el('p','Your HZad course-completion certificate is saved. Return to Certificates to view or print it.'));
   else if(result.passed)panel.append(el('p','The assessment passed, but a certificate is unavailable. Contact the academy about the existing certificate record.'));
   else panel.append(el('p','Review the weaker skills before retaking. Course progress and earlier attempts are retained. You may start three new final assessments per rolling 24 hours.'));
   return;
  }
  panel.append(el('p',`${attempt.answered}/${attempt.total} answers saved. Results appear after all 12 questions; saved answers cannot be changed. Close this view and resume within seven days. ${attempt.textSupport?'Text-supported scope applies.':'Listening uses your device’s French voice; transcript support changes the recorded scope.'}`));
  const q=attempt.question,form=el('form'),fieldset=el('fieldset');fieldset.append(el('legend',q.prompt));let heard=false,transcript=attempt.textSupport;
  if(q.skill==='listening'){
   const passage=el('p',transcript?q.audioText:'Listen before answering, or choose text support.');passage.lang='fr';
   const status=el('p');status.setAttribute('role','status');
   const play=button('Play French audio',()=>{
    const speech=globalThis.speechSynthesis,voice=speech?.getVoices().find(v=>/^fr[-_]/i.test(v.lang));
    if(!speech||!voice||!globalThis.SpeechSynthesisUtterance){status.textContent='A French voice is unavailable. Use the transcript instead.';return}
    cancel();const token=audioEpoch,u=new SpeechSynthesisUtterance(q.audioText);u.lang='fr-FR';u.voice=voice;u.rate=.9;
    u.onend=()=>{if(active&&token===audioEpoch){heard=true;status.textContent='Audio complete. Choose your answer.'}};
    u.onerror=()=>{if(active&&token===audioEpoch)status.textContent='Audio failed. Use text support instead.'};speech.speak(u);
   });
   fieldset.append(play,button('Use transcript — record text-supported scope',()=>{cancel();transcript=true;passage.textContent=q.audioText;status.textContent='This assessment will use text-supported scope.'},true),passage,status);
  }
  q.options.forEach((option,index)=>{const label=el('label',undefined,'hz-tracker-option'),radio=el('input');radio.type='radio';radio.name='final-answer';radio.value=String(index);radio.required=true;label.append(radio,el('span',option));fieldset.append(label)});
  const submit=el('button',attempt.answered===11?'Save final answer and see result':'Save answer and continue','hz-btn');submit.type='submit';const status=el('p');status.setAttribute('role','status');form.append(fieldset,submit,status);
  form.addEventListener('submit',event=>{
   event.preventDefault();const chosen=form.querySelector('input:checked');if(!chosen)return;
   if(q.skill==='listening'&&!heard&&!transcript){status.textContent='Listen to the audio or choose transcript support first.';return}
   void run(()=>store.answer(attempt.id,q.id,Number(chosen.value),q.skill==='listening'&&transcript),drawExam);
  });panel.append(form);
 }
 message(panel,'Loading certificate requirements…');void run(()=>store.certificates(),drawList);
 return ()=>{active=false;cancel();verifyCleanup?.();if(pendingPopup&&!pendingPopup.closed)pendingPopup.close()};
}
