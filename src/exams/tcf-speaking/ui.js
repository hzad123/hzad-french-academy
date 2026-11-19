import {makeSpeakingStore} from './store.js';
import {createSpeakingRecorder} from './recorder.js';
import {createFrenchVoicePlayer,examinerVoiceNeedsTap} from '../tef-speaking/voice.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
export function wireTcfSpeaking(root,client,{fetcher,recorderFactory=createSpeakingRecorder}={}){
 const area=root.querySelector('#hz-tcf-speaking'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeSpeakingStore(client,fetcher);let selectedTestId, catalog,attempt,recorder,timer,pollTimer,controller,voicePlayer,epoch=0,visible=false,busy=false,viewer,offset=0,bootKey=null,capture=null,pollCount=0,answerDeadline=0,answerEpoch=0,preflight=false,lastVisiblePhase=null;
 const left=()=>attempt?Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-offset)/1000)):0;
 const accept=value=>{attempt=value;offset=Date.parse(value.serverNow)-Date.now()};
 function clear(){epoch++;answerEpoch++;visible=false;busy=false;controller?.abort();recorder?.dispose();recorder=null;clearInterval(timer);clearTimeout(pollTimer);voicePlayer?.dispose?.();voicePlayer=null;capture=null;bootKey=null;answerDeadline=0;lastVisiblePhase=null;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;viewer=null;selectedTestId=null;preflight=false}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset();if(session?.user?.id)viewer=session.user.id});
 function status(text){let p=area.querySelector('.hz-speaking-status');if(!p){p=el('p',undefined,'hz-speaking-status');p.setAttribute('role','status');area.append(p)}p.textContent=text}
 function controls(){area.querySelectorAll('button').forEach(b=>b.disabled=busy||b.dataset.locked==='true')}
 function button(text,fn,locked=false){const b=el('button',text,'hz-btn');b.type='button';b.dataset.locked=String(locked);b.disabled=busy||locked;b.onclick=fn;return b}
 const completed=()=>attempt?.calls.filter(c=>c.status==='completed'&&c.kind==='turn')||[];
 function microphone(){if(!recorder)recorder=recorderFactory({onLimit:audio=>{void submit(false,audio)},onStatus:text=>{if(visible)status(text)}});return recorder}
 async function reconcile(signal){
  accept(await store.read(attempt.id,signal));
  if(capture){const saved=attempt.calls.find(c=>c.id===capture.callId);
   if(saved?.status==='completed'){const advance=capture.advanceAfter;capture=null;if(advance&&attempt.phase<4)accept(await store.send({kind:'advance',id:attempt.id},signal));return true}
   if(saved?.status==='failed')capture.callId=crypto.randomUUID();
  }return false;
 }
 async function run(work){if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();
  try{await work(controller.signal,()=>visible&&ticket===epoch)}catch(e){if(visible&&ticket===epoch){let recovered=false;if(attempt)try{recovered=await reconcile(controller.signal);render()}catch{}if(!recovered)status(e.message)}}finally{if(ticket===epoch){busy=false;controls();if(attempt?.pending)schedulePoll();else if(!capture)void beginAnswer()}}}
 async function open(id){root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');status('Opening TCF speaking…');await run(async(signal,current)=>{catalog=await store.catalog(signal);if(!current())return;if(id)accept(await store.read(id,signal));else attempt=null;pollCount=0;if(current())render()})}
 root.addEventListener('hzad-open-tcf-speaking',()=>{void open()});
 function voice(){if(!voicePlayer)voicePlayer=createFrenchVoicePlayer();return voicePlayer}
 function speak(text){return voice().speak(text)}
 function key(){return attempt?.id+':'+attempt?.phase+':'+(completed().filter(c=>c.phase===attempt.phase).at(-1)?.id||'opening')}
 async function beginAnswer(fromTap=false,skipVoice=false){
  if(!visible||busy||!attempt||attempt.pending||capture||![0,2,3].includes(attempt.phase)||bootKey===key())return;
  if(!left()){void advance();return}
  const current=key(),ticket=epoch,answerTicket=++answerEpoch;bootKey=current;
  const same=completed().filter(c=>c.phase===attempt.phase);
  const question=same.length?same.at(-1).result.reply:attempt.test.phases[attempt.phase].opening;
  try{
   // Attempt automatic examiner voice immediately on every platform.
   // The existing Start-test tap primed the mobile speech engine. No
   // per-question click is required when the browser permits playback.
   let played=true;
   if(!skipVoice&&question){
    status('Interlocuteur en train de parler…');
    played=await speak(question);
    if(ticket!==epoch||answerTicket!==answerEpoch||current!==key()||busy)return;
    if(!played){
     bootKey=null;
     status('La voix automatique a été bloquée par le navigateur. Appuyez sur « Réécouter l’interlocuteur » pour continuer.');
     return;
    }
   }
   await microphone().prepare();
   if(ticket!==epoch||answerTicket!==answerEpoch||current!==key())return;
   if(attempt.phase===3){
    accept(await store.send({kind:'begin_monologue',id:attempt.id}));
    if(ticket!==epoch||answerTicket!==answerEpoch)return;
   }
   if(!left()){void advance();return}
   const seconds=attempt.phase===3?left():Math.min(30,left());
   await microphone().start(seconds);answerDeadline=Date.now()+seconds*1000;
   status('● Enregistrement en cours. Parlez maintenant.');
  }catch{
   if(ticket===epoch&&answerTicket===answerEpoch){
    bootKey=null;
    status('Le microphone ne démarre pas. Vérifiez l’accès au microphone, puis réessayez.');
   }
  }
 }
 function advance(){if(busy||!attempt||attempt.pending||attempt.phase>=4)return;answerEpoch++;voicePlayer?.stop?.();recorder?.stop();bootKey=null;void run(async(signal,current)=>{accept(await store.send({kind:'advance',id:attempt.id},signal));if(current())render()})}
 async function submit(manual=false,readyAudio){
  if(!visible||busy||!attempt||attempt.pending||![0,2,3].includes(attempt.phase))return;
  const audio=capture?.audio||readyAudio||recorder?.stop();answerDeadline=0;
  if(!audio){if(!left()){advance();return}bootKey=null;status('No response is ready. Check your microphone and speak before submitting.');if(manual)void beginAnswer();return}
  if(!capture)capture={kind:'turn',id:attempt.id,phase:attempt.phase,callId:crypto.randomUUID(),audio,expectedCredits:catalog.activities['tcf-speaking-turn'].credits,advanceAfter:!left()||manual||attempt.phase===3};
  if(manual)capture.advanceAfter=true;
  status('Submitting your response…');pollCount=0;
  void run(async(signal,current)=>{
   const {phase,advanceAfter,...body}=capture;const next=await store.send(body,signal);if(!current())return;
   if(next.processing){accept(await store.read(attempt.id,signal));render();return}
   accept(next);const done=capture.advanceAfter;capture=null;if(done&&attempt.phase<4)accept(await store.send({kind:'advance',id:attempt.id},signal));if(current()){catalog=await store.catalog(signal);render()}
  });
 }
 function schedulePoll(){clearTimeout(pollTimer);if(!visible||!attempt?.pending||pollCount>=40)return;pollTimer=setTimeout(()=>{pollCount++;void run(async(signal,current)=>{await reconcile(signal);if(current())render()})},1500)}
 function render(){clearInterval(timer);clearTimeout(pollTimer);area.replaceChildren();area.append(el('h3',attempt?.test?.title||'TCF Speaking'),button('← TEF/TCF AI Tests',()=>root.dispatchEvent(new CustomEvent('hzad-open-exams'))));
  if(attempt&&lastVisiblePhase!==attempt.phase){
   lastVisiblePhase=attempt.phase;
   // The old UI left Task 2 preparation BELOW completed Task 1 on iPhone.
   // New active phases are now immediately visible at the top.
   area.scrollIntoView?.({block:'start',behavior:'instant'});
  }
 const turn=catalog.activities?.['tcf-speaking-turn'],grade=catalog.activities?.['tcf-speaking-feedback'];const ready=catalog.enabled&&turn?.enabled&&grade?.enabled;
 const canPay=cost=>ready&&Number.isSafeInteger(cost)&&catalog.wallet?.available>=cost&&catalog.wallet.budgetAvailable&&Date.parse(catalog.wallet.expiresAt)>Date.now();
 if(!attempt){
  area.append(el('p','Three timed speaking tasks: a personal interview, an information role-play and an opinion. Task 2 includes two minutes to prepare.'));
  area.append(el('p','Allow microphone access. The examiner asks a question, then recording starts automatically. Press Submit response to save your answer and move to the next task. Only Task 3 finishes the test. Tasks 1 and 2 save 30-second recordings during the conversation. Task 3 records continuously for the full 4 minutes 30 seconds.'));
  if(turn?.credits&&grade?.credits)area.append(el('p',`${turn.credits} AI credits per submitted response, including timer submissions; ${grade.credits} credit for final feedback. Up to 30 responses. Saved review is free.`));
  if(!ready)area.append(el('p','The AI speaking examiner is being prepared.'));
  const papers=catalog.tests||[catalog.test];
  if(!papers.some(p=>p.id===selectedTestId))selectedTestId=papers[0].id;
  const select=el('select');select.id='hz-speaking-paper';select.setAttribute('aria-label','Choose a TCF speaking test');
  for(const paper of papers){const option=el('option',paper.title+(paper.topic?' · '+paper.topic:''));option.value=paper.id;option.selected=paper.id===selectedTestId;select.append(option)}
  select.onchange=()=>{selectedTestId=select.value;render()};area.append(select);
  const selected=papers.find(p=>p.id===selectedTestId);
  if(!preflight){
   area.append(button('Read instructions · Test '+selected.id.slice(-2),()=>{preflight=true;render()},false));
  }else{
   const intro=el('section',undefined,'hz-writing-task');
   intro.append(el('h4','Read before starting · TCF Speaking'));
   intro.append(el('p','Task 1: 2 minutes of interview questions (no preparation).'));
   intro.append(el('p','Task 2: exactly 2 minutes to prepare questions, then 3 minutes 30 seconds of interaction. During the preparation screen, the microphone and examiner voice stay off.'));
   intro.append(el('p','Task 3: speak continuously for 4 minutes 30 seconds (no preparation).'));
   intro.append(el('p','No timer starts until you choose Start Task 1. On mobile, this tap also enables automatic examiner audio. Keep your phone volume up.'));
   area.append(intro);
   area.append(button('Start Task 1 · Enable examiner audio',()=>{
    voice().unlock(); // synchronous, before awaiting microphone permission or network
    void run(async(signal,current)=>{
     try{await microphone().prepare()}catch{throw Error('Allow microphone access in your browser, then start the test again.')}
     const next=await store.send({kind:'start',id:crypto.randomUUID(),testId:selected.id,version:selected.version},signal);
     if(current()){preflight=false;accept(next);render()}
    });
   },!canPay(3*(turn?.credits||0)+(grade?.credits||0))));
   area.append(button('Back to test selection',()=>{preflight=false;render()}));
  }
  for(const row of catalog.history)area.append(button('Saved speaking Test '+(row.test_id||'tcf-speaking-01').slice(-2)+' · '+new Date(row.createdAt).toLocaleDateString(),()=>{voice().unlock();void open(row.id)}));
 }else if(attempt.phase===1){
  // A dedicated, top-of-page preparation screen. The official 120-second
  // countdown is server-owned and remains correct after a reload.
  const prep=el('section',undefined,'hz-writing-task hz-tcf-speaking-preparation');
  prep.dataset.tcfPreparation='true';
  prep.append(el('h4','Task 2 · Preparation · 2 minutes'));
  const remainingText=el('strong',undefined,'hz-tcf-speaking-prep-clock');
  remainingText.setAttribute('aria-label','Remaining preparation time');
  const progress=el('progress');
  progress.max=120;progress.value=Math.min(120,left());progress.setAttribute('aria-label','Preparation countdown');
  prep.append(remainingText,progress);
  const paper=attempt.test.phases[1];
  const assignment=el('blockquote',paper.prompt);assignment.lang='fr';
  prep.append(assignment);
  prep.append(el('p','Prepare the questions you will ask. No examiner questions, audio or microphone recording occur during this preparation.'));
  prep.append(el('p','When the full two minutes have elapsed, Task 2 will begin automatically and the interlocutor will speak.'));
  area.append(prep);
  let switching=false;
  const refresh=()=>{
   const n=left();remainingText.textContent='Preparation · '+Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
   progress.value=Math.min(120,n);
   if(n===0&&!switching&&!busy&&!attempt.pending){
    switching=true;clearInterval(timer);advance();
   }
  };
  refresh();timer=setInterval(refresh,250);
 }else{
  let roleBlock;
  for(const [index,phase] of attempt.test.phases.entries()){
   const block=index===2?roleBlock:el('section',undefined,'hz-writing-task');
   if(index!==2){block.append(el('h4',index===1?'Task 2 · Information role-play':phase.name));area.append(block)}
   if(index===1)roleBlock=block;
   if(index===1&&attempt.phase===1)block.append(el('h5','Preparation · 2 minutes'));
   if(index===2&&attempt.phase>=2)block.append(el('h5','Speaking · 3 minutes 30 seconds'));
   if(index<=attempt.phase&&index!==2){const p=el('p',phase.prompt);p.lang='fr';block.append(p)}
   for(const call of completed().filter(c=>c.phase===index)){block.append(el('p',call.result.transcript?.trim()?'You: '+call.result.transcript:'No speech was recognized in this recording.'));if(call.result.reply)block.append(el('p','Examiner: '+call.result.reply))}
   if(index===attempt.phase){
    const clock=el('strong');block.append(clock);let expiring=false;
    const tick=()=>{const remaining=left();clock.textContent=attempt.pending?'Examiner processing…':`${index===1?'Preparation':index===3?'Task 3 ·':'Task'} ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} remaining`+(recorder?.isRecording()&&answerDeadline?(index===3?' · Recording continuously':` · Response ${Math.max(0,Math.ceil((answerDeadline-Date.now())/1000))}s`):'');
     if(!remaining&&!busy&&!attempt.pending&&!expiring&&!capture){expiring=true;clearInterval(timer);if(index===1)advance();else void submit(false)}};timer=setInterval(tick,250);
    if(index===1)block.append(el('p','Prepare your questions. The role-play begins automatically when preparation ends.'));
    else if(attempt.pending){block.append(el('p','Your response is being processed. It will not be sent twice.'),button('Check saved reply',()=>{pollCount=0;void run(async(signal,current)=>{await reconcile(signal);if(current())render()})}))}
    else{
     const same=completed().filter(c=>c.phase===index),question=same.length?same.at(-1).result.reply:phase.opening;
     if(question&&!same.length){const p=el('p','Examiner: '+question);p.lang='fr';block.append(p)}
     block.append(el('p',index===3?'Speak continuously for up to 4 minutes 30 seconds. Submit response ends your monologue early; the timer submits it automatically at the end.':'Submit response saves your answer and moves to the next task. Every 30 seconds, audio is saved automatically so you can continue speaking with the examiner.'));
     block.append(el('p',`${turn?.credits??'—'} AI credits per submitted response.`,'hz-small'),button('Submit response',()=>{void submit(true)},!canPay(turn?.credits)));
     if(examinerVoiceNeedsTap()){
      block.append(button('🔊 Réécouter l’interlocuteur si la lecture échoue',()=>{void beginAnswer(true)},!canPay(turn?.credits)));
      block.append(button('Enregistrer sans voix (texte affiché)',()=>{void beginAnswer(true,true)},!canPay(turn?.credits)));
     }
    }
    const liveStatus=el('p',undefined,'hz-speaking-status');liveStatus.setAttribute('role','status');block.append(liveStatus);
    tick();
   }
  }
  if(attempt.phase===4){recorder?.stop();const result=attempt.calls.find(c=>c.kind==='feedback'&&c.status==='completed')?.result;
   if(result){const feedback=el('section',undefined,'hz-writing-feedback');feedback.append(el('h4','Your TCF speaking result'),el('strong',result.score===null?'TCF score /20 unavailable · NCLC unavailable: audible task evidence needed':`Estimated TCF speaking ${result.score}/20 · NCLC ${result.nclc}`),el('p',result.summary));
    const labels={linguistic:'Linguistic competence · pronunciation, fluency and language',pragmatic:'Pragmatic competence · interaction, coherence and argument',sociolinguistic:'Sociolinguistic competence · audience and register'};
    for(const c of result.criteria){const card=el('article',undefined,'hz-writing-criterion');card.append(el('h5',labels[c.id]),el('blockquote','Task '+c.task+': '+c.evidence),el('p',c.reason));for(const observation of c.audioEvidence)card.append(el('p',observation,'hz-small'));if(c.improvement)card.append(el('h6','What to fix'),el('p',c.improvement));feedback.append(card)}
    if(result.score!==null)feedback.append(el('strong',`Total TCF speaking score: ${result.score}/20 · NCLC ${result.nclc}`));
    for(const task of result.missingTasks)feedback.append(el('p','Task '+task+': no usable speech was recognized. A TCF/NCLC total needs an audible response for all three tasks.'));area.append(feedback);
   }else if(!attempt.pending){const assessment=el('div',undefined,'hz-speaking-assessment');area.append(assessment);assessment.append(el('strong','TCF speaking score /20 and NCLC: awaiting assessment'));assessment.append(button(`Get TCF speaking feedback · ${grade?.credits??'—'} ${grade?.credits===1?'credit':'credits'}`,()=>{void run(async(signal,current)=>{const next=await store.send({kind:'feedback',id:attempt.id,callId:crypto.randomUUID(),expectedCredits:grade.credits},signal);if(next.processing)accept(await store.read(attempt.id,signal));else accept(next);if(current())render()})},!canPay(grade?.credits)));}
   else area.append(button('Check saved feedback',()=>{void run(async(signal,current)=>{await reconcile(signal);if(current())render()})}));
  }
 }
 const id=attempt?.id;recordView(root,'tcf-speaking:'+(id||'home'),()=>open(id));controls();
 }
 return {open,reset};
}
