import {makeTefSpeakingStore} from './store.js';
import {createSpeakingRecorder} from '../tcf-speaking/recorder.js';
import {createFrenchVoicePlayer} from './voice.js';
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
  selectedTestId=null,serverOffset=0,pollCount=0,playing=null;
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
   onLimit:audio=>{void submitAnswer(audio)},
   onStatus:message=>{if(visible)status(message)}
  });
  return recorder;
 }
 function voiceInstance(){if(!voice)voice=voiceFactory();return voice}
 function clean(){
  epoch++;recordEpoch++;visible=false;busy=false;
  controller?.abort();controller=null;clearInterval(timer);clearTimeout(pollTimer);
  recorder?.dispose();recorder=null;voice?.dispose?.();voice=null;
  if(playing){playing.pause?.();playing=null}
  capture=null;bootKey=null;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden');
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
   if(id){accept(await store.read(id,signal))}else attempt=null;
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
  const calls=turns(phase);
  const card=el('section',undefined,'hz-tef-speaking-history');
  card.append(el('h4',phase===0?'Conversation · Section A':'Conversation · Section B'));
  if(!calls.length)card.append(el('p','Les réponses sauvegardées apparaîtront ici.'));
  calls.forEach((call,i)=>{
   const line=el('article',undefined,'hz-tef-speaking-turn');
   line.append(el('strong','Tour '+(i+1)));
   line.append(el('p','Vous : '+(call.result?.transcript?.trim()||'Aucune parole reconnue.')));
   if(call.result?.reply)line.append(el('p','Interlocuteur : '+call.result.reply));
   if(call.result?.audioStored)line.append(button('Écouter mon enregistrement',()=>{void playRecording(call.id)},false,true));
   card.append(line);
  });
  return card;
 }
 function gradeCard(result,heading){
  const wrapper=el('section',undefined,'hz-tef-speaking-feedback');
  wrapper.append(el('h4',heading));
  if(result.score!==null){
   wrapper.append(el('strong','Performance TEF estimée : '+result.score+'/699 · NCLC '+result.nclc));
   wrapper.append(el('p','Estimation pédagogique non officielle, non équivalente à une attestation TEF.'));
  }else wrapper.append(el('strong','Bilan pédagogique de la section · aucune note officielle'));
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
   if(current()){accept(next);render()}
  });
 }
 function renderCatalog(){
  area.append(el('p','20 épreuves originales. Section A : cinq minutes pour poser une dizaine de questions. Section B : dix minutes pour convaincre un(e) ami(e).'));
  area.append(el('p','Préparez votre microphone. L’examinateur répond en français après chacun de vos tours. Les deux sections et leurs évaluations utilisent des crédits IA.'));
  area.append(el('p','Chaque réponse enregistrée coûte '+(cost('turn')??'—')+' crédits IA. Chaque évaluation coûte '+(cost('feedback')??'—')+' crédit(s). Les demandes sans audio ne sont pas facturées.','hz-tef-credit-info'));
  const select=el('select');select.setAttribute('aria-label','Choisir une épreuve orale TEF');
  if(!catalog.tests.some(t=>t.id===selectedTestId))selectedTestId=catalog.tests[0]?.id;
  for(const p of catalog.tests){const option=el('option',p.title);option.value=p.id;option.selected=p.id===selectedTestId;select.append(option)}
  select.onchange=()=>{selectedTestId=select.value;render()};area.append(select);
  const chosen=catalog.tests.find(p=>p.id===selectedTestId);
  if(chosen){
   for(const s of chosen.sections){
    const card=el('article',undefined,'hz-tef-speaking-document');
    card.append(el('span','SECTION '+s.letter+' · '+formatTime(s.seconds),'hz-eyebrow'),
     el('h4',s.heading),el('blockquote',s.document),el('p',s.instructions));
    area.append(card);
   }
   area.append(button('Commencer l’épreuve '+chosen.id.slice(-2),()=>{void startTest()},!canPay('turn')));
  }
  const saved=el('section',undefined,'hz-tef-speaking-saved');
  saved.append(el('h4','Mes épreuves sauvegardées'));
  for(const row of catalog.history||[])saved.append(button(
   'Épreuve '+row.testId.slice(-2)+' · '+new Date(row.createdAt).toLocaleDateString('fr-CA')+
   (row.phase===3?' · Terminée':' · Reprendre'),
   ()=>{void open(row.id)},false,true));
  if(!catalog.history?.length)saved.append(el('p','Aucune épreuve sauvegardée.'));
  area.append(saved);
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
   area.append(button('Envoyer ma réponse et poursuivre la conversation',()=>{void submitAnswer()},!canPay('turn')));
   area.append(button('Réactiver le microphone',()=>{bootKey=null;void beginAnswer()},false,true));
  }
  area.append(historyBlock(attempt.phase));
  const tick=()=>{
   const n=remaining();timerText.textContent=formatTime(n)+' restantes';
   if(n<=0&&!busy&&!attempt.pending){
    clearInterval(timer);
    if(recorder?.isRecording()){const audio=recorder.stop();void submitAnswer(audio)}
    else if(!capture)void advance();
   }
  };
  tick();timer=setInterval(tick,350);
 }
 function renderBreak(){
  area.append(el('h4','Section A terminée'));
  area.append(el('p','Vous pouvez consulter votre bilan de la Section A avant de commencer la section B. Son chronomètre ne démarre qu’au moment où vous choisissez de commencer.'));
  area.append(historyBlock(0));
  const grade=showFeedback('feedback_a');if(grade)area.append(grade);
  area.append(button('Commencer la Section B · 10 minutes',()=>{
   void run(async(signal,current)=>{
    try{await recorderInstance().prepare()}catch{throw Error('Autorisez le microphone pour commencer la section B.')}
    accept(await store.send({kind:'begin_b',id:attempt.id},signal));
    if(current())render();
   });
  },!!attempt.pending));
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
  const header=el('header',undefined,'hz-tef-speaking-header');
  header.append(el('span','TEF CANADA · EXPRESSION ORALE','hz-eyebrow'),
   el('h3',attempt?.test?.title||'TEF Speaking · 20 tests'));
  area.append(header,button('← Tests TEF / TCF',()=>root.dispatchEvent(new CustomEvent('hzad-open-exams')),false,true));
  if(!attempt)renderCatalog();
  else if(active())renderActive();
  else if(attempt.phase===1)renderBreak();
  else renderFinal();
  if(!catalog?.enabled)status('Le simulateur vocal IA est temporairement indisponible.');
  const id=attempt?.id;recordView(root,'tef-speaking:'+(id||'home'),()=>open(id));controls();
 }
 const recordingKey=()=>attempt?.id+':'+attempt?.phase+':'+(turns(attempt.phase).at(-1)?.id||'opening');
 async function beginAnswer(){
  if(!visible||busy||!active()||attempt.pending||capture||recorder?.isRecording()||!remaining()||!canPay('turn'))return;
  const key=recordingKey();if(bootKey===key)return;
  const ticket=epoch,answerTicket=++recordEpoch;bootKey=key;
  try{
   await recorderInstance().prepare();
   if(ticket!==epoch||answerTicket!==recordEpoch||!active()||key!==recordingKey())return;
   const section=attempt.test.sections[sectionFor(attempt.phase)];
   const said=turns(attempt.phase).at(-1)?.result?.reply||section.opening;
   status('L’interlocuteur vous répond…');
   const spoken=await voiceInstance().speak(said);
   if(ticket!==epoch||answerTicket!==recordEpoch||!visible||busy)return;
   if(!spoken)status('Voix indisponible : lisez la réponse affichée, puis parlez.');
   if(!remaining()){void advance();return}
   await recorderInstance().start(Math.min(30,remaining()));
  }catch{
   if(ticket===epoch&&answerTicket===recordEpoch){
    bootKey=null;
    status('Microphone indisponible. Vérifiez les autorisations, puis cliquez sur « Réactiver le microphone ».',true);
   }
  }
 }
 async function submitAnswer(provided){
  if(!visible||busy||!active()||attempt.pending)return;
  const audio=capture?.audio||provided||recorder?.stop();
  if(!audio){bootKey=null;status('Aucune parole audible détectée. Vérifiez votre microphone et réessayez.',true);return}
  if(!capture)capture={kind:'turn',id:attempt.id,callId:crypto.randomUUID(),audio,expectedCredits:cost('turn'),phase:attempt.phase};
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
