import {makeExamStore} from './store.js';
import {mountRecorder} from '../ai/audio.js';
import {recordView,recordHome} from '../ui/navigation.js';
import {examSections,canSelectQuestion,itemLabel,SKILL_NAMES} from './sections.js';
const names={'tef-canada':'TEF Canada','tcf-canada':'TCF Canada'},skills=SKILL_NAMES;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn,alt=false)=>{const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
const clock=n=>`${Math.floor(Math.max(0,n)/60)}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
export function wireExams(root,client,{fetcher,recorderFactory=mountRecorder}={}){
 const area=root.querySelector('#hz-exams'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeExamStore(client,fetcher);let catalog=null,attempt=null,contentView=null,epoch=0,controller=null,recorder=null,interval=null,saveTimer=null,busy=false,observedAt=0,visible=false,drafts={},audio=null,confirmation=false,viewer=null;
 function clear(){epoch++;visible=false;busy=false;controller?.abort();clearInterval(interval);clearTimeout(saveTimer);recorder?.dispose();recorder=null;audio?.pause();audio=null;globalThis.speechSynthesis?.cancel();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;contentView=null;drafts={}}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'){viewer=null;reset()}else if(session?.user?.id){if(viewer&&viewer!==session.user.id)reset();viewer=session.user.id}});
 function status(text,error=false){let n=area.querySelector('.hz-exam-status');if(!n){n=el('p',undefined,'hz-exam-status');(area.querySelector('.hz-exam-current-question')||area).append(n)}n.textContent=text;n.setAttribute('role',error?'alert':'status')}
 function accept(value){if(value.status==='processing'){status('Your examiner response is processing. Check the saved attempt before sending again.');return false}attempt=value;observedAt=Date.now();return true}
 async function run(work){
  if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();
  try{await work(controller.signal,()=>visible&&ticket===epoch)}catch(e){if(visible&&ticket===epoch)status(e.name==='AbortError'?'Connection interrupted. Reopen the saved attempt before sending again.':e.message,true)}
  finally{if(ticket===epoch){busy=false;controls()}}
 }
 function controls(){area.querySelectorAll('button,input[type=radio]').forEach(b=>{if(!b.closest('.hz-ai-recorder'))b.disabled=busy||b.dataset.locked==='true'})}
 async function open(id){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));contentView=null;visible=true;chooser.classList.add('hz-hidden');area.classList.remove('hz-hidden');area.append(el('p','Opening your mock exams…'));
  await run(async(signal,current)=>{const next=await store.catalog(signal),saved=id?await store.send({kind:'read',id},signal):null;if(!current())return;catalog=next;attempt=saved;observedAt=Date.now();render()});
 }
 root.addEventListener('hzad-open-exams',()=>{void open()});
 function remember(){if(contentView){const {exam,skill,index}=contentView;recordView(root,`exam-content:${exam}:${skill}:${index}`,()=>openContent(exam,skill,index));return}const id=attempt?.id;recordView(root,'exams:'+(id||'home'),()=>open(id))}
 async function openContent(exam,skill='reading',index=0){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;chooser.classList.add('hz-hidden');area.classList.remove('hz-hidden');area.append(el('p','Opening question content…'));
  await run(async(signal,current)=>{const view=await store.send({kind:'content-review',exam,skill,index},signal);if(!current())return;contentView=view;attempt=null;render()});
 }
 function speak(text){const voice=globalThis.speechSynthesis?.getVoices().find(v=>/^fr[-_]/i.test(v.lang));if(!voice||!text)return;globalThis.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang='fr-FR';globalThis.speechSynthesis.speak(u)}
 async function saveDraft(signal){
  const q=attempt?.question;if(attempt?.skill!=='writing'||drafts[q.id]===undefined||drafts[q.id]===q.savedText)return;
  const result=await store.send({kind:'event',id:attempt.id,event:{kind:'writing',section:attempt.section,itemId:q.id,text:drafts[q.id]}},signal);accept(result);
 }
 function action(kind,extra={}){void run(async(signal,current)=>{await saveDraft(signal);const next=await store.send({kind,id:attempt.id,...extra},signal);if(current()&&accept(next))render()})}
 function event(data){action('event',{event:{section:attempt.section,itemId:attempt.question.id,...data}})}
 function home(){clear();recordHome(root)}
 function header(title){const h=el('header',undefined,'hz-exam-hero');h.append(el('p','HZAD EXAM CENTRE','hz-eyebrow'),el('h3',title),el('p','Train with purpose. Finish with a clear plan for improvement.'));area.append(h,button('← All levels',home,true))}
 function render(){
  const reviewOpen=[...area.querySelectorAll('.hz-exam-review-section[open]')].map(section=>section.dataset.skill);
  clearInterval(interval);clearTimeout(saveTimer);recorder?.dispose();recorder=null;audio?.pause();audio=null;confirmation=false;area.replaceChildren();area.classList.remove('hz-hidden');
  if(contentView){renderContentReview();remember();controls();return}
  if(!attempt){renderCatalog();remember();controls();return}
  header(names[attempt.exam]+' · Mock 01');area.append(button('Mock exam centre',()=>open(),true));
  if(attempt.status==='completed'){results(reviewOpen);remember();controls();return}
  if(attempt.status==='cancelled'){area.append(el('p','This attempt is closed. Your previous attempts remain saved.'));remember();controls();return}
  const q=attempt.question;
  const bar=el('div',undefined,'hz-exam-toolbar'),time=el('strong',undefined,'hz-exam-clock');time.setAttribute('aria-label','Section time remaining');bar.append(el('span',`${skills[attempt.skill]} · ${attempt.itemIndex+1} of ${attempt.totalItems}`),time);area.append(bar);
  const progress=el('progress');progress.max=4;progress.value=attempt.section;progress.setAttribute('aria-label','Exam sections completed');area.append(progress);
  const content=renderActiveSections();
  content.append(el('p',`${skills[attempt.skill]} · ${itemLabel(attempt.skill,attempt.itemIndex)}`,'hz-exam-question-heading'));
  const taskClock=q.responseRemainingSeconds!==undefined?el('p',undefined,'hz-exam-task-clock'):null;if(taskClock)content.append(taskClock);
  let requested=false;
  function updateClock(){
   const elapsed=Math.floor((Date.now()-observedAt)/1000),remaining=Math.max(0,attempt.remainingSeconds-elapsed);time.textContent=clock(remaining);
   if(taskClock){const prep=Math.max(0,(q.preparationRemainingSeconds||0)-elapsed),response=Math.max(0,q.responseRemainingSeconds-Math.max(0,elapsed-(q.preparationRemainingSeconds||0)));taskClock.textContent=prep?`Preparation · ${clock(prep)}`:`Task time · ${clock(response)}`}
   const expired=remaining===0||q.responseRemainingSeconds!==undefined&&elapsed>=q.responseRemainingSeconds+(q.preparationRemainingSeconds||0);
   const prepared=q.phase==='preparation'&&elapsed>=(q.preparationRemainingSeconds||0);
   if((expired||prepared)&&!requested&&!busy){requested=true;action('read')}
  }
  updateClock();interval=setInterval(updateClock,1000);
  const prompt=el('section',undefined,'hz-exam-task');prompt.lang='fr';
  if(q.passage)prompt.append(el('p',q.passage,'hz-exam-passage'));
  const question=el('h4',q.prompt);prompt.append(question);content.append(prompt);
  if(attempt.skill==='reading'||attempt.skill==='listening'){
   const choices=el('fieldset');choices.append(el('legend','Choisissez une réponse.'));choices.lang='fr';
   q.options.forEach((option,index)=>{const label=el('label',undefined,'hz-exam-choice'),input=el('input');input.type='radio';input.name='exam-answer';input.value=index;input.checked=q.savedAnswer===index;input.addEventListener('change',()=>event({kind:'answer',choice:index}));label.append(input,el('span',String.fromCharCode(65+index)+'. '+option));choices.append(label)});
   if(attempt.skill==='listening'){
    question.hidden=true;choices.hidden=true;
    const play=button('▶ Play recording once',()=>{if(audio){void audio.play().catch(()=>status('Allow audio playback in your browser.',true));return}void run(async(signal,current)=>{
     const result=await store.send({kind:'listen',id:attempt.id,taskId:q.id},signal);if(!current())return;
     audio=el('audio');audio.src=result.audioUrl;audio.preload='auto';audio.setAttribute('aria-label','French listening recording');
     audio.addEventListener('ended',()=>{question.hidden=false;choices.hidden=false;nextButton.hidden=false;status('Recording finished. Choose your answer, then continue.');play.disabled=true;play.dataset.locked='true'});
     audio.addEventListener('error',()=>{question.hidden=false;choices.hidden=false;nextButton.hidden=false;status('The recording could not play. Your attempt is saved; contact the academy before starting another paid attempt.',true)});
     try{await audio.play();play.disabled=true;play.dataset.locked='true';status('Listening…')}catch{play.textContent='Resume playback';status('Allow audio playback, then choose Resume playback.',true)}
    })});prompt.prepend(play);content.append(choices);
    // On resumed questions the server tells us whether playback was consumed.
    if(attempt.played){play.disabled=true;play.dataset.locked='true';question.hidden=false;choices.hidden=false}
   }else content.append(choices);
   const nav=el('div',undefined,'hz-exam-actions');
   if(attempt.navigation==='review'&&attempt.itemIndex>0)nav.append(button('Previous question',()=>event({kind:'move',index:attempt.itemIndex-1}),true));
   const nextButton=button(attempt.itemIndex+1<attempt.totalItems?'Next question':'Finish section',()=>attempt.itemIndex+1<attempt.totalItems?event({kind:'move',index:attempt.itemIndex+1}):finishSection());
   if(attempt.skill==='listening'&&!attempt.played)nextButton.hidden=true;nav.append(nextButton);content.append(nav);
  }else if(attempt.skill==='writing'){
   content.append(el('p',`${q.minWords} ${q.maxWords?'– '+q.maxWords:'minimum'} words`));
   const label=el('label','Votre réponse'),input=el('textarea');input.rows=12;input.maxLength=12000;input.lang='fr';input.spellcheck=false;input.value=drafts[q.id]??q.savedText;input.setAttribute('aria-label','Votre réponse écrite');
   const count=el('p',undefined,'hz-exam-wordcount');const update=()=>{count.textContent=`${input.value.trim()?input.value.trim().split(/\s+/u).length:0} words · autosave on`};update();
   const autosave=()=>{if(!visible)return;if(busy){saveTimer=setTimeout(autosave,500);return}void run(async(signal,current)=>{await saveDraft(signal);if(current())status('Writing saved.')})};
   input.addEventListener('input',()=>{drafts[q.id]=input.value;update();clearTimeout(saveTimer);saveTimer=setTimeout(autosave,1200)});
   label.append(input);content.append(label,count,button('Save writing',()=>{void run(async(signal,current)=>{await saveDraft(signal);if(current())status('Writing saved.')})},true));
   if(attempt.navigation==='review'){
    const nav=el('div',undefined,'hz-exam-actions');if(attempt.itemIndex>0)nav.append(button('Previous task',()=>event({kind:'move',index:attempt.itemIndex-1}),true));if(attempt.itemIndex+1<attempt.totalItems)nav.append(button('Next task',()=>event({kind:'move',index:attempt.itemIndex+1})));content.append(nav);
   }
   content.append(button('Finish writing section',finishSection,true));
  }else{
   content.append(el('p',q.phase==='preparation'?'Prepare your questions. Recording begins after preparation.':'Speak in French. Record each turn, then send it to your interlocutor.'));
   const log=el('div',undefined,'hz-exam-dialogue');log.setAttribute('role','log');for(const m of attempt.conversation||[]){log.append(el('p','You: '+m.transcript));if(m.reply)log.append(el('p','Interlocutor: '+m.reply),button('Hear interlocutor',()=>speak(m.reply),true))}content.append(log);
   if(q.phase!=='preparation'){
    recorder=recorderFactory(content);content.append(button('Send speaking turn · included',()=>{
     if(recorder.isRecording()){status('Stop recording before sending.',true);return}const recording=recorder.getAudio();if(!recording){status('Record a French response first.',true);return}
     action('turn',{callId:crypto.randomUUID(),section:attempt.section,taskId:q.id,audio:recording});
    }));
   }
   content.append(button('Finish speaking section',finishSection,true));
  }
  area.append(button('Close this attempt',()=>{if(!confirmation){confirmation=true;status('Closing ends this attempt. Saved results stay available. Full-test access credits have already been charged. Choose Close now to confirm.');area.append(button('Close now',()=>action('close'),true))}},true));remember();controls();
 }
 function finishSection(){if(!confirmation){confirmation=true;status('Finish this section? Saved answers will be locked.');area.append(button('Confirm and continue',()=>event({kind:'finish-section'})));controls()}}
 function sectionSummary(section,statusText){
  const summary=el('summary',undefined,'hz-exam-section-summary'),name=el('span',undefined,'hz-exam-section-name'),icon=el('span',section.icon,'hz-exam-skill-icon');icon.setAttribute('aria-hidden','true');name.append(icon,el('strong',section.name));summary.append(name,el('span',`${section.items} ${section.skill==='reading'||section.skill==='listening'?'questions':'tasks'} · ${Math.round(section.seconds/60)} min`,'hz-exam-section-meta'));if(statusText)summary.append(el('span',statusText,'hz-exam-section-state'));return summary;
 }
 function renderActiveSections(){
  const wrap=el('div',undefined,'hz-exam-sections'),sections=examSections(catalog.exams.find(e=>e.exam===attempt.exam),attempt);wrap.setAttribute('aria-label','Test sections and questions');let current;
  for(const [index,section] of sections.entries()){
   const active=section.skill===attempt.skill,done=index<attempt.section,group=el('details',undefined,'hz-exam-section'+(active?' is-active':''));group.dataset.skill=section.skill;group.open=active;
   group.append(sectionSummary(section,active?'In progress':done?'Completed':'Up next'));
   const layout=el('div',undefined,'hz-exam-section-layout'),list=el('nav',undefined,'hz-exam-question-list');list.setAttribute('aria-label',section.name+' questions');
   for(let i=0;i<section.items;i++){
    const selected=active&&i===attempt.itemIndex,answered=section.answered.includes(i),b=button(itemLabel(section.skill,i),()=>event({kind:'move',index:i}),true);
    b.setAttribute('aria-label',section.name+' '+itemLabel(section.skill,i).toLowerCase()+(answered?' · saved':''));b.dataset.locked=String(!canSelectQuestion(attempt,section.skill,i)||selected);b.disabled=b.dataset.locked==='true';if(selected)b.setAttribute('aria-current','step');if(answered)b.classList.add('is-saved');list.append(b);
   }
   layout.append(list);
   if(active){current=el('div',undefined,'hz-exam-current-question');layout.append(current)}
   else layout.append(el('p',done?'This section is complete. Corrections open after the full test.':'This section opens when you reach it in the timed test.','hz-small'));
   group.append(layout);wrap.append(group);
  }
  area.append(wrap);return current;
 }
 function renderCatalog(){
  header('Full French mock exams');if(!catalog)return;
  if(catalog.wallet)area.append(el('p',`${catalog.wallet.available} AI credits available`,'hz-ai-balance'));
  const cards=el('div',undefined,'hz-exam-cards');
  for(const exam of catalog.exams){
   const card=el('article',undefined,'hz-exam-card');card.append(el('span',exam.exam==='tef-canada'?'TEF':'TCF','hz-exam-seal'),el('h4',names[exam.exam]+' · Mock 01'));
   const sections=el('div',undefined,'hz-exam-section-outline');
   for(const section of examSections(exam)){
    const group=el('details',undefined,'hz-exam-section');group.dataset.skill=section.skill;group.append(sectionSummary(section));
    const list=el('ol',undefined,'hz-exam-outline-questions');list.setAttribute('aria-label',names[exam.exam]+' '+section.name+' question list');
    for(let i=0;i<section.items;i++){const item=el('li');if(catalog.canReviewContent){const review=button(itemLabel(section.skill,i),()=>openContent(exam.exam,section.skill,i),true);review.setAttribute('aria-label',`Review ${names[exam.exam]} ${section.name} ${itemLabel(section.skill,i).toLowerCase()}`);item.append(review)}else item.textContent=itemLabel(section.skill,i);list.append(item)}
    group.append(list);sections.append(group);
   }
   card.append(sections,el('p',catalog.canReviewContent?'Select a question to review its content.':'Start the full timed test to open its questions.'));
   if(catalog.canReviewContent)card.append(button('Review '+names[exam.exam]+' content',()=>openContent(exam.exam),true));
   if(Number.isSafeInteger(exam.credits))card.append(el('strong',`${exam.credits} credits for the full test, including feedback`));
   if(exam.enabled){
    const start=button('Start full mock · '+exam.credits+' credits',()=>{void run(async(signal,current)=>{const result=await store.send({kind:'start',id:crypto.randomUUID(),exam:exam.exam,expectedCredits:exam.credits},signal);if(current()&&accept(result))render()})});
    start.dataset.locked=String(!catalog.wallet||catalog.wallet.available<exam.credits||Date.parse(catalog.wallet.expiresAt)<=Date.now()||!catalog.wallet.budgetAvailable);card.append(start);
    if(start.dataset.locked==='true')card.append(el('p','A paid credit top-up is needed before starting.'));
   }else card.append(el('p','Preparing for release','hz-exam-release'));
   cards.append(card);
  }
  area.append(cards);
  if(catalog.topUpUrl){try{const url=new URL(catalog.topUpUrl);if(url.protocol==='https:'){const a=el('a','Purchase AI credits','hz-btn');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';area.append(a)}}catch{}}
  const history=el('section');history.append(el('h4','Your saved attempts'));for(const item of catalog.history)history.append(button(`${names[item.exam]} · ${new Date(item.createdAt).toLocaleDateString()} · ${item.status}`,()=>open(item.id),true));area.append(history);
 }
 function listBlock(title,items,parent){if(!items?.length)return;const list=el('ul');for(const item of items)list.append(el('li',item));parent.append(el('h5',title),list)}
 function debriefGuide(debrief,parent){
  if(!debrief)return;const guide=el('details',undefined,'hz-exam-debrief');guide.append(el('summary','Model response and revision guide'),el('h5',debrief.title));
  listBlock('Task checklist',debrief.checklist,guide);guide.append(el('h5',debrief.modelLabel));
  if(debrief.modelResponse){const model=el('p',debrief.modelResponse,'hz-exam-model-response');model.lang='fr';guide.append(model);if(debrief.modelResponse)guide.append(el('p',`${debrief.modelResponse.trim().split(/\s+/u).length} words`,'hz-small'))}
  for(const turn of debrief.exampleTurns||[]){const exchange=el('div',undefined,'hz-exam-model-turn');exchange.append(el('strong',turn.role==='learner'?'Learner':'Interlocutor'));const text=el('p',turn.text);text.lang='fr';exchange.append(text);guide.append(exchange)}
  listBlock('Why this works',debrief.whyItWorks,guide);listBlock('Watch for these mistakes',debrief.pitfalls,guide);
  if(debrief.practice)guide.append(el('h5','Try this next'),el('p',debrief.practice.instruction),el('p',debrief.practice.example,'hz-ai-corrected'));parent.append(guide);
 }
 function renderContentReview(){
  const view=contentView,q=view.question;header(names[view.exam]+' · Content review');area.append(button('Mock exam centre',()=>open(),true),el('p','Administrator review · no test attempt or credit charge','hz-ai-balance'));
  const groups=el('div',undefined,'hz-exam-sections');let panel;
  for(const section of examSections(catalog.exams.find(e=>e.exam===view.exam))){
   const group=el('details',undefined,'hz-exam-section'+(section.skill===view.skill?' is-active':''));group.dataset.skill=section.skill;group.open=section.skill===view.skill;group.append(sectionSummary(section));
   const layout=el('div',undefined,'hz-exam-section-layout'),nav=el('nav',undefined,'hz-exam-question-list');nav.setAttribute('aria-label',section.name+' content questions');
   for(let i=0;i<section.items;i++){const selected=section.skill===view.skill&&i===view.index,b=button(itemLabel(section.skill,i),()=>openContent(view.exam,section.skill,i),true);b.setAttribute('aria-label','Review '+section.name+' '+itemLabel(section.skill,i).toLowerCase());b.dataset.locked=String(selected);if(selected)b.setAttribute('aria-current','step');nav.append(b)}
   layout.append(nav);if(section.skill===view.skill){panel=el('div',undefined,'hz-exam-current-question');layout.append(panel)}else layout.append(el('p','Select a question or task to inspect its content.','hz-small'));group.append(layout);groups.append(group);
  }
  area.append(groups);panel.append(el('p',`${skills[view.skill]} · ${itemLabel(view.skill,view.index)}`,'hz-exam-question-heading'));
  if(q.passage){const passage=el('p',q.passage,'hz-exam-passage');passage.lang='fr';panel.append(passage)}
  const prompt=el('h4',q.prompt,'hz-exam-content-prompt');prompt.lang='fr';panel.append(prompt);
  if(q.options){const options=el('ol',undefined,'hz-exam-content-options');options.type='A';q.options.forEach((text,index)=>{const option=el('li',text,index===q.answer?'hz-ai-corrected':'');if(index===q.answer)option.append(el('strong',' ✓ Correct answer'));options.append(option)});panel.append(options,el('h5','Answer explanation'),el('p',q.explanation))}
  if(view.skill==='listening'){
   const transcript=el('details',undefined,'hz-exam-script');transcript.open=true;const script=el('p',q.transcript);script.lang='fr';transcript.append(el('summary','Full listening script'),script);panel.append(transcript);
   if(view.audioReady){const player=el('div');panel.append(button('Listen to recording',()=>{void run(async(signal,current)=>{const result=await store.send({kind:'content-audio',exam:view.exam,skill:view.skill,index:view.index},signal);if(!current())return;audio?.pause();audio=el('audio');audio.controls=true;audio.src=result.audioUrl;audio.setAttribute('aria-label','Question recording');player.replaceChildren(audio);void audio.play().catch(()=>status('Press Play on the audio player to listen.'))})},true),player)}
   else panel.append(el('p','Recording still needs generation. The complete script is shown above.','hz-exam-status'));
  }
  if(view.skill==='writing')panel.append(el('p',`${q.minWords}${q.maxWords?'–'+q.maxWords:'+'} words`));
  if(view.skill==='speaking')panel.append(el('p',`${Math.round(q.responseSeconds/60*10)/10} minutes speaking${q.preparationSeconds?' · '+q.preparationSeconds/60+' minutes preparation':''}`));
  if(q.criteria)listBlock('Feedback criteria',q.criteria.map(c=>c.label),panel);
  if(q.examinerRole){const role=el('details');role.append(el('summary','Interlocutor brief'),el('p',q.examinerRole));for(const [key,value] of Object.entries(q.scenarioFacts||{}))role.append(el('p',key+': '+value));panel.append(role)}
  debriefGuide(view.debrief,panel);
  const nav=el('div',undefined,'hz-exam-actions');if(view.index>0)nav.append(button('Previous content question',()=>openContent(view.exam,view.skill,view.index-1),true));if(view.index+1<view.total)nav.append(button('Next content question',()=>openContent(view.exam,view.skill,view.index+1),true));panel.append(nav);
 }
 function results(reviewOpen=[]){
  area.append(el('h4','Your exam review'));
  if(attempt.writingIssues?.length){const issues=el('section',undefined,'hz-exam-status');issues.append(el('h5','Writing task coverage'));for(const item of attempt.writingIssues)issues.append(el('p',item.taskId+' · '+item.issue));area.append(issues)}
  const grid=el('div',undefined,'hz-exam-scorecards');for(const result of attempt.sectionResults.filter(r=>r.correct!==undefined))grid.append(el('article',`${skills[result.skill]} · ${result.correct}/${result.total} correct`,'hz-exam-scorecard'));area.append(grid);
  const groups={};
  for(const section of examSections(catalog.exams.find(e=>e.exam===attempt.exam),attempt)){
   const group=el('details',undefined,'hz-exam-section hz-exam-review-section');group.dataset.skill=section.skill;group.open=reviewOpen.length?reviewOpen.includes(section.skill):section.skill==='reading';group.append(sectionSummary(section,'Completed'));
   const body=el('div',undefined,'hz-exam-section-review');group.append(body);groups[section.skill]=body;area.append(group);
  }
  for(const task of attempt.tasks){
   const part=task.id.split('-').at(-1),label=attempt.exam==='tef-canada'?'Section '+part.toUpperCase():'Task '+part;
   const card=el('article',undefined,'hz-exam-feedback');card.append(el('h4',skills[task.skill]+' · '+label));
   const prompt=el('details');prompt.append(el('summary','Task and your response'),el('p',task.prompt),el('p',task.response||'No response submitted.'));card.append(prompt);
   if(task.skill==='writing')card.append(el('p',`${task.words} words · target ${task.minWords}${task.maxWords?'–'+task.maxWords:'+'}`));
   const feedback=attempt.feedback?.[task.id];
   debriefGuide(task.debrief,card);
   if(feedback){
    card.append(el('p',feedback.summary));
    for(const criterion of feedback.criteria){const item=el('section',undefined,'hz-exam-criterion');item.append(el('strong',`${criterion.label} · ${criterion.rating}/4`));const meter=el('meter');meter.min=0;meter.max=4;meter.value=criterion.rating;meter.setAttribute('aria-label',criterion.label+' rating');item.append(meter);for(const quote of criterion.evidence)item.append(el('blockquote',quote));item.append(el('p',criterion.strength),el('p',criterion.improvement));card.append(item)}
    for(const correction of feedback.corrections){const n=el('div',undefined,'hz-exam-correction');n.append(el('p',correction.original,'hz-ai-original'),el('p',correction.corrected,'hz-ai-corrected'),el('p',correction.explanation));card.append(n)}
    const model=el('details');model.append(el('summary','Improved French response'),el('p',feedback.improvedResponse));card.append(model);
    const priorities=el('ol');feedback.priorities.forEach(p=>priorities.append(el('li',p)));card.append(el('h5','Your three priorities'),priorities);for(const practice of feedback.practice)card.append(el('p',practice.instruction),el('p',practice.example,'hz-ai-corrected'));
   }else if(!attempt.closed){
    for(const id of task.missingRecordingIds||[])card.append(button('Recover saved recording feedback · included',()=>action('recover',{callId:crypto.randomUUID(),taskId:task.id,recordingId:id}),true));
    const assess=button('Get detailed feedback · included',()=>action('assess',{callId:crypto.randomUUID(),taskId:task.id}));assess.dataset.locked=String(!!task.missingRecordingIds?.length);card.append(assess);
   }
   groups[task.skill].append(card);
  }
  for(const section of attempt.review){for(const [index,q] of section.items.entries()){const item=el('article',undefined,'hz-exam-review-item');item.append(el('h5',itemLabel(section.skill,index)),el('p',q.prompt));if(q.passage)item.append(el('p',q.passage));item.append(el('p',q.chosen===q.correct?'✓ Correct':'✕ '+(q.chosen===null?'Not answered':'Your answer: '+q.options[q.chosen]),q.chosen===q.correct?'hz-ai-corrected':'hz-ai-original'),el('p','Correct answer: '+q.options[q.correct]),el('p',q.explanation));if(q.transcript){const transcript=el('details');transcript.append(el('summary','Listening transcript'),el('p',q.transcript));item.append(transcript)}groups[section.skill].append(item)}}
  if(!attempt.closed)area.append(button('Close attempt and keep saved review',()=>action('close'),true));
 }
 return {open,reset};
}
