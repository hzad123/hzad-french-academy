import {makeWritingStore} from './store.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn,alt=false)=>{const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b};
const words=text=>text.trim()?text.trim().split(/\s+/u).length:0;
export function wireTcfWriting(root,client,{fetcher}={}){
 const area=root.querySelector('#hz-tcf-writing'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeWritingStore(client,fetcher);let catalog=null,attempt=null,local=null,visible=false,busy=false,epoch=0,controller=null,timer=null,saveTimer=null,viewer=null,dirty=false,conflict=false,remaining=0,clockOffset=0;
 function clear(){epoch++;visible=false;busy=false;controller?.abort();clearInterval(timer);clearTimeout(saveTimer);area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;local=null;dirty=false;conflict=false;viewer=null}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT')reset();else if(session?.user?.id){if(viewer&&viewer!==session.user.id)reset();viewer=session.user.id}});
 globalThis.addEventListener?.('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
 function status(text,error=false){let n=area.querySelector('.hz-writing-status');if(!n){n=el('p',undefined,'hz-writing-status');area.append(n)}n.textContent=text;n.setAttribute('role',error?'alert':'status');if(error){n.tabIndex=-1;n.focus({preventScroll:true});n.scrollIntoView({block:'center'})}}
 function controls(){area.querySelectorAll('button').forEach(b=>b.disabled=busy||b.dataset.locked==='true')}
 async function run(work){if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();try{await work(controller.signal,()=>visible&&ticket===epoch)}catch(e){if(visible&&ticket===epoch)status(e.name==='AbortError'?'Connection interrupted. Reopen the saved attempt before sending again.':e.message,true)}finally{if(ticket===epoch){busy=false;controls()}}}
 function receive(next,{restore=false}={}){
  attempt=next;clockOffset=Date.parse(next.serverNow)-Date.now();
  if(restore){
   if(local?.id===next.id&&dirty&&next.status==='draft'&&JSON.stringify(local.responses)!==JSON.stringify(next.responses)){
    conflict=local.revision!==next.revision;return;
   }
   local={id:next.id,revision:next.revision,responses:[...next.responses]};dirty=false;conflict=false;
  }
 }
 async function open(id){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;chooser.classList.add('hz-hidden');area.classList.remove('hz-hidden');area.append(el('p','Opening TCF writing…'));
  await run(async(signal,current)=>{
   const session=await client.auth.getSession();const idNow=session.data?.session?.user?.id;if(viewer&&idNow&&viewer!==idNow){local=null;dirty=false}viewer=idNow||viewer;
   const next=await store.catalog(signal),saved=id?await store.read(id,signal):null;if(!current())return;catalog=next;
   if(saved)receive(saved,{restore:true});else attempt=null;render();
  });
 }
 root.addEventListener('hzad-open-tcf-writing',()=>{void open()});
 async function save(signal,current){
  if(!dirty||attempt?.status!=='draft')return;
  if(conflict)throw Error('Choose which responses to keep before saving.');
  if(Date.parse(attempt.deadline)<=Date.now()+clockOffset)throw Error('Time has ended. Your last saved responses are ready to submit.');
  const sent=[...local.responses],id=attempt.id;
  let next;
  try{next=await store.send({kind:'save',id,revision:attempt.revision,responses:sent},signal)}catch(error){
   if(/another tab|changed in/i.test(error.message)){try{const saved=await store.read(id,signal);if(current()){receive(saved,{restore:true});render()}}catch{}}
   throw error;
  }
  if(!current()||attempt?.id!==id)return;
  receive(next);local.revision=next.revision;dirty=JSON.stringify(local.responses)!==JSON.stringify(sent);
  status(dirty?'Saving your latest changes…':'All three responses saved.');
 }
 function schedule(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
  if(!visible||conflict)return;if(busy){schedule();return}
  void run(async(signal,current)=>{await save(signal,current);if(dirty&&current())schedule()});
 },900)}
 function nav(fn){if(conflict){status('Choose which responses to keep before leaving this test.',true);return}void run(async(signal,current)=>{if(dirty&&remaining>0)await save(signal,current);if(current()){busy=false;await fn()}})}
 function header(title){const h=el('header',undefined,'hz-exam-hero');h.append(el('p','TCF CANADA · EXPRESSION ÉCRITE','hz-eyebrow'),el('h3',title));area.append(h,button('← TEF/TCF AI Tests',()=>nav(()=>root.dispatchEvent(new CustomEvent('hzad-open-exams'))),true));if(attempt)area.append(button('All 20 writing tests',()=>nav(()=>open()),true))}
 function start(testId){void run(async(signal,current)=>{const next=await store.send({kind:'start',id:crypto.randomUUID(),testId,version:catalog.version},signal);if(current()){receive(next,{restore:true});render()}})}
 function render(){
  clearInterval(timer);area.replaceChildren();header(attempt?`TCF Writing · Test ${attempt.testId.slice(-2)}`:'TCF Writing · 20 tests');
  if(!attempt){
   area.append(el('p','Three tasks · 60 minutes per test. Write your responses, then submit all three for mistake feedback and an estimated TCF/NCLC writing result.'));
   const grid=el('div',undefined,'hz-writing-tests');
   for(const test of catalog.tests){const card=el('article',undefined,'hz-writing-test');card.append(el('span','TEST '+test.id.slice(-2),'hz-eyebrow'),el('h4',test.title));const list=el('ol');for(const task of test.tasks)list.append(el('li',task.title));const resumable=catalog.history.some(row=>row.testId===test.id&&(!row.version||row.version===catalog.version)&&row.status==='draft'&&Date.parse(row.deadline)>Date.now());card.append(list,button((resumable?'Resume Test ':'Start Test ')+test.id.slice(-2),()=>start(test.id)));grid.append(card)}area.append(grid);
   const history=el('section',undefined,'hz-writing-history');history.append(el('h4','Your saved writing tests'));
   for(const row of catalog.history)history.append(button(`Test ${row.testId.slice(-2)} · ${new Date(row.startedAt).toLocaleDateString()} · ${row.version&&row.version!==catalog.version?'Previous paper · ':''}${row.reviewStatus==='completed'?'View feedback':row.reviewStatus==='failed'?'Saved responses':row.status==='submitted'?'Check feedback':'Resume writing'}`,()=>{void open(row.id)},true));
   if(!catalog.history.length)history.append(el('p','Your responses and feedback will appear here.'));area.append(history);
  }else renderAttempt();
  const id=attempt?.id;recordView(root,'tcf-writing:'+(id||'home'),()=>open(id));controls();
 }
 function renderAttempt(){
  const test=attempt.paper||catalog.tests.find(t=>t.id===attempt.testId);if(!test){status('This test version could not be opened.',true);return}
  if(conflict){
   status('Saved responses changed in another tab. Your unsaved text is still in the editors. Choose which version to keep.',true);
   area.append(button('Keep my text',()=>{conflict=false;local.revision=attempt.revision;void run(async(signal,current)=>{await save(signal,current);if(current())render()})},true),button('Use saved responses',()=>{conflict=false;dirty=false;local={id:attempt.id,revision:attempt.revision,responses:[...attempt.responses]};render()},true));
  }
  const locked=attempt.status!=='draft',bar=el('div',undefined,'hz-writing-toolbar'),clock=el('strong');clock.setAttribute('aria-label','Writing time remaining');bar.append(el('span','Tâches 1, 2 et 3'),clock);area.append(bar);
  function tick(){remaining=Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-clockOffset)/1000));clock.textContent=locked?'Submitted':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} remaining`;if(!locked&&!remaining){area.querySelectorAll('textarea').forEach(n=>n.disabled=true);clearTimeout(saveTimer);if(dirty)status('Time has ended. Only the last saved responses can be marked.',true);else status('Time has ended. Submit your saved responses when ready.')}}
  const jump=el('nav',undefined,'hz-writing-jump');jump.setAttribute('aria-label','Writing tasks');for(const task of test.tasks)jump.append(button('Tâche '+task.number,()=>{const target=area.querySelector('#hz-writing-response-'+task.number);target.closest('details').open=true;target.scrollIntoView({block:'center',behavior:'smooth'});target.focus()},true));area.append(jump);
  for(const task of test.tasks){
   const group=el('details',undefined,'hz-writing-task');group.open=true;const summary=el('summary',`Tâche ${task.number} · ${task.title}`);group.append(summary);
   const prompt=el('div',undefined,'hz-writing-prompt');prompt.lang='fr';
   if(task.subject)prompt.append(el('h4','Sujet :'),el('p',task.subject));
   if(task.context){prompt.append(el('h4','Message reçu'),el('blockquote',task.context))}
   if(task.documents){const docs=el('div',undefined,'hz-writing-documents');task.documents.forEach((text,i)=>{const doc=el('article');doc.append(el('h4','Document '+(i+1)),el('p',text));docs.append(doc)});prompt.append(docs)}
   prompt.append(el('h4','Consigne :'),el('p',task.instruction),el('p',`(${task.minWords} mots minimum / ${task.maxWords} mots maximum)`,'hz-writing-word-range'));group.append(prompt);
   const count=el('p',undefined,'hz-writing-count');count.id='hz-writing-count-'+task.number;
   const label=el('label','Votre réponse — Tâche '+task.number),input=el('textarea');input.id='hz-writing-response-'+task.number;input.rows=10;input.maxLength=3500;input.lang='fr';input.spellcheck=false;input.value=local.responses[task.number-1];input.disabled=locked;input.setAttribute('aria-describedby',count.id);
   const update=()=>{const n=words(input.value);count.textContent=`${n} mots · ${task.minWords}–${task.maxWords} mots attendus`;count.classList.toggle('is-outside-range',n<task.minWords||n>task.maxWords)};update();
   input.addEventListener('input',()=>{local.responses[task.number-1]=input.value;dirty=true;update();status('Unsaved changes…');schedule()});input.addEventListener('blur',()=>{if(dirty&&remaining>0)schedule()});label.append(input);group.append(label,count);area.append(group);
  }
  tick();if(!locked)timer=setInterval(tick,1000);
  if(attempt.result){renderResult(attempt.result);return}
  if(attempt.reviewStatus==='failed'){status('AI marking failed. Your responses are saved and the assessment credits were returned.',true);return}
  if(attempt.reviewStatus==='dispatched'||attempt.processing){area.append(button('Check saved feedback',()=>{void open(attempt.id)}));status('Your writing assessment is processing. Check saved feedback before sending again.');return}
  if(!locked)area.append(button('Save responses',()=>{void run((signal,current)=>save(signal,current))},true));
  const quote=Number.isSafeInteger(catalog.credits)?catalog.credits:null;
  area.append(el('p',quote?`${quote} AI credits for one assessment of all three tasks. Viewing saved feedback costs no additional credits.`:'AI marking is being prepared. You can write and save all 20 tests.','hz-small'));
  const submit=button(`Get AI feedback${quote?' · '+quote+' credits':''}`,()=>{
   if(!locked&&remaining>0&&local.responses.some(s=>!s.trim())){status('Complete all three tasks before submitting.',true);return}
   void run(async(signal,current)=>{
    if(dirty&&remaining>0)await save(signal,current);if(!current())return;
    let next;
    try{next=await store.send({kind:'review',id:attempt.id,expectedCredits:quote},signal)}catch(error){
     // Read-only reconciliation: never repeat a paid request automatically.
     try{const saved=await store.read(attempt.id,signal);if(current()){receive(saved,{restore:true});render()}}catch{}
     throw error;
    }
    if(!current())return;
    if(next.processing&&!next.id){status(next.error||'Your writing assessment is processing. Reopen this attempt before retrying.');return}
    receive(next,{restore:true});render();
   });
  });
  const wallet=catalog.wallet;
  submit.dataset.locked=String(conflict||!catalog.enabled||!quote||!wallet||wallet.available<quote||!wallet.budgetAvailable||Date.parse(wallet.expiresAt)<=Date.now());area.append(submit);
  if(catalog.enabled&&quote&&wallet&&(wallet.available<quote||!wallet.budgetAvailable||Date.parse(wallet.expiresAt)<=Date.now()))status('A paid AI credit top-up is needed for marking. Your writing is still saved.');
 }
 function renderResult(result){
  const section=el('section',undefined,'hz-writing-feedback');section.append(el('h4','Your writing result'));
  const score=el('div',undefined,'hz-writing-score');
  if(result.score!==null)score.append(el('strong',`${result.score}/20`),el('span','Estimated TCF writing'),el('strong',result.nclc==='Below 4'?'Below NCLC 4':'NCLC '+result.nclc));
  else score.append(el('strong','Task requirements not met'),el('span','TCF/NCLC estimate unavailable'));
  section.append(score,el('p',result.scoreReason));
  for(const c of result.constraints)if(c.status!=='within-range')section.append(el('p',`Tâche ${c.task}: ${c.status==='missing'?'not attempted':c.words<c.minWords?'below the word minimum':'above the word maximum'} (${c.words}/${c.minWords}–${c.maxWords} words).`,'hz-writing-issue'));
  const criteria=el('details');criteria.append(el('summary','Marking criteria'));
  const names={linguistic:'Language control',pragmatic:'Task fulfilment and coherence',sociolinguistic:'Audience and register'};
  for(const c of result.criteria){const item=el('article');item.append(el('h5',names[c.id]),el('p',c.reason));for(const e of c.evidence)item.append(el('blockquote',`Tâche ${e.task}: « ${e.quote} »`));criteria.append(item)}section.append(criteria);
  for(const t of result.tasks){const card=el('article',undefined,'hz-writing-corrections');card.append(el('h4','Tâche '+t.number+' · Mistakes'));
   for(const m of t.mistakes){const item=el('div',undefined,'hz-writing-correction');item.append(el('del',m.original),el('ins',m.corrected),el('p',m.explanation));card.append(item)}
   for(const issue of t.issues)card.append(el('p',issue,'hz-writing-issue'));
   if(!t.onTopic)card.append(el('p','The response does not address the assigned topic.','hz-writing-issue'));
   if(!t.mistakes.length&&!t.issues.length&&t.onTopic)card.append(el('p','No mistakes identified.'));section.append(card);
  }
  area.append(section);
 }
 return {open};
}
