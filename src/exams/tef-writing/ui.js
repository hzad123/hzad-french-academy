import {makeTefWritingStore} from './store.js';
import {recordView} from '../../ui/navigation.js';
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn,alt=false)=>{const b=make('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
const words=s=>s.trim()?s.trim().split(/\s+/u).length:0;
const displayTime=n=>String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')+':'+String(Math.max(0,n)%60).padStart(2,'0');
export function wireTefWriting(root,client,{fetcher}={}){
 const area=root.querySelector('#hz-tef-writing'),chooser=root.querySelector('#hz-course-chooser');
 if(!area)return;
 const store=makeTefWritingStore(client,fetcher);
 let catalog=null,attempt=null,local=null,visible=false,busy=false,dirty=false,conflict=false,epoch=0,abort=null,timer=null,saveTimer=null,serverOffset=0,currentSection=0,viewer=null;
 const notify=(message,error=false)=>{let n=area.querySelector('.hz-tef-writing-status');if(!n){n=make('p',undefined,'hz-tef-writing-status');area.append(n)}n.textContent=message;n.setAttribute('role',error?'alert':'status')};
 function clear(){
  epoch++;visible=false;busy=false;abort?.abort();clearTimeout(saveTimer);clearInterval(timer);abort=null;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden');
 }
 function reset(){clear();catalog=null;attempt=null;local=null;dirty=false;conflict=false}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'){viewer=null;reset()}else if(session?.user?.id){if(viewer&&viewer!==session.user.id)reset();viewer=session.user.id}});
 globalThis.addEventListener?.('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
 function controls(){area.querySelectorAll('button').forEach(b=>{if(b.dataset.locked==='true'||busy)b.disabled=true;else b.disabled=false})}
 async function run(task){
  if(busy)return;
  busy=true;abort=new AbortController();const ticket=epoch;controls();
  try{await task(abort.signal,()=>ticket===epoch&&visible)}
  catch(e){if(ticket===epoch&&visible)notify(e.name==='AbortError'?'Connection interrupted. Reopen the saved test before retrying.':e.message||'An error occurred.',true)}
  finally{if(ticket===epoch){busy=false;controls()}}
 }
 function receive(next,{restore=true}={}){
  if(restore&&local?.id===next.id&&dirty&&JSON.stringify(local.responses)!==JSON.stringify(next.responses)){attempt=next;conflict=true;return}
  attempt=next;local={id:next.id,revision:next.revision,responses:[...next.responses]};
  serverOffset=Date.parse(next.serverNow)-Date.now();dirty=false;conflict=false;
 }
 async function open(id){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;chooser.classList.add('hz-hidden');area.classList.remove('hz-hidden');
  area.append(make('p','Opening TEF Canada writing…'));
  await run(async(signal,current)=>{
   const session=await client.auth.getSession();const uid=session.data?.session?.user?.id;
   if(viewer&&uid&&viewer!==uid){dirty=false;local=null}viewer=uid||viewer;
   const next=await store.catalog(signal),saved=id?await store.read(id,signal):null;
   if(!current())return;catalog=next;if(saved)receive(saved);else{attempt=null;dirty=false;local=null}render();
  });
 }
 root.addEventListener('hzad-open-tef-writing',()=>{void open()});
 function header(){
  const head=make('header',undefined,'hz-exam-hero');head.append(make('p','TEF CANADA · EXPRESSION ÉCRITE','hz-eyebrow'),make('h3',attempt?'TEF Writing · Test '+attempt.testId.slice(-2):'TEF Writing · 20 tests'),make('p','Two timed sections · 60 minutes · Original practice papers'));
  area.append(head,button('← TEF/TCF AI Tests',()=>{if(dirty){void run(async(signal,current)=>{await save(signal,current);if(current())root.dispatchEvent(new CustomEvent('hzad-open-exams'))})}else root.dispatchEvent(new CustomEvent('hzad-open-exams'))},true));
  if(attempt)area.append(button('All 20 writing tests',()=>{if(dirty){void run(async(signal,current)=>{await save(signal,current);if(current())await open()})}else void open()},true));
 }
 function render(){
  clearInterval(timer);area.replaceChildren();area.classList.remove('hz-hidden');header();
  if(!attempt)renderCatalog();else renderAttempt();
  const id=attempt?.id;recordView(root,'tef-writing:'+(id||'home'),()=>open(id));controls();
 }
 function renderCatalog(){
  area.append(make('p','Section A: complete a newspaper story (25 minutes, at least 80 words). Section B: write an opinion letter with three arguments (35 minutes, at least 200 words). Select any test to begin.','hz-tef-explainer'));
  const grid=make('div',undefined,'hz-writing-tests');
  for(const paper of catalog.tests){
   const card=make('article',undefined,'hz-writing-test hz-tef-test-card');
   card.append(make('span','TEST '+paper.id.slice(-2),'hz-eyebrow'),make('h4',paper.title));
   card.append(make('p','A · '+paper.sections[0].title+'   /   B · '+paper.sections[1].title,'hz-small'));
   const hasOpen=catalog.history.some(h=>h.testId===paper.id&&h.version===catalog.version&&h.status==='draft'&&Date.parse(h.deadline)>Date.now());
   card.append(button((hasOpen?'Resume':'Start')+' Test '+paper.id.slice(-2),()=>start(paper.id)));grid.append(card);
  }
  area.append(grid);
  const history=make('section',undefined,'hz-writing-history');history.append(make('h4','Your saved TEF writing tests'));
  for(const h of catalog.history)history.append(button('Test '+h.testId.slice(-2)+' · '+new Date(h.startedAt).toLocaleDateString()+' · '+(h.reviewStatus==='completed'?'View AI feedback':h.status==='submitted'?'Check feedback':'Resume'),()=>{void open(h.id)},true));
  if(!catalog.history.length)history.append(make('p','Your writing and AI feedback will appear here.'));
  area.append(history);
 }
 function start(testId){
  void run(async(signal,current)=>{
   const next=await store.send({kind:'start',id:crypto.randomUUID(),testId,version:catalog.version},signal);
   if(current()){receive(next);render()}
  });
 }
 function phase(){
  if(attempt.status==='submitted')return 2;
  const elapsed=(Date.now()+serverOffset-Date.parse(attempt.startedAt))/1000;
  return elapsed>=1500?1:0;
 }
 function remaining(){
  const now=Date.now()+serverOffset;
  const deadline=phase()===0?Date.parse(attempt.startedAt)+1500000:Date.parse(attempt.deadline);
  return Math.max(0,Math.ceil((deadline-now)/1000));
 }
 function schedule(){
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!visible||busy||conflict){if(busy&&dirty)schedule();return}void run(async(signal,current)=>{await save(signal,current);if(current()&&dirty)schedule()})},750);
 }
 async function save(signal,current){
  if(!dirty||attempt.status!=='draft')return;
  if(conflict)throw Error('Your saved writing changed in another tab. Reopen the attempt.');
  const outgoing=[...local.responses],expected=local.revision;
  const next=await store.send({kind:'save',id:attempt.id,revision:expected,responses:outgoing},signal);
  if(!current()||attempt.id!==next.id)return;
  attempt=next;serverOffset=Date.parse(next.serverNow)-Date.now();local.revision=next.revision;
  dirty=JSON.stringify(local.responses)!==JSON.stringify(outgoing);
  notify(dirty?'Saving latest changes…':'Responses saved.');
 }
 function renderAttempt(){
  const paper=attempt.paper||catalog.tests.find(t=>t.id===attempt.testId);
  if(!paper){notify('This saved TEF paper could not be opened.',true);return}
  const locked=attempt.status==='submitted';
  if(conflict){
   notify('Your saved answers changed in another tab. Reopen to choose the latest version.',true);
   area.append(button('Reload saved responses',()=>{local={id:attempt.id,revision:attempt.revision,responses:[...attempt.responses]};dirty=false;conflict=false;render()},true));
   return;
  }
  const toolbar=make('div',undefined,'hz-writing-toolbar hz-tef-timer');
  const phaseLabel=make('strong'),clock=make('strong');clock.setAttribute('aria-label','TEF section time remaining');
  toolbar.append(phaseLabel,clock);area.append(toolbar);
  const phaseNow=phase();currentSection=phaseNow;
  if(!locked){
   const update=()=>{
    const p=phase();phaseLabel.textContent=p===0?'Section A · 25 minutes': 'Section B · 35 minutes';
    clock.textContent=displayTime(remaining())+' remaining';
    if(p!==currentSection){if(dirty){notify('Section A time finished. Only text saved before its deadline can be marked.',true)}currentSection=p;render()}
    if(!remaining()){clearInterval(timer);area.querySelectorAll('textarea').forEach(x=>x.disabled=true);notify('Time finished. Submit your saved responses for feedback.')}
   };
   update();timer=setInterval(update,1000);
  }else{phaseLabel.textContent='Both sections completed';clock.textContent='Submitted'}
  const progress=make('div',undefined,'hz-tef-section-progress');
  for(const s of paper.sections){const chip=make('span','SECTION '+s.letter+(locked?' · Completed':s.letter===(phaseNow===0?'A':'B')?' · In progress':' · '+(s.letter==='A'?'Closed':'Up next')));chip.className='hz-tef-progress-chip';progress.append(chip)}
  area.append(progress);
  paper.sections.forEach((section,i)=>{
   const wrapper=make('section',undefined,'hz-tef-task');
   const title=make('h4','SECTION '+section.letter+' · '+section.title);
   const meta=make('p',(section.seconds/60)+' minutes · '+section.minWords+' mots minimum','hz-tef-section-meta');
   wrapper.append(title,meta);
   if(i===0){
    wrapper.append(make('p','Type de document : début d’un article de presse (faits-divers).'));
    const prompt=make('blockquote',section.city+', France — '+section.lead);prompt.lang='fr';wrapper.append(prompt);
   }else{
    wrapper.append(make('p','Vous avez lu dans un journal l’affirmation suivante :'));
    const statement=make('blockquote','« '+section.statement+' »');statement.lang='fr';wrapper.append(statement);
   }
   wrapper.append(make('p',section.instruction));
   const label=make('label','Votre réponse — Section '+section.letter);
   const editor=make('textarea');editor.rows=i===0?8:13;editor.lang='fr';editor.maxLength=5000;editor.spellcheck=false;editor.value=local.responses[i];
   const isOpen=!locked&&phaseNow===i&&remaining()>0;
   editor.disabled=!isOpen;editor.setAttribute('aria-label','Réponse section '+section.letter);label.append(editor);wrapper.append(label);
   const tally=make('p',undefined,'hz-writing-count');
   const update=()=>{const n=words(editor.value);tally.textContent=n+' mots · '+section.minWords+' mots minimum';tally.classList.toggle('is-outside-range',n<section.minWords)};
   editor.addEventListener('input',()=>{
    local.responses[i]=editor.value;dirty=true;update();notify('Unsaved changes…');schedule();
   });editor.addEventListener('blur',()=>{if(dirty&&isOpen)schedule()});update();wrapper.append(tally);
   if(!isOpen&&!locked)wrapper.append(make('p',i===0?'Section A is closed after 25 minutes.':'Section B opens automatically when Section A time ends.','hz-small'));
   area.append(wrapper);
  });
  if(locked&&attempt.result){renderResult(attempt.result);return}
  if(attempt.reviewStatus==='dispatched'){area.append(button('Check saved feedback',()=>{void open(attempt.id)}));notify('AI assessment is processing. Check your saved feedback; do not resubmit.');return}
  const credits=catalog.credits,wallet=catalog.wallet,costOk=Number.isSafeInteger(credits)&&credits>0&&catalog.enabled&&wallet&&wallet.available>=credits&&wallet.budgetAvailable&&Date.parse(wallet.expiresAt)>Date.now();
  if(attempt.reviewStatus==='failed'){
   notify('AI marking failed. Your response was saved and its reserved credits were returned.',true);
   const retry=button('Retry saved feedback · '+credits+' AI credit'+(credits===1?'':'s'),()=>{void review('retry')});
   retry.dataset.locked=String(!costOk);area.append(retry);return;
  }
  if(!locked&&remaining()>0)area.append(button('Save my writing',()=>{void run(async(signal,current)=>{await save(signal,current)})},true));
  const note=make('p',credits?'AI feedback for both sections costs '+credits+' credit'+(credits===1?'':'s')+'. Saved feedback can be reopened free.':'AI feedback is currently unavailable. Your responses remain saved.','hz-small');
  area.append(note);
  const submit=button('Submit both sections for AI feedback'+(credits?' · '+credits+' credit'+(credits===1?'':'s'):''),()=>{void review('review')});
  submit.dataset.locked=String(!costOk||(!locked&&phaseNow===0)||conflict);
  area.append(submit);
  if(!costOk)notify('AI marking is unavailable or credits are insufficient. Your writing is saved.');
 }
 function review(kind){
  if(busy||conflict)return;
  if(local.responses.some((x,i)=>words(x)<attempt.paper.sections[i].minWords)){notify('Complete both sections and meet the 80-word and 200-word minimums before requesting feedback.',true);return}
  void run(async(signal,current)=>{
   if(kind==='review'&&dirty&&attempt.status==='draft'&&remaining()>0)await save(signal,current);
   if(!current())return;
   let next;
   try{next=await store.send(kind==='retry'?{kind:'retry',id:attempt.id,expectedCredits:catalog.credits}:{kind:'review',id:attempt.id,expectedCredits:catalog.credits},signal)}
   catch(error){try{const saved=await store.read(attempt.id,signal);if(current()){receive(saved);render()}}catch{}throw error}
   if(!current())return;
   if(next.processing&&!next.id){notify(next.error||'Assessment processing. Check saved feedback.');return}
   receive(next);render();
  });
 }
 function renderResult(result){
  const wrapper=make('section',undefined,'hz-writing-feedback');wrapper.append(make('h4','Your TEF writing result'));
  const resultCard=make('div',undefined,'hz-writing-score');
  if(result.score!==null){
   const score=make('div');score.append(make('span','Estimated TEF writing practice score'),make('strong',String(result.score)+'/699'));
   const nclc=make('div');nclc.append(make('span','Estimated NCLC level'),make('strong',result.nclc==='Below 4'?'Below NCLC 4':'NCLC '+result.nclc));
   resultCard.append(score,nclc);
  }else resultCard.append(make('strong','Task requirements not met'),make('span','An estimated TEF/NCLC result is unavailable.'));
  wrapper.append(resultCard,make('p',result.scoreReason));
  for(const c of result.constraints)if(c.status!=='within-range')wrapper.append(make('p','Section '+c.section+': '+c.words+' words; minimum '+c.minWords+'.','hz-writing-issue'));
  const criteria=make('section',undefined,'hz-writing-criteria');criteria.append(make('h4','What to fix · TEF writing criteria'));
  const labels={linguistic:'Language accuracy and range',pragmatic:'Task completion and coherence',sociolinguistic:'Register and appropriateness'};
  for(const item of result.criteria){
   const row=make('article',undefined,'hz-writing-criterion');row.append(make('h5',labels[item.id]||item.id),make('p',item.reason));
   for(const e of item.evidence)row.append(make('blockquote','Section '+(e.task===1?'A':'B')+': « '+e.quote+' »'));
   if(item.improvement?.trim())row.append(make('h6','How to improve'),make('p',item.improvement,'hz-writing-next-step'));
   criteria.append(row);
  }wrapper.append(criteria);
  for(const item of result.tasks){
   const card=make('article',undefined,'hz-writing-corrections');card.append(make('h4','Section '+(item.number===1?'A':'B')+' · Mistakes'));
   for(const m of item.mistakes){const correction=make('div',undefined,'hz-writing-correction');correction.append(make('del',m.original),make('ins',m.corrected),make('p',m.explanation));card.append(correction)}
   for(const issue of item.issues)card.append(make('p',issue,'hz-writing-issue'));
   if(!item.onTopic)card.append(make('p','This section did not address its assigned topic.','hz-writing-issue'));
   if(!item.mistakes.length&&!item.issues.length&&item.onTopic)card.append(make('p','No mistakes identified.'));
   wrapper.append(card);
  }area.append(wrapper);
 }
 return {open};
}
