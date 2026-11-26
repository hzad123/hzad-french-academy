import {formatCredits,creditLabel} from '../../ai/credit-scale.js';
import {makeSpeakingStore} from './store.js';
import {createSpeakingRecorder} from './recorder.js';
import {createFrenchVoicePlayer,examinerVoiceNeedsTap} from '../tef-speaking/voice.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
export function wireTcfSpeaking(root,client,{fetcher,recorderFactory=createSpeakingRecorder}={}){
 const area=root.querySelector('#hz-tcf-speaking'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeSpeakingStore(client,fetcher);let selectedTestId, catalog,attempt,recorder,timer,pollTimer,controller,voicePlayer,epoch=0,visible=false,busy=false,viewer,offset=0,bootKey=null,capture=null,pollCount=0,answerDeadline=0,answerEpoch=0,preflight=false,catalogTab='tests',lastVisiblePhase=null,expiryInFlight=false,expiryTries=0,expiryGraceAt=0,expiryRetry=null;
 const left=()=>attempt?Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-offset)/1000)):0;
 const accept=value=>{attempt=value;offset=Date.parse(value.serverNow)-Date.now()};
 function clear(){epoch++;answerEpoch++;visible=false;busy=false;controller?.abort();recorder?.dispose();recorder=null;clearInterval(timer);clearTimeout(pollTimer);clearTimeout(expiryRetry);expiryInFlight=false;expiryTries=0;expiryGraceAt=0;voicePlayer?.dispose?.();voicePlayer=null;capture=null;bootKey=null;answerDeadline=0;lastVisiblePhase=null;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;viewer=null;selectedTestId=null;preflight=false;catalogTab='tests'}
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
   if(saved?.status==='failed'){
    // Do not silently retry or re-charge the failed AI request. Release the
    // locked buffer so a new microphone turn can start if time remains.
    capture=null;bootKey=null;
   }
  }return false;
 }
 async function run(work){if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();
  try{await work(controller.signal,()=>visible&&ticket===epoch)}
  catch(e){
   if(visible&&ticket===epoch){
    // 48 kHz phone audio can lose energy when downsampled to WAV.
    // Never leave a rejected buffer locked as the active capture.
    if(capture&&/too quiet|audible speech|recording too quiet/i.test(e.message||'')){
     capture=null;bootKey=null;
    }
    let recovered=false;
    if(attempt)try{recovered=await reconcile(controller.signal);render()}catch{}
    if(!recovered)status(e.message);
   }
  }finally{
   if(ticket===epoch){
    busy=false;controls();
    if(attempt?.phase<4&&!left())expireTask();
    else if(attempt?.pending)schedulePoll();
    else if(!capture)void beginAnswer();
   }
  }
 }
 async function open(id){root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');status('Opening TCF speaking…');await run(async(signal,current)=>{catalog=await store.catalog(signal);if(!current())return;if(id)accept(await store.read(id,signal));else{attempt=null;preflight=false;catalogTab='tests'}pollCount=0;if(current())render()})}
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
 // Do not wait for speech detection or examiner inference when time runs out.
 function expireTask(){
  if(!visible||!attempt||attempt.phase>=4||left()>0||expiryInFlight)return;
  // Capture the final student audio on expiry before moving phases.
  // Otherwise Task 3's entire 4:30 monologue could be silently discarded
  // if the browser countdown beats the microphone's own limit callback.
  if(!capture&&!busy&&recorder?.isRecording()){
   const finalWav=recorder.stop();
   if(finalWav){
    void submit(false,finalWav); // initiates the save without awaiting grading
    expiryGraceAt=Date.now();
   }
  }
  // Give a final WAV a brief opportunity to upload/lock, without waiting for
  // AI transcription. In-flight calls remain in the server's credit ledger.
  if(capture?.audio&&busy){
   if(!expiryGraceAt)expiryGraceAt=Date.now();
   if(Date.now()-expiryGraceAt<(attempt.phase===3?7000:2500)){
    status('Time is up. Saving the final recording and moving on…');
    clearTimeout(expiryRetry);expiryRetry=setTimeout(expireTask,200);return;
   }
  }
  if(expiryTries>=6){
   status('Time has ended, but the server could not advance. Reconnect and continue this saved test.');
   if(!area.querySelector('[data-tcf-retry-expiry]')){
    const action=button('Continue to the next task',()=>{expiryTries=0;expireTask()});
    action.dataset.tcfRetryExpiry='true';area.append(action);
   }
   return;
  }
  expiryInFlight=true;expiryTries++;
  const attemptId=attempt.id,ticket=++epoch;
  answerEpoch++;voicePlayer?.stop?.();recorder?.stop();bootKey=null;answerDeadline=0;
  capture=null;clearInterval(timer);clearTimeout(expiryRetry);
  // Disown old UI responses; do not abort an already-uploaded WAV.
  busy=true;controls();status('Time finished. Moving to the next task…');
  void (async()=>{
   try{
    const next=await store.send({kind:'advance',id:attemptId});
    if(ticket!==epoch||!visible||attempt?.id!==attemptId)return;
    accept(next);expiryInFlight=false;expiryTries=0;expiryGraceAt=0;
    busy=false;render();void beginAnswer();
   }catch{
    if(ticket!==epoch||!visible)return;
    expiryInFlight=false;busy=false;
    expiryRetry=setTimeout(expireTask,900);
   }
  })();
 }
 function advance(){
  if(!attempt||attempt.phase>=4)return;
  if(!left()){expireTask();return}
  if(busy||attempt.pending)return;
  answerEpoch++;voicePlayer?.stop?.();recorder?.stop();bootKey=null;
  void run(async(signal,current)=>{
   const next=await store.send({kind:'advance',id:attempt.id},signal);
   if(current()){accept(next);render()}
  });
 }
 async function submit(manual=false,readyAudio){
  if(!visible||busy||!attempt||attempt.pending||![0,2,3].includes(attempt.phase))return;
  const audio=capture?.audio||readyAudio||recorder?.stop();answerDeadline=0;
  if(!audio){
   if(!left()){expireTask();return}
   bootKey=null;
   status('No usable speech in that recording. The microphone is restarting automatically.');
   void beginAnswer(false,true);return;
  }
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
   area.scrollIntoView?.({block:'start',behavior:'auto'});
  }
 const turn=catalog.activities?.['tcf-speaking-turn'],grade=catalog.activities?.['tcf-speaking-feedback'];const ready=catalog.enabled&&turn?.enabled&&grade?.enabled;
 const canPay=cost=>ready&&Number.isSafeInteger(cost)&&catalog.wallet?.available>=cost&&catalog.wallet.budgetAvailable&&Date.parse(catalog.wallet.expiresAt)>Date.now();
 if(!attempt){
  const papers=catalog.tests||[catalog.test];
  if(!papers.some(p=>p.id===selectedTestId))selectedTestId=papers[0]?.id;
  const selected=papers.find(p=>p.id===selectedTestId);
  const requiredCredits=3*(turn?.credits||0)+(grade?.credits||0);
  const mayStart=canPay(requiredCredits);
  if(preflight){
   // Untimed instructions are shown only after choosing a paper and Start.
   // No attempt, exam timer, microphone or paid inference exists yet.
   const intro=el('section',undefined,'hz-tcf-speaking-preflight');
   intro.dataset.tcfPreflight='true';
   intro.append(el('span','TCF SPEAKING · TEST '+selected.id.slice(-2),'hz-tcf-speaking-eyebrow'),
    el('h4','Read the instructions before you begin'),
    el('p','Your exam has not started. Take as much time as you need to read these instructions.'));
   // TCF has three tasks, not four. Task 2's preparation and exchange
   // are one task, even though the server implements two timed phases.
   const schedule=el('div',undefined,'hz-tcf-speaking-timing hz-tcf-speaking-three-tasks');
   const steps=[
    ['Task 1 · Interview',['2 minutes speaking','No preparation']],
    ['Task 2 · Information gathering',['2 minutes preparation (no microphone)','Then 3 minutes 30 seconds speaking']],
    ['Task 3 · Opinion',['4 minutes 30 seconds speaking','No preparation']]
   ];
   for(const [title,details] of steps){
    const item=el('div',undefined,'hz-tcf-speaking-timing-item');
    item.append(el('strong',title));
    for(const detail of details)item.append(el('span',detail));
    schedule.append(item);
   }
   intro.append(schedule);
   const notice=el('div',undefined,'hz-tcf-speaking-prep-note');
   notice.append(el('strong','Important: Task 2 includes 2 minutes of preparation.'));
   notice.append(el('p','The preparation countdown appears after Task 1, before any Task 2 questions. Your microphone and the interlocutor stay off during those 2 minutes.'));
   intro.append(notice);
   intro.append(el('p','The examiner speaks first in Task 1. Recording starts after the examiner finishes. The test timer starts only when you press the Start button below.'));
   intro.append(el('p','AI credits: '+formatCredits(turn?.credits)+' maximum per submitted response · '+formatCredits(grade?.credits)+' maximum for final feedback.','hz-small'));
   const actions=el('div',undefined,'hz-tcf-speaking-preflight-actions');
   actions.append(button('Start TCF Speaking Test '+selected.id.slice(-2),()=>{
    voice().unlock(); // synchronous user gesture unlocks mobile examiner audio
    void run(async(signal,current)=>{
     try{await microphone().prepare()}catch{throw Error('Allow microphone access in your browser, then start the test again.')}
     const next=await store.send({kind:'start',id:crypto.randomUUID(),testId:selected.id,version:selected.version},signal);
     if(current()){preflight=false;accept(next);render()}
    });
   },!mayStart),
   button('Back to test selection',()=>{preflight=false;catalogTab='tests';render()}));
   intro.append(actions);area.append(intro);
  }else{
   // History is a separate, accessible tab: never append all saved attempts
   // beneath the paper selector as a wall of action buttons.
   const tabs=el('div',undefined,'hz-tcf-speaking-tabs');
   tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','TCF Speaking navigation');
   const makeTab=(name,title)=>{
    const tab=button(title,()=>{catalogTab=name;render()});
    tab.classList.add('hz-tcf-speaking-tab');
    tab.id='hz-tcf-speaking-tab-'+name;
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-selected',String(catalogTab===name));
    tab.setAttribute('aria-controls','hz-tcf-speaking-panel-'+name);
    tab.tabIndex=0;
    return tab;
   };
   tabs.append(makeTab('tests','Choose a test'),makeTab('history','My test history ('+(catalog.history?.length||0)+')'));
   tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();catalogTab=catalogTab==='tests'?'history':'tests';render();
    area.querySelector('#hz-tcf-speaking-tab-'+catalogTab)?.focus();
   });
   area.append(tabs);
   const panel=el('section',undefined,'hz-tcf-speaking-panel');
   panel.id='hz-tcf-speaking-panel-'+catalogTab;
   panel.setAttribute('role','tabpanel');
   panel.setAttribute('aria-labelledby','hz-tcf-speaking-tab-'+catalogTab);
   if(catalogTab==='history'){
    panel.append(el('h4','My saved TCF Speaking tests'));
    if(!catalog.history?.length){
     panel.append(el('p','No saved tests yet. Choose a test to begin.','hz-tcf-speaking-empty'));
    }else{
     const history=el('div',undefined,'hz-tcf-speaking-history');
     for(const row of catalog.history){
      const item=el('article',undefined,'hz-tcf-speaking-history-item');
      const label=el('div',undefined,'hz-tcf-speaking-history-meta');
      label.append(el('strong','Test '+(row.test_id||'tcf-speaking-01').slice(-2)));
      const when=new Date(row.createdAt);
      label.append(el('span',Number.isNaN(when.getTime())?'Saved attempt':
       'Started '+when.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})));
      const phaseLabel=['Task 1','Task 2 preparation','Task 2 conversation','Task 3','Completed'][row.phase]||'In progress';
      item.append(label,el('span',phaseLabel,'hz-tcf-speaking-history-state'),
       button(row.phase===4?'View results':'Resume test',()=>{void open(row.id);voice().unlock()}));
      history.append(item);
     }
     panel.append(history);
    }
   }else{
    panel.append(el('span','20 SPEAKING TESTS','hz-tcf-speaking-eyebrow'),
     el('h4','Choose your speaking test'));
    const field=el('label',undefined,'hz-tcf-speaking-select-field');
    field.append(el('span','Select test','hz-tcf-speaking-label'));
    const select=el('select');select.id='hz-speaking-paper';select.className='hz-tcf-speaking-select';
    select.setAttribute('aria-label','Choose a TCF speaking test');
    for(const paper of papers){
     const option=el('option','Test '+paper.id.slice(-2)+(paper.topic?' · '+paper.topic:''));
     option.value=paper.id;option.selected=paper.id===selectedTestId;select.append(option);
    }
    field.append(select);
    const actions=el('div',undefined,'hz-tcf-speaking-select-actions');
    const startButton=button('Start Test '+selected.id.slice(-2),()=>{preflight=true;render()},false);
    select.onchange=()=>{selectedTestId=select.value;startButton.textContent='Start Test '+selectedTestId.slice(-2)};
    actions.append(startButton);panel.append(field,actions);
    panel.append(el('p','Next: read the instructions at your own pace. The exam timer does not start until you confirm.','hz-tcf-speaking-hint'));
    if(!ready)panel.append(el('p','The AI speaking examiner is temporarily unavailable.'));
    else if(!mayStart)panel.append(el('p','Insufficient AI credits to start a speaking test.','hz-tcf-speaking-hint'));
    panel.append(el('p',formatCredits(turn?.credits)+' AI credits per submitted response · '+formatCredits(grade?.credits)+' for final feedback. Saved reviews are free.','hz-tcf-speaking-hint'));
   }
   area.append(panel);
  }
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
   if(n===0&&!switching){
    switching=true;clearInterval(timer);expireTask();
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
     if(!remaining&&!expiring){expiring=true;clearInterval(timer);expireTask()}};timer=setInterval(tick,250);
    if(index===1)block.append(el('p','Prepare your questions. The role-play begins automatically when preparation ends.'));
    else if(attempt.pending){block.append(el('p','Your response is being processed. It will not be sent twice.'),button('Check saved reply',()=>{pollCount=0;void run(async(signal,current)=>{await reconcile(signal);if(current())render()})}))}
    else{
     const same=completed().filter(c=>c.phase===index),question=same.length?same.at(-1).result.reply:phase.opening;
     if(question&&!same.length){const p=el('p','Examiner: '+question);p.lang='fr';block.append(p)}
     block.append(el('p',index===3?'Speak continuously for up to 4 minutes 30 seconds. Submit response ends your monologue early; the timer submits it automatically at the end.':'Submit response saves your answer and moves to the next task. Every 30 seconds, audio is saved automatically so you can continue speaking with the examiner.'));
     block.append(el('p',`${formatCredits(turn?.credits)} AI credits per submitted response.`,'hz-small'),button('Submit response',()=>{void submit(true)},!canPay(turn?.credits)));
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
   if(result){
    const feedback=el('section',undefined,'hz-writing-feedback hz-tcf-speaking-feedback');
    feedback.append(el('h4','Your TCF speaking assessment'));
    const scoreboard=el('div',undefined,'hz-tcf-speaking-scoreboard');
    const figures=el('div',undefined,'hz-tcf-speaking-score-figures');
    const metric=(label,value,note)=>{
     const item=el('div',undefined,'hz-tcf-speaking-score-metric');
     item.append(el('span',label,'hz-tcf-speaking-score-label'),
      el('strong',value,'hz-tcf-speaking-score-value'),
      el('span',note,'hz-tcf-speaking-score-note'));
     return item;
    };
    figures.append(metric('Estimated TCF speaking score',result.score===null?'—':result.score+'/20',
     result.score===null?'Insufficient evidence across all three tasks':'Overall speaking assessment'),
     metric('NCLC equivalent',result.nclc===null?'—':String(result.nclc).startsWith('Below')?result.nclc:'NCLC '+result.nclc,
     result.nclc===null?'Not available for this attempt':'Speaking-equivalent level'));
    scoreboard.append(figures);
    if(result.summary?.trim())scoreboard.append(el('p',result.summary,'hz-tcf-speaking-summary'));
    feedback.append(scoreboard);
    const criteria=el('section',undefined,'hz-tcf-speaking-feedback-section');
    criteria.append(el('h4','Why you received this score'));
    const labels={
     linguistic:['Language control','Grammar, vocabulary, accuracy and intelligibility'],
     pragmatic:['Communication and interaction','Relevant questions, coherence, development and examples'],
     sociolinguistic:['Appropriate language and register','Tone, politeness and suitability for the situation']
    };
    for(const item of result.criteria||[]){
     const [label,description]=labels[item.id]||[item.id,''];
     const card=el('article',undefined,'hz-writing-criterion hz-tcf-speaking-criterion');
     card.append(el('h5',label),el('p',description,'hz-tcf-speaking-card-subtitle'));
     card.append(el('span','Your actual words · Task '+item.task,'hz-tcf-speaking-evidence-label'),
      el('blockquote',item.evidence));
     card.append(el('h6','How this affected your performance'),el('p',item.reason));
     if(item.improvement?.trim())card.append(el('h6','What to fix'),el('p',item.improvement,'hz-tcf-speaking-next-step'));
     for(const observation of item.audioEvidence||[])card.append(el('p',observation,'hz-small'));
     criteria.append(card);
    }
    feedback.append(criteria);
    const corrections=el('section',undefined,'hz-tcf-speaking-feedback-section');
    corrections.append(el('h4','Your French · Corrections and better expressions'),
     el('p','Red shows the words in your saved transcript; green shows a suggested correction. Your recording transcript is never rewritten.','hz-tcf-speaking-section-note'));
    const items=Array.isArray(result.corrections)?result.corrections:[];
    if(items.length){
     for(const correction of items){
      const card=el('article',undefined,'hz-tcf-speaking-correction-card');
      card.append(el('h5','Task '+correction.task+' · Sentence improvement'));
      const original=el('div',undefined,'hz-tcf-speaking-original');
      original.append(el('span','✕  What was transcribed','hz-tcf-speaking-diff-label'),
       el('del',correction.original));
      const better=el('div',undefined,'hz-tcf-speaking-better');
      better.append(el('span','✓  Better French','hz-tcf-speaking-diff-label'),
       el('ins',correction.better));
      card.append(original,better,el('p',correction.why,'hz-tcf-speaking-why'));
      corrections.append(card);
     }
    }else{
     corrections.append(el('p',result.rubricVersion==='tcf-speaking-detailed-v2'?
      'No supported sentence-level corrections were identified from the saved transcript.':
      'This older assessment did not store sentence-by-sentence corrections. Its original score and feedback are preserved.','hz-tcf-speaking-section-note'));
    }
    feedback.append(corrections);
    const strengths=Array.isArray(result.wellSaid)?result.wellSaid:[];
    if(strengths.length){
     const good=el('section',undefined,'hz-tcf-speaking-feedback-section');
     good.append(el('h4','Effective expressions you used'));
     for(const sample of strengths){
      const card=el('article',undefined,'hz-tcf-speaking-good-card');
      card.append(el('span','✓  Task '+sample.task+' · From your transcript','hz-tcf-speaking-evidence-label'),
       el('blockquote',sample.quote),el('p',sample.why));
      good.append(card);
     }
     feedback.append(good);
    }
    const practice=Array.isArray(result.taskPractice)?result.taskPractice:[];
    if(practice.length){
     const guidance=el('section',undefined,'hz-tcf-speaking-feedback-section');
     guidance.append(el('h4','Next time · Task-by-task improvement'));
     for(const item of practice){
      const card=el('article',undefined,'hz-tcf-speaking-practice-card');
      card.append(el('h5','Task '+item.task),el('p',item.focus),
       el('span','Suggested example to practise · not a transcript quote','hz-tcf-speaking-evidence-label'),
       el('blockquote',item.example));
      guidance.append(card);
     }
     feedback.append(guidance);
    }
    for(const task of result.missingTasks||[])
     feedback.append(el('p','Task '+task+': no usable speech was recognized. An overall TCF/NCLC estimate needs recorded evidence for all three tasks.','hz-tcf-speaking-missing'));
    area.append(feedback);
   }else if(!attempt.pending){const assessment=el('div',undefined,'hz-speaking-assessment');area.append(assessment);assessment.append(el('strong','TCF speaking score /20 and NCLC: awaiting assessment'));assessment.append(button(`Get TCF speaking feedback · ${creditLabel(grade?.credits)}`,()=>{void run(async(signal,current)=>{const next=await store.send({kind:'feedback',id:attempt.id,callId:crypto.randomUUID(),expectedCredits:grade.credits},signal);if(next.processing)accept(await store.read(attempt.id,signal));else accept(next);if(current())render()})},!canPay(grade?.credits)));}
   else area.append(button('Check saved feedback',()=>{void run(async(signal,current)=>{await reconcile(signal);if(current())render()})}));
  }
 }
 const id=attempt?.id;recordView(root,'tcf-speaking:'+(id||'home'),()=>open(id));controls();
 }
 return {open,reset};
}
