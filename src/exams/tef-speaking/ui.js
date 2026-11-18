import {makeTefSpeakingStore} from './store.js';
import {createSpeakingRecorder} from '../tcf-speaking/recorder.js';
import {createFrenchVoicePlayer} from './voice.js';
import {tefMicrophoneControls} from './mic-state.js';
import {recordView} from '../../ui/navigation.js';

const el=(tag,text,cls)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 if(cls)n.className=cls;return n;
};
const formatTime=secs=>Math.floor(Math.max(secs,0)/60)+':'+String(Math.max(0,secs)%60).padStart(2,'0');
export function wireTefSpeaking(root,client,{fetcher,recorderFactory=createSpeakingRecorder,voiceFactory=createFrenchVoicePlayer}={}){
 const area=root.querySelector('#hz-tef-speaking'),chooser=root.querySelector('#hz-course-chooser');
 if(!area)return;
 const store=makeTefSpeakingStore(client,fetcher);
 let catalog=null,attempt=null,recorder=null,voice=null,controller=null,timer=null,pollTimer=null,
  capture=null,bootKey=null,epoch=0,recordEpoch=0,visible=false,busy=false,viewer=null,
  selectedTestId=null,preflight=false,sectionBReady=false,serverOffset=0,pollCount=0,playing=null,micStarting=false,examinerSpeaking=false;
 const active=()=>attempt&&[0,2].includes(attempt.phase);
 const remaining=()=>active()?Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-serverOffset)/1000)):0;
 const accept=v=>{attempt=v;serverOffset=Date.parse(v.serverNow)-Date.now()};
 const cost=(kind)=>catalog?.activities?.[kind]?.credits;
 const ready=()=>catalog?.enabled&&catalog.activities?.turn?.enabled&&catalog.activities?.feedback?.enabled;
 const canPay=(kind)=>ready()&&Number.isInteger(cost(kind))&&catalog.wallet?.available>=cost(kind)&&
  catalog.wallet?.budgetAvailable&&Date.parse(catalog.wallet.expiresAt)>Date.now();
 const sectionFor=phase=>phase===0?0:1;
 const turns=phase=>attempt?.calls?.filter(c=>c.kind==='turn'&&c.phase===phase&&c.status==='completed')||[];
 function recorderInstance(){
  if(!recorder)recorder=recorderFactory({
   onLimit:audio=>{void submitAnswer(audio,true)},
   onStatus:message=>{if(visible){
    const translated=message.includes('No audible speech')?'Aucune voix suffisamment forte détectée. Rapprochez-vous du microphone.':
     message.includes('Speak for at least')?'Parlez au moins une seconde avant d’envoyer.':
     message.includes('Microphone ready')?'Microphone prêt.':
     message.includes('Allow microphone')?'Autorisez l’accès au microphone.':
     message.includes('Recording')?'● Enregistrement en cours. Parlez maintenant.':message;
    status(translated);syncMicControls();
   }}
  });
  return recorder;
 }
 function voiceInstance(){if(!voice)voice=voiceFactory();return voice}
 function clean(){
  epoch++;recordEpoch++;visible=false;busy=false;
  controller?.abort();controller=null;clearInterval(timer);clearTimeout(pollTimer);
  recorder?.dispose();recorder=null;voice?.dispose?.();voice=null;
  if(playing){playing.pause?.();playing=null}
  capture=null;bootKey=null;preflight=false;sectionBReady=false;micStarting=false;examinerSpeaking=false;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden');
 }
 function reset(){clean();catalog=null;attempt=null;viewer=null;selectedTestId=null}
 root.addEventListener('hzad-route-reset',clean);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{
  if(event==='SIGNED_OUT'||(viewer&&session?.user?.id&&viewer!==session.user.id))reset();
  if(session?.user?.id)viewer=session.user.id;
 });
 globalThis.addEventListener?.('beforeunload',event=>{
  if(visible&&(recorder?.isRecording?.()||capture)){event.preventDefault();event.returnValue=''}
 });
 function status(message,error=false){
  let node=area.querySelector('.hz-tef-speaking-status');
  if(!node){node=el('p',undefined,'hz-tef-speaking-status');area.append(node)}
  node.textContent=message;node.setAttribute('role',error?'alert':'status');
 }
 function button(text,fn,locked=false,alt=false){
  const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));
  b.type='button';b.dataset.locked=String(locked);b.disabled=busy||locked;
  b.addEventListener('click',fn);return b;
 }
 function controls(){
  area.querySelectorAll('button').forEach(b=>{b.disabled=busy||b.dataset.locked==='true'});
  syncMicControls();
 }
 function syncMicControls(){
  if(!visible||!active())return;
  const state=tefMicrophoneControls({
   recording:!!recorder?.isRecording(),starting:micStarting,busy,
   pending:!!attempt.pending,captured:!!capture,allowed:canPay('turn'),timeLeft:remaining()
  });
  const send=area.querySelector('[data-tef-send]');
  if(send){
   send.dataset.locked=String(!state.maySend);
   send.disabled=!state.maySend;
  }
  const start=area.querySelector('[data-tef-start-mic]');
  if(start){
   start.dataset.locked=String(!state.mayStart);
   start.disabled=!state.mayStart;
   start.textContent=state.state==='recording'?'Microphone actif':micStarting?'Activation du microphone…':'Activer le microphone';
  }
  const indicator=area.querySelector('[data-tef-mic-indicator]');
  if(indicator){
   indicator.dataset.state=state.state;
   indicator.textContent=state.state==='recording'?
    '● Enregistrement en cours. Parlez en français, puis cliquez sur « Arrêter et envoyer ».':
    state.state==='starting'?'Activation du microphone…':
    state.state==='expired'?'Le temps de cette section est terminé.':
    examinerSpeaking?'L’interlocuteur parle. Le micro démarrera après sa réponse, ou activez-le maintenant.':
    'Microphone en attente. Cliquez sur « Activer le microphone » si l’enregistrement ne démarre pas.';
  }
 }
 async function reconcile(signal){
  if(!attempt)return;
  accept(await store.read(attempt.id,signal));
  if(capture){
   const saved=attempt.calls.find(c=>c.id===capture.callId);
   if(saved?.status==='completed'){capture=null;bootKey=null;return}
   if(saved?.status==='failed'){capture.failed=true;bootKey=null}
  }
 }
 async function run(fn){
  if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();
  try{await fn(controller.signal,()=>visible&&ticket===epoch)}
  catch(error){
   if(visible&&ticket===epoch){
    if(attempt)try{await reconcile(controller.signal);render()}catch{}
    status(error.name==='AbortError'?'Connexion interrompue. Consultez votre épreuve sauvegardée.':
     error.message||'Impossible de terminer l’action.',true);
   }
  }finally{
   if(ticket===epoch){
    busy=false;controls();
    if(attempt?.pending)schedulePoll();
    else if(active()&&!capture)void beginAnswer();
   }
  }
 }
 async function open(id){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));
  visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');
  status('Ouverture des épreuves orales TEF…');
  await run(async(signal,current)=>{
   const data=await store.catalog(signal);if(!current())return;
   catalog=data;
   if(id){accept(await store.read(id,signal))}else{attempt=null;preflight=false;}
   if(current()){pollCount=0;render()}
  });
 }
 root.addEventListener('hzad-open-tef-speaking',()=>{void open()});
 async function playRecording(callId){
  if(playing){playing.pause?.();playing=null}
  await run(async(signal,current)=>{
   const wav=await store.recording(attempt.id,callId,signal);
   if(!current())return;
   if(!globalThis.Audio||!URL.createObjectURL){status('Lecture audio indisponible dans ce navigateur.',true);return}
   const url=URL.createObjectURL(wav),audio=new Audio(url);
   playing=audio;
   const done=()=>{URL.revokeObjectURL(url);if(playing===audio)playing=null};
   audio.onended=done;audio.onerror=()=>{done();status('Lecture impossible. Les transcriptions restent disponibles.',true)};
   try{await audio.play()}catch{done();status('La lecture a été bloquée. Activez le son et réessayez.',true)}
  });
 }
 function historyBlock(phase){
  // Include failed turns: their WAV may already have been saved securely even
  // when inference failed and credits were refunded. Never silently hide them.
  const calls=attempt?.calls?.filter(c=>c.kind==='turn'&&c.phase===phase&&
   ['completed','failed'].includes(c.status))||[];
  const card=el('section',undefined,'hz-tef-speaking-history');
  card.append(el('h4',phase===0?'Conversation · Section A':'Conversation · Section B'));
  if(!calls.length)card.append(el('p','Les réponses sauvegardées apparaîtront ici.'));
  calls.forEach((call,i)=>{
   const line=el('article',undefined,'hz-tef-speaking-turn');
   line.append(el('strong','Tour '+(i+1)+(call.status==='failed'?' · Traitement échoué':'· Enregistré')));
   line.append(el('p',call.status==='failed'?
    'La transcription n’a pas pu être terminée; le crédit de ce tour a été remboursé.':
    'Vous : '+(call.result?.transcript?.trim()||'Aucune parole reconnue.')));
   if(call.result?.reply)line.append(el('p','Interlocuteur : '+call.result.reply));
   // The owner-checked recording endpoint will report availability accurately.
   line.append(button('Écouter mon enregistrement',()=>{void playRecording(call.id)},false,true));
   card.append(line);
  });
  return card;
 }
 function gradeCard(result,heading){
  const wrapper=el('section',undefined,'hz-tef-speaking-feedback');
  wrapper.append(el('h4',heading));
  const isSectionA=result.kind==='feedback_a';
  if(Number.isInteger(result.score)&&result.nclc!==null&&result.nclc!==undefined){
   const scoreBox=el('div',undefined,'hz-tef-speaking-score');
   scoreBox.append(el('span',isSectionA?'Section A · estimation partielle':'Sections A + B · estimation globale','hz-tef-speaking-score-label'));
   const figures=el('div',undefined,'hz-tef-speaking-score-figures');
   const tef=el('div',undefined,'hz-tef-speaking-score-figure');
   tef.append(el('span','Score TEF estimé','hz-tef-speaking-score-caption'),el('strong',String(result.score)+'/699'));
   const nclc=el('div',undefined,'hz-tef-speaking-score-figure');
   nclc.append(el('span','Niveau NCLC estimé','hz-tef-speaking-score-caption'),el('strong',String(result.nclc)));
   figures.append(tef,nclc);scoreBox.append(figures);
   // Feedback B contains both an independently estimated Section B result
   // and the overall A+B estimate. Never display a made-up Section B value
   // for older saved assessments where that field was not generated.
   if(!isSectionA&&Number.isInteger(result.sectionBScore)&&result.sectionBNclc!==null&&result.sectionBNclc!==undefined){
    const bCard=el('div',undefined,'hz-tef-speaking-score-section-b');
    bCard.append(el('span','Section B · estimation partielle','hz-tef-speaking-score-label'));
    const bFigures=el('div',undefined,'hz-tef-speaking-score-figures');
    const bTef=el('div',undefined,'hz-tef-speaking-score-figure');
    bTef.append(el('span','Score TEF estimé','hz-tef-speaking-score-caption'),el('strong',String(result.sectionBScore)+'/699'));
    const bNclc=el('div',undefined,'hz-tef-speaking-score-figure');
    bNclc.append(el('span','Niveau NCLC estimé','hz-tef-speaking-score-caption'),el('strong',String(result.sectionBNclc)));
    bFigures.append(bTef,bNclc);bCard.append(bFigures);
    bCard.append(el('p','Estimation de la section B seule, indicative et non reconnue comme résultat TEF officiel.'));
    scoreBox.append(bCard);
   }
   scoreBox.append(el('p',isSectionA?
    'Estimation pédagogique fondée uniquement sur la section A. Ce score partiel ne correspond pas à un résultat TEF officiel complet.':
    'Estimation pédagogique fondée sur les deux sections. Seul le résultat officiel du TEF Canada permet de justifier un niveau NCLC.'));
   wrapper.append(scoreBox);
  }else wrapper.append(el('p',isSectionA?
   'Cette ancienne évaluation partielle ne contient pas de score chiffré. Les nouvelles évaluations de la section A afficheront un score TEF et un niveau NCLC estimés.':
   'Un score global ne peut pas être estimé sans réponses compréhensibles dans les deux sections.'));
  if(result.estimatedLevel)wrapper.append(el('p','Niveau CECR estimé : '+result.estimatedLevel));
  wrapper.append(el('p',result.summary));
  const names={linguistic:'Compétence linguistique',pragmatic:'Compétence pragmatique',sociolinguistic:'Compétence sociolinguistique'};
  for(const criterion of result.criteria||[]){
   const row=el('article',undefined,'hz-tef-speaking-criterion');
   row.append(el('h5',names[criterion.id]||criterion.id));
   row.append(el('blockquote','Section '+criterion.section+' · '+criterion.evidence));
   row.append(el('p',criterion.reason));
   if(criterion.improvement)row.append(el('p','À améliorer : '+criterion.improvement));
   if(criterion.audioEvidence?.length)row.append(el('p','Observation audio : '+criterion.audioEvidence.join(' · ')));
   wrapper.append(row);
  }
  if(result.mistakes?.length){
   const issues=el('section',undefined,'hz-tef-speaking-mistakes');issues.append(el('h5','Erreurs et corrections'));
   for(const m of result.mistakes){
    const item=el('article');item.append(el('p','Section '+m.section));
    item.append(el('del',m.original),el('ins',m.corrected),el('p',m.explanation));issues.append(item);
   }wrapper.append(issues);
  }
  const rec=el('section',undefined,'hz-tef-speaking-recommendations');
  rec.append(el('h5','Conseils pratiques'));
  for(const tip of result.recommendations||[]){
   rec.append(el('p',tip.advice));
   if(tip.example)rec.append(el('blockquote',tip.example));
  }
  wrapper.append(rec);
  return wrapper;
 }
 function showFeedback(kind){
  const calls=attempt.calls.filter(c=>c.kind===kind);
  const completed=calls.find(c=>c.status==='completed');
  if(completed?.result)return gradeCard(completed.result,kind==='feedback_a'?'Bilan de la Section A':'Bilan général · Sections A et B');
  if(calls.some(c=>c.status==='dispatched'||c.status==='reserved')){
   const box=el('div',undefined,'hz-tef-pending');
   box.append(el('p','Votre évaluation est en cours. Ne la redemandez pas.'));
   box.append(button('Vérifier les résultats sauvegardés',()=>{void run(async(signal,current)=>{await reconcile(signal);if(current())render()})},false,true));
   return box;
  }
  if(![0,2].includes(attempt.phase)&&((kind==='feedback_a'&&attempt.phase>=1)||(kind==='feedback_b'&&attempt.phase===3))){
   const box=el('div',undefined,'hz-tef-feedback-action');
   const fee=cost('feedback');box.append(el('p','Évaluation de cette étape : '+(fee??'—')+' crédit(s) IA.'));
   box.append(button(kind==='feedback_a'?'Obtenir le bilan de la Section A':'Obtenir le bilan général',
    ()=>{void sendFeedback(kind)},!canPay('feedback')));
   return box;
  }
  return null;
 }
 function sendFeedback(kind){
  if(busy||!attempt)return;
  const fee=cost('feedback');
  void run(async(signal,current)=>{
   const result=await store.send({kind,id:attempt.id,callId:crypto.randomUUID(),expectedCredits:fee},signal);
   if(!current())return;
   if(result.processing)await reconcile(signal);else accept(result);
   if(current()){catalog=await store.catalog(signal);render()}
  });
 }
 async function startTest(){
  await run(async(signal,current)=>{
   try{await recorderInstance().prepare()}catch{throw Error('Autorisez l’accès au microphone dans le navigateur, puis recommencez.')}
   const paper=catalog.tests.find(t=>t.id===selectedTestId);
   const next=await store.send({kind:'start',id:crypto.randomUUID(),testId:paper.id,version:paper.version},signal);
   if(current()){preflight=false;accept(next);render()}
  });
 }
 function renderCatalog(){
  // Keep the home screen focused on test selection and saved attempts.
  // Scenario documents and examiner instructions are displayed only after Start.
  const papers=catalog.tests||[];
  if(!papers.some(p=>p.id===selectedTestId))selectedTestId=papers[0]?.id;
  const picker=el('section',undefined,'hz-tef-speaking-picker');
  picker.append(el('span','20 TESTS DISPONIBLES','hz-eyebrow'),
   el('h4','Choisir un test'));
  const controls=el('div',undefined,'hz-tef-speaking-picker-controls');
  const field=el('label',undefined,'hz-tef-speaking-picker-field');
  const label=el('span','Test à passer','hz-tef-speaking-picker-label');
  const select=el('select',undefined,'hz-tef-speaking-select');
  select.id='hz-tef-speaking-paper';
  select.setAttribute('aria-label','Choisir un test TEF expression orale');
  for(const paper of papers){
   const option=el('option','Test '+paper.id.slice(-2));
   option.value=paper.id;option.selected=paper.id===selectedTestId;select.append(option);
  }
  field.append(label,select);
  const start=button('Consulter les consignes · Test '+(selectedTestId?.slice(-2)||'01'),
   ()=>{preflight=true;render()},false);
  select.onchange=()=>{
   selectedTestId=select.value;
   start.textContent='Consulter les consignes · Test '+selectedTestId.slice(-2);
  };
  controls.append(field,start);picker.append(controls);
  picker.append(el('p',
   'Coût : '+(cost('turn')??'—')+' crédits IA par réponse · '+
   (cost('feedback')??'—')+' crédit(s) par évaluation.',
   'hz-tef-speaking-picker-cost'));
  area.append(picker);

  const history=el('section',undefined,'hz-tef-speaking-saved hz-tef-speaking-history-list');
  const title=el('div',undefined,'hz-tef-speaking-history-title');
  title.append(el('h4','Mes tests sauvegardés'),
   el('span',String(catalog.history?.length||0),'hz-tef-speaking-history-count'));
  history.append(title);
  if(!catalog.history?.length){
   history.append(el('p','Aucun test commencé pour le moment.','hz-tef-speaking-empty'));
  }else for(const row of catalog.history){
   const item=el('article',undefined,'hz-tef-speaking-history-item');
   const info=el('div',undefined,'hz-tef-speaking-history-meta');
   const testNumber=(row.testId||'tef-speaking-01').slice(-2);
   info.append(el('strong','Test '+testNumber));
   info.append(el('span',new Date(row.createdAt).toLocaleDateString('fr-CA',{
    year:'numeric',month:'short',day:'numeric'
   }),'hz-tef-speaking-history-date'));
   const progress=['Section A','Section A terminée','Section B','Terminé'][row.phase]||'En cours';
   const state=el('span',progress,'hz-tef-speaking-history-state'+(row.phase===3?' is-complete':''));
   item.append(info,state,button(row.phase===3?'Voir les résultats':'Reprendre le test',
    ()=>{void open(row.id)},false,true));
   history.append(item);
  }
  area.append(history);
 }
 function renderPreflight(){
  // No server attempt exists yet. The server-owned 5-minute clock starts only
  // inside startTest(), after explicit confirmation and microphone preflight.
  const paper=catalog?.tests?.find(p=>p.id===selectedTestId);
  if(!paper){preflight=false;renderCatalog();return}
  const intro=el('section',undefined,'hz-tef-speaking-preflight');
  intro.append(el('span','AVANT DE COMMENCER · TEST '+paper.id.slice(-2),'hz-eyebrow'),
   el('h4','Lisez les consignes à votre rythme'));
  intro.append(el('p','Le chronomètre ne démarre pas pendant cette préparation. Il commencera uniquement lorsque vous appuierez sur « Démarrer la section A ».'));
  const a=paper.sections[0],b=paper.sections[1];
  const first=el('article',undefined,'hz-tef-speaking-document');
  first.append(el('span','SECTION A · 5:00','hz-eyebrow'),el('h4',a.heading),
   el('blockquote',a.document),el('p',a.instructions));
  intro.append(first);
  const note=el('section',undefined,'hz-tef-speaking-preflight-note');
  note.append(el('strong','Ensuite : Section B · 10:00'));
  note.append(el('p','Vous devrez présenter une autre annonce à un(e) ami(e) et le (la) convaincre. Vous pourrez lire les consignes de la section B avant de démarrer son chronomètre.'));
  intro.append(note);
  intro.append(el('p','Le microphone est vérifié avant le démarrage. Les réponses enregistrées et les évaluations consomment des crédits IA uniquement lorsque vous les envoyez.'));
  const actions=el('div',undefined,'hz-tef-speaking-preflight-actions');
  actions.append(button('Démarrer la section A · 5 min',()=>{void startTest()},!canPay('turn')),
   button('Retour aux tests',()=>{preflight=false;render()},false,true));
  intro.append(actions);
  area.append(intro);
 }
 function renderActive(){
  const section=attempt.test.sections[sectionFor(attempt.phase)];
  const card=el('section',undefined,'hz-tef-speaking-document');
  card.append(el('span','SECTION '+section.letter,'hz-eyebrow'),el('h4',section.heading),
   el('blockquote',section.document),el('p',section.instructions));
  area.append(card);
  const bar=el('div',undefined,'hz-tef-speaking-bar');
  const timerText=el('strong',undefined,'hz-tef-speaking-clock');
  timerText.setAttribute('aria-label','Temps restant pour la section '+section.letter);
  bar.append(el('span','Section '+section.letter+' · '+formatTime(section.seconds)),timerText);area.append(bar);
  if(attempt.phase===0){
   const questions=turns(0).filter(c=>c.result?.questionAsked).length;
   area.append(el('p','Questions posées : '+questions+' · Objectif : environ 10 questions pertinentes.','hz-tef-speaking-count'));
  }
  if(!ready())area.append(el('p','Examinateur IA temporairement indisponible. Votre travail reste sauvegardé.'));
  const last=turns(attempt.phase).at(-1)?.result?.reply||section.opening;
  const examiner=el('p','Interlocuteur : '+last,'hz-tef-examiner-line');examiner.lang='fr';area.append(examiner);
  area.append(el('p','Écoutez l’interlocuteur, posez vos questions ou défendez vos idées puis envoyez chaque réponse. Le test continue sans changer de section.'));
  area.append(el('p','Coût du prochain tour : '+(cost('turn')??'—')+' crédits IA.','hz-small'));
  if(attempt.pending){
   area.append(el('p','Traitement de votre réponse en cours. Aucun nouvel envoi payant n’est effectué.'));
   area.append(button('Vérifier ma réponse sauvegardée',()=>{pollCount=0;void run(async(signal,current)=>{await reconcile(signal);if(current())render()})},false,true));
  }else if(capture?.failed){
   area.append(el('p','Le traitement a échoué. L’enregistrement est conservé pour une nouvelle tentative. Les crédits du tour précédent ont été remboursés.','hz-tef-warning'));
   area.append(button('Réessayer avec la réponse enregistrée · '+(cost('turn')??'—')+' crédits IA',
    ()=>{capture={...capture,callId:crypto.randomUUID(),failed:false};void sendCapture()},!canPay('turn')));
  }else if(capture){
   area.append(el('p','Votre réponse est sauvegardée localement pour son envoi. Vérifiez le résultat avant tout nouvel enregistrement.'));
   area.append(button('Renvoyer la même réponse',()=>{void sendCapture()},false,true));
  }else{
   const micState=el('div',undefined,'hz-tef-speaking-microphone');
   micState.dataset.tefMicIndicator='true';micState.setAttribute('role','status');
   micState.setAttribute('aria-live','polite');area.append(micState);
   const micActions=el('div',undefined,'hz-tef-speaking-mic-actions');
   const send=button('Arrêter et envoyer ma réponse',()=>{void submitAnswer()},true);
   send.dataset.tefSend='true';
   const start=button('Activer le microphone',()=>{void startMicrophoneManually()},!canPay('turn'),true);
   start.dataset.tefStartMic='true';
   micActions.append(send,start);area.append(micActions);
  }
  area.append(historyBlock(attempt.phase));
  syncMicControls();
  const tick=()=>{
   const n=remaining();timerText.textContent=formatTime(n)+' restantes';
   if(n<=0&&!busy&&!attempt.pending){
    clearInterval(timer);
    if(recorder?.isRecording()){
     const audio=recorder.stop();if(audio)void submitAnswer(audio,true);else if(!capture)void advance();
    }else if(!capture)void advance();
   }
  };
  tick();timer=setInterval(tick,350);
 }
 function renderBreak(){
  // Server phase 1 has no countdown. Read the feedback first, then go to a
  // dedicated untimed Section B preview with a separate confirmation button.
  area.append(el('h4','Section A terminée'));
  area.append(el('p','La section B ne commence pas automatiquement. Consultez votre bilan puis ouvrez ses consignes quand vous êtes prêt(e).'));
  area.append(historyBlock(0));
  const grade=showFeedback('feedback_a');if(grade)area.append(grade);
  area.append(button('Lire les consignes de la Section B',()=>{
   sectionBReady=true;render();
  },!!attempt.pending));
 }
 function renderSectionBPreflight(){
  // Do not call begin_b until the learner presses Start. The 10 minute
  // deadline, AI speech, and microphone are not triggered on this screen.
  const b=attempt.test.sections[1];
  const intro=el('section',undefined,'hz-tef-speaking-preflight');
  intro.append(el('span','AVANT DE COMMENCER · SECTION B','hz-eyebrow'),
   el('h4','Lisez les consignes à votre rythme'),
   el('p','Le chronomètre de 10 minutes et l’enregistrement ne commenceront que lorsque vous appuierez sur « Démarrer la section B ».'));
  const paper=el('article',undefined,'hz-tef-speaking-document');
  paper.append(el('span','SECTION B · 10:00','hz-eyebrow'),el('h4',b.heading),
   el('blockquote',b.document),el('p',b.instructions));
  intro.append(paper);
  intro.append(el('p','Vous parlerez à un(e) ami(e) qui hésite. Vous devrez expliquer l’annonce, répondre à ses objections et le (la) convaincre.','hz-tef-speaking-preflight-note'));
  const actions=el('div',undefined,'hz-tef-speaking-preflight-actions');
  actions.append(button('Démarrer la section B · 10 min',()=>{
   void run(async(signal,current)=>{
    try{await recorderInstance().prepare()}
    catch{throw Error('Autorisez le microphone avant de démarrer la section B.')}
    const next=await store.send({kind:'begin_b',id:attempt.id},signal);
    if(current()){sectionBReady=false;accept(next);render()}
   });
  },!!attempt.pending),
   button('Retour au bilan de la section A',()=>{sectionBReady=false;render()},false,true));
  intro.append(actions);area.append(intro);
 }
 function renderFinal(){
  area.append(el('h4','Les deux sections sont terminées'));
  area.append(el('p','Vos réponses et les conversations ont été sauvegardées. Vous pouvez consulter les enregistrements et demander les évaluations ci-dessous.'));
  area.append(historyBlock(0),historyBlock(2));
  const a=showFeedback('feedback_a'),b=showFeedback('feedback_b');
  if(a)area.append(a);if(b)area.append(b);
 }
 function render(){
  clearInterval(timer);clearTimeout(pollTimer);area.replaceChildren();area.classList.remove('hz-hidden');
  const header=el('header',undefined,'hz-tef-speaking-header'+(!attempt?' hz-tef-speaking-header-compact':''));
  header.append(el('span','TEF CANADA · EXPRESSION ORALE','hz-eyebrow'),
   el('h3',attempt?.test?.title||'TEF Speaking · 20 tests'));
  area.append(header,button('← Tests TEF / TCF',()=>root.dispatchEvent(new CustomEvent('hzad-open-exams')),false,true));
  if(!attempt){if(preflight)renderPreflight();else renderCatalog()}
  else if(active())renderActive();
  else if(attempt.phase===1){if(sectionBReady)renderSectionBPreflight();else renderBreak()}
  else renderFinal();
  if(!catalog?.enabled)status('Le simulateur vocal IA est temporairement indisponible.');
  const id=attempt?.id;recordView(root,'tef-speaking:'+(id||'home'),()=>open(id));controls();
 }
 const recordingKey=()=>attempt?.id+':'+attempt?.phase+':'+(turns(attempt.phase).at(-1)?.id||'opening');
 async function startMicrophoneManually(){
  if(!visible||busy||!active()||attempt.pending||capture||micStarting||recorder?.isRecording()||
     !remaining()||!canPay('turn'))return;
  const ticket=epoch,answerTicket=++recordEpoch,mic=recorderInstance();
  // A student gesture can resume a suspended AudioContext immediately.
  voice?.stop();examinerSpeaking=false;bootKey=recordingKey();
  micStarting=true;syncMicControls();
  status('Activation du microphone…');
  try{
   await mic.start(Math.min(30,remaining()));
   if(ticket!==epoch||answerTicket!==recordEpoch||!visible||!active()){
    mic.stop();return;
   }
   status('● Enregistrement en cours. Parlez maintenant.');
  }catch{
   if(ticket===epoch&&answerTicket===recordEpoch){
    bootKey=null;
    status('Le microphone ne démarre pas. Vérifiez son autorisation et le périphérique d’entrée du navigateur.',true);
   }
  }finally{
   if(ticket===epoch&&answerTicket===recordEpoch){
    micStarting=false;syncMicControls();
   }
  }
 }
 async function beginAnswer(){
  if(!visible||busy||!active()||attempt.pending||capture||micStarting||
     recorder?.isRecording()||!remaining()||!canPay('turn'))return;
  const key=recordingKey();if(bootKey===key)return;
  const ticket=epoch,answerTicket=++recordEpoch;bootKey=key;
  try{
   await recorderInstance().prepare();
   if(ticket!==epoch||answerTicket!==recordEpoch||!active()||key!==recordingKey()||
      recorder?.isRecording()||micStarting)return;
   const section=attempt.test.sections[sectionFor(attempt.phase)];
   const said=turns(attempt.phase).at(-1)?.result?.reply||section.opening;
   examinerSpeaking=true;syncMicControls();
   status('L’interlocuteur vous répond…');
   const spoken=await voiceInstance().speak(said);
   if(ticket!==epoch||answerTicket!==recordEpoch||!visible||busy)return;
   examinerSpeaking=false;syncMicControls();
   if(!spoken)status('Voix indisponible : lisez la réponse affichée, puis parlez.');
   if(!remaining()){void advance();return}
   if(recorder?.isRecording()||micStarting)return;
   micStarting=true;syncMicControls();
   await recorderInstance().start(Math.min(30,remaining()));
   if(ticket!==epoch||answerTicket!==recordEpoch||!visible||!active()){
    recorder?.stop();return;
   }
   status('● Enregistrement en cours. Parlez maintenant.');
  }catch{
   if(ticket===epoch&&answerTicket===recordEpoch){
    bootKey=null;
    status('Microphone indisponible. Autorisez son accès puis utilisez « Activer le microphone ».',true);
   }
  }finally{
   if(ticket===epoch&&answerTicket===recordEpoch){
    examinerSpeaking=false;micStarting=false;syncMicControls();
   }
  }
 }
 async function submitAnswer(provided,fromTimer=false){
  if(!visible||busy||!active()||attempt.pending)return;
  const wasRecording=!!recorder?.isRecording();
  // Never submit while the examiner is still talking or while the AudioContext
  // is waiting to start. Only an actual WAV produced by the recorder can be sent.
  const audio=capture?.audio||provided||(wasRecording?recorder.stop():null);
  if(!audio){
   bootKey=null;
   status(fromTimer||wasRecording?
    'Aucune voix suffisamment forte n’a été enregistrée. Rapprochez-vous du microphone et recommencez.':
    'Le microphone n’enregistre pas encore. Cliquez sur « Activer le microphone », attendez le voyant rouge, puis parlez.',true);
   syncMicControls();return;
  }
  if(!capture)capture={kind:'turn',id:attempt.id,callId:crypto.randomUUID(),audio,expectedCredits:cost('turn'),phase:attempt.phase};
  syncMicControls();
  await sendCapture();
 }
 async function sendCapture(){
  if(!capture||busy||!visible||!attempt)return;
  recordEpoch++;voice?.stop();bootKey=null;pollCount=0;
  status('Enregistrement sauvegardé. Envoi sécurisé et traitement…');
  await run(async(signal,current)=>{
   const {phase,...body}=capture;const next=await store.send(body,signal);
   if(!current())return;
   if(next.processing)await reconcile(signal);else accept(next);
   if(attempt.calls.find(c=>c.id===capture.callId&&c.status==='completed'))capture=null;
   if(current()){catalog=await store.catalog(signal);render()}
  });
 }
 function schedulePoll(){
  clearTimeout(pollTimer);
  if(!visible||!attempt?.pending||pollCount>=45)return;
  pollTimer=setTimeout(()=>{
   pollCount++;
   void run(async(signal,current)=>{
    await reconcile(signal);if(current()){render();if(!active()||!remaining())void advance()}
   });
  },1600);
 }
 function advance(){
  if(!visible||busy||!active()||attempt.pending||capture)return;
  recordEpoch++;voice?.stop();recorder?.stop();bootKey=null;
  void run(async(signal,current)=>{
   accept(await store.send({kind:'advance',id:attempt.id},signal));
   if(current())render();
  });
 }
 return {open,reset};
}
