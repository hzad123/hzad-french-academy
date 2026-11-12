import {makeReadingStore} from './store.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
export function wireTcfReading(root,client){
 const area=root.querySelector('#hz-tcf-reading'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeReadingStore(client);let selectedTestId,catalog,attempt,pending,viewer,visible=false,busy=false,epoch=0,controller,timer,offset=0,index=0,confirming=false;
 const remaining=()=>attempt?Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-offset)/1000)):0;
 function clear(){epoch++;visible=false;busy=false;controller?.abort();clearInterval(timer);confirming=false;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;pending=null;viewer=null;index=0;selectedTestId=null}
 globalThis.addEventListener?.('beforeunload',event=>{if(pending){event.preventDefault();event.returnValue=''}});
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset();if(session?.user?.id)viewer=session.user.id});
 function status(text,error=false){let n=area.querySelector('.hz-reading-status');if(!n){n=el('p',undefined,'hz-reading-status');area.append(n)}n.textContent=text;n.setAttribute('role',error?'alert':'status')}
 function controls(){area.querySelectorAll('button,input').forEach(n=>n.disabled=busy||n.dataset.locked==='true')}
 function button(text,fn,locked=false,alt=false){const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.dataset.locked=String(locked);b.onclick=fn;return b}
 function receive(next){attempt=next;offset=Date.parse(next.serverNow)-Date.now();if(pending?.id===next.id&&(next.status==='completed'||(next.answers[pending.number]??null)===pending.choice))pending=null}
 async function run(work){if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();try{await work(controller.signal,()=>visible&&ticket===epoch)}catch(e){if(visible&&ticket===epoch){if(attempt){try{const next=await store.read(attempt.id,controller.signal);if(ticket===epoch){receive(next);render()}}catch{}}if(ticket===epoch)status(e.name==='AbortError'?'Connection interrupted. Reopen your saved reading test.':e.message,true)}}finally{if(ticket===epoch){busy=false;controls()}}}
 async function open(id){root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');status('Opening TCF reading…');await run(async(signal,current)=>{const session=await client.auth.getSession();const user=session.data?.session?.user?.id;if(viewer&&user&&viewer!==user){pending=null;attempt=null}viewer=user;const next=await store.catalog(signal),saved=id?await store.read(id,signal):null;if(!current())return;catalog=next;if(saved)receive(saved);else attempt=null;index=pending&&saved&&pending.id===saved.id?pending.number-1:0;confirming=false;render()})}
 root.addEventListener('hzad-open-tcf-reading',()=>{void open()});
 function choose(number,choice){if(busy||pending||remaining()<=0)return;pending={id:attempt.id,number,choice,revision:attempt.revision};void saveChoice()}
 async function saveChoice(){if(!pending)return;await run(async(signal,current)=>{const local={...pending};const next=await store.answer(local.id,local.revision,local.number,local.choice,signal);if(!current())return;receive(next);render();status(next.status==='completed'?'Time ended. Showing your saved answers.':'Answer saved.')})}
 function navigate(fn){if(pending&&pending.id===attempt?.id){status('Save or reload your pending answer before leaving this test.',true);return}fn()}
 function move(number){index=number;confirming=false;render();const heading=area.querySelector('#hz-reading-question-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'})}
 function finish(){void run(async(signal,current)=>{const next=await store.submit(attempt.id,attempt.revision,signal);if(current()){receive(next);confirming=false;render();area.querySelector('.hz-reading-answer-sheet')?.scrollIntoView({block:'start'})}})}
 function render(){clearInterval(timer);area.replaceChildren();const head=el('header',undefined,'hz-exam-hero');head.append(el('p','TCF CANADA · COMPRÉHENSION ÉCRITE','hz-eyebrow'),el('h3',attempt?.paper.title||(catalog.tests.length===20?'TCF Reading · 20 tests':'TCF Reading · Test 01')));area.append(head);
  area.append(button('← TEF/TCF AI Tests',()=>navigate(()=>root.dispatchEvent(new CustomEvent('hzad-open-exams'))),false,true));
  if(pending&&attempt&&pending.id!==attempt.id)area.append(button('Recover unsaved answer from another test',()=>{void open(pending.id)}));
  if(!attempt){
   area.append(el('p','39 questions · 60 minutes · Choose one answer per question. You can change your choices before submitting. Your marked answer sheet and total score appear at the end.'));
   if(!catalog.tests.some(p=>p.id===selectedTestId))selectedTestId=catalog.tests[0].id;
   const select=el('select');select.id='hz-reading-paper';select.setAttribute('aria-label','Choose a TCF reading test');
   for(const p of catalog.tests){const option=el('option','Test '+p.id.slice(-2));option.value=p.id;option.selected=p.id===selectedTestId;select.append(option)}
   select.onchange=()=>{selectedTestId=select.value;render()};area.append(select);
   const paper=catalog.tests.find(p=>p.id===selectedTestId);
   area.append(button('Start Reading Test '+paper.id.slice(-2),()=>{void run(async(signal,current)=>{const next=await store.start(crypto.randomUUID(),paper,signal);if(current()){receive(next);index=0;render()}})},!!pending));
   if(pending)area.append(button('Recover unsaved answer',()=>{void open(pending.id)},false,true));
   const saved=el('section',undefined,'hz-writing-history');saved.append(el('h4','Your saved reading tests'));for(const row of catalog.history)saved.append(button(`Test ${row.testId.slice(-2)} · ${new Date(row.startedAt).toLocaleDateString()} · ${row.status==='completed'?'View answer sheet':'Resume test'}`,()=>{void open(row.id)},false,true));if(!catalog.history.length)saved.append(el('p','Your saved tests will appear here.'));area.append(saved);
  }else{
   if(attempt.status==='completed'){renderResults();area.append(button('Reading tests',()=>{void open()},false,true))}
   else {area.append(button('All reading tests',()=>navigate(()=>{void open()}),false,true));renderQuestion()}
  }
  const id=attempt?.id;recordView(root,'tcf-reading:'+(id||'home'),()=>open(id));controls();
 }
 function renderQuestion(){
  const answered=Object.keys(attempt.answers).length;
  const bar=el('div',undefined,'hz-reading-toolbar'),clock=el('strong');clock.setAttribute('aria-label','Reading time remaining');bar.append(el('span',`${answered}/39 answers saved`),clock);area.append(bar);
  const tick=()=>{const seconds=remaining();clock.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`;if(!seconds){area.querySelectorAll('input').forEach(n=>n.disabled=true);if(!busy){clearInterval(timer);void run(async(signal,current)=>{const next=await store.read(attempt.id,signal);if(current()){receive(next);render()}})}}};
  timer=setInterval(tick,1000);
  const nav=el('nav',undefined,'hz-reading-jump');nav.setAttribute('aria-label','Reading questions');
  for(let i=0;i<39;i++){const b=button(String(i+1),()=>move(i),false,true);b.setAttribute('aria-label',`Question ${i+1}${attempt.answers[i+1]?' · answered':''}`);if(i===index)b.setAttribute('aria-current','step');if(attempt.answers[i+1])b.classList.add('is-saved');nav.append(b)}area.append(nav);
  if(pending?.id===attempt.id){const box=el('div',undefined,'hz-reading-recovery');box.append(el('p',`Question ${pending.number}: your choice is waiting to be saved.`));
   const stale=pending.revision!==attempt.revision;
   box.append(button(stale?'Save my choice instead':'Retry saving answer',()=>{pending.revision=attempt.revision;void saveChoice()}),button('Use saved answer',()=>{pending=null;render()},false,true));area.append(box);
  }
  const q=attempt.paper.questions[index],card=el('section',undefined,'hz-reading-question');card.lang='fr';
  const title=el('h4',`Question ${q.number} sur 39`);title.id='hz-reading-question-title';title.tabIndex=-1;card.append(title,el('p',`${q.points} points`,'hz-small'));
  card.append(el('h5','Texte :'));const passage=el('div',undefined,'hz-reading-passage');for(const para of q.passage.split('\n\n'))passage.append(el('p',para));card.append(passage);
  const fieldset=el('fieldset'),legend=el('legend',q.question);fieldset.append(legend);
  q.options.forEach((text,i)=>{const letter=String.fromCharCode(65+i),label=el('label',undefined,'hz-reading-option'),input=el('input');input.type='radio';input.name='reading-'+q.number;input.value=letter;input.checked=(pending?.id===attempt.id&&pending.number===q.number?pending.choice:attempt.answers[q.number])===letter;input.dataset.locked=String(!!pending||!remaining());input.onchange=()=>choose(q.number,letter);label.append(input,el('span',letter+'. '+text));fieldset.append(label)});card.append(fieldset);area.append(card);
  const actions=el('div',undefined,'hz-reading-actions');actions.append(button('Previous',()=>move(index-1),index===0,true),button('Next',()=>move(index+1),index===38,true));area.append(actions);
  area.append(button('Submit reading test',()=>{confirming=true;render()},!!pending||!remaining()));
  if(confirming){const confirm=el('section',undefined,'hz-reading-confirm');confirm.setAttribute('aria-label','Confirm reading submission');confirm.append(el('h4','Submit your answers?'),el('p',`${39-answered} unanswered. You cannot change answers after submitting.`),button('Confirm submission',finish,!!pending),button('Keep working',()=>{confirming=false;render()},false,true));area.append(confirm)}
  tick();
 }
 function renderResults(){
  const result=attempt.result,sheet=el('section',undefined,'hz-reading-answer-sheet');sheet.append(el('h4','Your marked answer sheet'),el('strong',`${result.correct}/39 correct`,'hz-reading-score'),el('p',`${result.unanswered} unanswered · Practice score ${result.points}/${result.maxPoints} points`),el('p','Points follow this paper’s scoring bands.','hz-small'));
  for(const row of result.rows){const q=attempt.paper.questions[row.number-1],card=el('article',undefined,'hz-reading-correction '+(row.isCorrect?'is-correct':'is-incorrect'));card.lang='fr';
   card.append(el('h5',`Question ${row.number} · ${row.isCorrect?'✓ Correct':row.selected?'✕ Incorrect':'— Unanswered'} · ${row.points}/${row.maxPoints} points`),el('p',q.question));
   const list=el('ul');q.options.forEach((text,i)=>{const letter=String.fromCharCode(65+i),correct=letter===row.correct,selected=letter===row.selected,option=el('li',`${letter}. ${text}${correct?' · ✓ Correct answer':''}${selected?' · Your answer':''}`,correct?'is-correct':selected?'is-incorrect':'');list.append(option)});card.append(list);if(!row.selected)card.append(el('p','Your answer: unanswered.'));card.append(el('p',row.explanation));
   const source=el('details');source.append(el('summary','Revoir le texte'));for(const para of q.passage.split('\n\n'))source.append(el('p',para));card.append(source);sheet.append(card);
  }
  sheet.append(el('strong',`Total score: ${result.correct}/39 correct · ${result.points}/${result.maxPoints} points`,'hz-reading-total'));area.append(sheet);
 }
 return {open,reset};
}
