import {makeTrackerStore} from './store.js';
import {LEVELS,SKILLS,learningLevel,skillEvidence,dueMistakes,makeDailyPlan} from './plan.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const revisionSummary=entry=>`${entry.skill} · missed ${entry.wrongCount} time(s) · ${entry.lastCorrect?'reviewed; scheduled '+new Date(entry.dueAt).toLocaleDateString():'needs revision'}`;
export function wireTracker(root,client){
 const area=root.querySelector('#hz-progress-tracker'),launch=root.querySelector('#hz-tracker-launch');
 const chooser=root.querySelector('#hz-course-chooser'),store=makeTrackerStore(client);
 let snapshot=null,tab='plan',epoch=0,busy=false,filter='due',page=0,notice='';
 const button=(title,fn,alt=false)=>{const n=el('button',title,'hz-btn'+(alt?' hz-btn-alt':''));n.type='button';n.addEventListener('click',fn);return n};
 const clear=()=>{epoch++;busy=false;snapshot=null;notice='';area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')};
 let viewer=null;
 client.auth.onAuthStateChange?.((event,session)=>{
  if(event==='SIGNED_OUT'){viewer=null;clear()}
  else if(session?.user?.id){
   if(viewer&&viewer!==session.user.id)clear();
   viewer=session.user.id;
  }
 });
 root.addEventListener('hzad-clear-lessons',clear);
 root.addEventListener('hzad-close-tracker',clear);
 const close=()=>{clear();launch.focus()};
 const openLesson=(unit,skill)=>{
  close();root.dispatchEvent(new CustomEvent('hzad-open-level',{detail:{level:unit.level,unitId:unit.id,skill}}));
 };
 async function run(fn){
  if(busy)return;busy=true;const ticket=epoch;
  area.querySelectorAll('button,input,select').forEach(n=>{n.disabled=true});
  area.querySelector('[role=alert]')?.remove();
  try{
   const response=await fn();if(ticket!==epoch)return;
   const next=response?.snapshot||response;
   if(!next||!Array.isArray(next.units)||!Array.isArray(next.skills)||!Array.isArray(next.notebook))throw Error('Invalid progress tracker response.');
   if(response?.feedback)notice=response.feedback.correct?'✓ Correct. Your review is saved and the next revision is scheduled.':`Not quite. ${response.feedback.explanation||'Revisit the explanation and try again.'}`;
   snapshot=next;page=0;render();
  }catch(error){
   if(ticket!==epoch)return;
   const msg=el('p',error.message||'Your progress could not load. Please retry.');msg.setAttribute('role','alert');area.append(msg);
  }finally{if(ticket===epoch){busy=false;area.querySelectorAll('button,input,select').forEach(n=>{n.disabled=false})}}
 }
 async function reviseInline(entry,choice,card,fieldset,feedback,retry,continueButton){
  if(busy)return;
  busy=true;const ticket=epoch;let correct=false;
  area.querySelectorAll('button,input,select').forEach(n=>{n.disabled=true});
  feedback.className='hz-revision-feedback';feedback.textContent='Checking your answer…';feedback.setAttribute('role','status');
  retry.hidden=true;continueButton.hidden=true;
  try{
   const result=await store.revise(entry.unitId,entry.questionId,choice);
   if(ticket!==epoch)return;
   if(typeof result?.feedback?.correct!=='boolean'||!Array.isArray(result.snapshot?.notebook))throw Error('Your answer could not be confirmed. Please retry.');
   snapshot=result.snapshot;correct=result.feedback.correct;
   const saved=snapshot.notebook.find(n=>n.unitId===entry.unitId&&n.questionId===entry.questionId);
   card.querySelector('.hz-revision-meta').textContent=saved?revisionSummary(saved):(correct?'Reviewed — next revision scheduled.':'Needs revision.');
   fieldset.dataset.revisionCorrect=String(correct);
   const labels=fieldset.querySelectorAll('label');
   labels.forEach((label,i)=>{
    label.classList.toggle('hz-revision-correct',i===choice&&correct);
    label.classList.toggle('hz-revision-incorrect',i===choice&&!correct);
   });
   card.classList.toggle('hz-revision-card-correct',correct);
   feedback.className='hz-revision-feedback '+(correct?'hz-revision-correct':'hz-revision-incorrect');
   feedback.replaceChildren(el('strong',correct?'✓ Correct!':'✕ Incorrect — try again'),el('p',result.feedback.explanation||'Review the lesson explanation.'));
   if(!correct)feedback.append(el('p','Correct answer: '+result.feedback.answer));
   else feedback.append(el('p','Your correction is saved. Your next revision has been scheduled.'));
   continueButton.hidden=!correct;
  }catch(error){
   if(ticket!==epoch)return;
   feedback.className='hz-revision-feedback';feedback.textContent=error.message||'Could not check your answer. Please retry.';feedback.setAttribute('role','alert');retry.hidden=false;
  }finally{
   if(ticket===epoch){
    busy=false;area.querySelectorAll('button,input,select').forEach(n=>{n.disabled=false});
    area.querySelectorAll('fieldset[data-revision-correct="true"] input').forEach(n=>{n.disabled=true});
   }
  }
 }
 function focusHeading(){const h=area.querySelector('h3');h?.focus()}
 function render(){
  area.replaceChildren();area.classList.remove('hz-hidden');
  const heading=el('h3','Your Progress Tracker');heading.tabIndex=-1;
  area.append(heading,button('← All levels',close,true),button('Refresh progress',()=>{notice='';void run(()=>store.snapshot())},true));
  const tabs=el('nav');tabs.setAttribute('aria-label','Progress tracker views');
  for(const [key,label] of [['plan','Daily plan'],['mastery','French mastery'],['notebook','Mistake notebook']]){
   const b=button(label,()=>{
    tab=key;page=0;notice='';
    if(key==='plan'&&snapshot?.notebookOffset){void run(()=>store.snapshot());return}
    render();focusHeading();
   },true);b.setAttribute('aria-current',tab===key?'page':'false');tabs.append(b);
  }
  area.append(tabs);
  if(notice){const msg=el('p',notice);msg.setAttribute('role','status');area.append(msg)}
  if(!snapshot){area.append(el('p','Load your saved progress to build your study plan.'),button('Load progress',()=>run(()=>store.snapshot())));return}
  if(tab==='plan')renderPlan();
  if(tab==='mastery')renderMastery();
  if(tab==='notebook')renderNotebook();
  area.append(el('p','Practice scores and course completion are learning evidence, not official CEFR certification. Speaking and writing proficiency are not inferred.','hz-small'));
 }
 function renderPlan(){
  const plan=makeDailyPlan(snapshot);
  area.append(el('h4',`Today’s ${plan.goal}-minute learning plan`),el('p',`Study level: ${plan.level} · ${new Date(snapshot.generatedAt).toLocaleDateString()} · ${plan.plannedMinutes} minutes of suggested activities.`));
  const form=el('form'),label=el('label','Daily study goal'),minutes=el('select');minutes.setAttribute('aria-label','Daily study goal');
  for(const value of [10,20,30]){const option=el('option',`${value} minutes`);option.value=String(value);minutes.append(option)}minutes.value=String(plan.goal);label.append(minutes);
  const levelLabel=el('label','Study level'),level=el('select');level.setAttribute('aria-label','Study level');
  const auto=el('option','Use placement / current course');auto.value='';level.append(auto);
  for(const value of LEVELS){const option=el('option',value);option.value=value;level.append(option)}level.value=snapshot.preferences?.level||'';levelLabel.append(level);
  const save=el('button','Save study preferences','hz-btn');save.type='submit';
  form.append(label,levelLabel,save);form.addEventListener('submit',event=>{event.preventDefault();void run(()=>store.preferences(Number(minutes.value),level.value))});area.append(form);
  if(!snapshot.placement)area.append(el('p','No completed placement result yet. Start with your current course or choose a study level. You can take the placement test from All levels.'));
  if(!plan.tasks.length){area.append(el('p','No published lessons or saved mistakes are available yet for this level. Choose another study level or explore the courses.'));return}
  area.append(button('Start today’s plan',()=>{
   const task=plan.tasks[0];
   if(task.kind==='revision'){tab='notebook';filter='due';render();focusHeading()}else openLesson(task.unit,task.skill);
  }));
  const list=el('ol');
  for(const task of plan.tasks){
   const item=el('li',undefined,'hz-tracker-card');
   item.append(el('h5',`${task.title} · ${task.minutes} min`),el('p',task.reason));
   if(task.instructions)item.append(el('p',task.instructions));
   if(task.unit)item.append(el('p',task.unit.title),button(task.kind==='exercise'?'Open lesson for practice':'Open lesson',()=>openLesson(task.unit,task.skill),true));
   else item.append(button('Revise saved mistakes',()=>{tab='notebook';filter='due';render();focusHeading()},true));
   list.append(item);
  }
  area.append(list,el('p','Suggested times are estimates. If a lesson needs longer, continue next time; only the normal server-saved quiz marks lesson completion. Refresh this tracker after studying to see your updated plan.'));
 }
 function renderMastery(){
  area.append(el('h4','French mastery dashboard'),el('p',`Your study level: ${learningLevel(snapshot)}. You can choose any accessible course.`));
  if(snapshot.placement)area.append(el('p',`Latest placement recommends ${snapshot.placement.recommendedLevel}${snapshot.placement.provisional?' (provisional)':''}. This is a recommended starting point, not a certified proficiency level.`));
  const completed=snapshot.units.filter(u=>u.completed).length;
  area.append(el('p',`${completed} of ${snapshot.units.length} published lessons completed.`));
  const courseGrid=el('div',undefined,'hz-tracker-mastery-grid');
  for(const level of LEVELS){
   const units=snapshot.units.filter(u=>u.level===level),done=units.filter(u=>u.completed).length;
   const card=el('div',undefined,'hz-tracker-card');
   card.append(el('h5',`${level} · ${done}/${units.length} lessons completed`));
   const progress=el('progress');progress.max=units.length||1;progress.value=done;progress.setAttribute('aria-label',`${level} lesson completion`);card.append(progress);courseGrid.append(card);
  }
  area.append(courseGrid);
  area.append(el('h4','Strengths and skills to practise'));
  const skillGrid=el('div',undefined,'hz-tracker-mastery-grid');
  for(const skill of SKILLS){
   const evidence=skillEvidence(snapshot,skill),card=el('div',undefined,'hz-tracker-card');
   card.append(el('h5',skill));
   if(evidence.percent===null)card.append(el('p',`Not enough evidence yet (${evidence.total} checked practice items). Keep practising to build a picture.`));
   else{
    const label=evidence.percent>=80?'Current strength':evidence.percent<70?'Prioritize review':'Developing';
    card.append(el('p',`${label} · ${evidence.correct}/${evidence.total} correct (${evidence.percent}%) · ${evidence.source==='practice'?'latest checked answer per practice question':'placement sample'}.`));
    const meter=el('meter');meter.min=0;meter.max=100;meter.value=evidence.percent;meter.low=70;meter.high=80;meter.optimum=100;meter.setAttribute('aria-label',`${skill} checked answers correct`);card.append(meter);
   }
   skillGrid.append(card);
  }
  area.append(skillGrid);
  area.append(el('p','Skill tracking starts when this feature is enabled; older quizzes contribute course scores but cannot reconstruct past wrong answers. Unlabelled questions count as general practice, not invented skill scores.'));
  const general=snapshot.skills.find(s=>s.skill==='general');
  if(general?.total)area.append(el('p',`General practice: ${general.correct}/${general.total} latest checked answers correct. These items have no validated skill label.`));
 }
 function renderNotebook(){
  area.append(el('h4','Personal mistake notebook'),el('p','Missed answers are saved automatically after server grading. Review an explanation, retry, and return for spaced revision. Correct retries preserve your history.'));
  const options=el('select');options.setAttribute('aria-label','Notebook filter');
  for(const [value,label] of [['due','Due for revision'],['all','All saved mistakes'],['reviewed','Reviewed — scheduled later']]){const option=el('option',label);option.value=value;options.append(option)}options.value=filter;
  options.addEventListener('change',()=>{filter=options.value;page=0;render()});area.append(options);
  const due=dueMistakes(snapshot),dueKeys=new Set(due.map(n=>n.unitId+'|'+n.questionId));
  const items=snapshot.notebook.filter(n=>filter==='all'||(filter==='due'?dueKeys.has(n.unitId+'|'+n.questionId):!dueKeys.has(n.unitId+'|'+n.questionId)));
  const total=snapshot.notebookTotal??snapshot.notebook.length;
  area.append(el('p',`${total} saved mistakes · ${due.length} due in this group. Showing ${items.length} matching items from saved items ${(snapshot.notebookOffset||0)+(snapshot.notebook.length?1:0)}–${(snapshot.notebookOffset||0)+snapshot.notebook.length}.`));
  if(!items.length)area.append(el('p',filter==='due'?'No mistakes are due in this view. Continue your daily plan or check your reviewed items.':'No items in this view yet. Incorrect practice answers will appear here automatically.'));
  for(const entry of items.slice(page*20,page*20+20)){
   const card=el('article',undefined,'hz-tracker-card');
   card.append(el('h5',`${entry.level} · ${entry.title}`),el('p',revisionSummary(entry),'hz-revision-meta'),el('p',entry.prompt));
   const details=el('details');details.append(el('summary','Review saved answer and explanation'),el('p','Your last incorrect answer: '+entry.chosenAnswer),el('p','Correct answer at review: '+entry.correctAnswer),el('p',entry.explanation||'Revisit the lesson explanation.'));card.append(details);
   const form=el('form'),fieldset=el('fieldset');fieldset.append(el('legend','Try this question again'));
   const feedback=el('div',undefined,'hz-revision-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   const retry=button('Retry answer',()=>{
    const chosen=form.querySelector('input:checked');if(chosen)void reviseInline(entry,Number(chosen.value),card,fieldset,feedback,retry,continueButton);
   },true);retry.hidden=true;
   const continueButton=button('Continue revision',()=>{notice='';render();focusHeading()});continueButton.hidden=true;
   (entry.options||[]).forEach((option,i)=>{
    const label=el('label',undefined,'hz-tracker-option'),radio=el('input');radio.type='radio';radio.name='revision';radio.value=String(i);radio.required=true;
    radio.addEventListener('change',()=>{void reviseInline(entry,i,card,fieldset,feedback,retry,continueButton)});
    label.append(radio,el('span',option));fieldset.append(label);
   });
   form.append(fieldset,feedback,retry,continueButton,el('p','Choose an answer to check it immediately.','hz-small'));
   form.addEventListener('submit',event=>{
    event.preventDefault();
   });card.append(form,button('Revisit lesson',()=>openLesson({id:entry.unitId,level:entry.level}),true));area.append(card);
  }
  if(page>0)area.append(button('Previous page',()=>{page--;render();focusHeading()},true));
  if((page+1)*20<items.length)area.append(button('Next page',()=>{page++;render();focusHeading()},true));
  const offset=snapshot.notebookOffset||0;
  if(offset>0)area.append(button('Previous 200 saved items',()=>run(()=>store.snapshot(Math.max(0,offset-200))),true));
  if(offset+200<snapshot.notebookTotal)area.append(button('Next 200 saved items',()=>run(()=>store.snapshot(offset+200)),true));
 }
 launch.addEventListener('click',()=>{
  if(busy)return;epoch++;tab='plan';filter='due';notice='';root.dispatchEvent(new CustomEvent('hzad-close-placement'));
  chooser.classList.add('hz-hidden');render();focusHeading();void run(()=>store.snapshot());
 });
}
