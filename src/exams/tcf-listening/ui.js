import {makeListeningStore} from './store.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const MEDIA='https://hzad123.github.io/hzad-french-academy/assets/tcf-listening/v1/';
export function wireTcfListening(root,client,{audioFactory=()=>new Audio(),assetBase=MEDIA}={}){
 const area=root.querySelector('#hz-tcf-listening'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeListeningStore(client);let catalog,attempt,viewer,visible=false,busy=false,epoch=0,controller,timer,offset=0,pending,confirming=false,ready=false,player,unlockedAudio,audioKey='',preload,windowNotice;
 const now=()=>Date.now()+offset,remaining=()=>attempt?Math.max(0,Math.ceil((Date.parse(attempt.deadline)-now())/1000)):0;
 const q=()=>attempt?.paper.questions[(attempt.currentQuestion||1)-1];
 const elapsed=()=>Math.max(0,(now()-Date.parse(attempt.questionStartedAt))/1000);
 const media=(folder,file)=>assetBase+folder+'/'+encodeURIComponent(file);
 function stopAudio(){player?.pause();player=null;preload?.pause();preload=null;audioKey=''}
 function clear(){epoch++;visible=false;busy=false;controller?.abort();clearInterval(timer);stopAudio();confirming=false;area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;pending=null;viewer=null;ready=false;unlockedAudio=null}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset();if(session?.user?.id)viewer=session.user.id});
 globalThis.addEventListener?.('beforeunload',event=>{if(pending){event.preventDefault();event.returnValue=''}});
 function status(text,error=false){let n=area.querySelector('.hz-listening-status');if(!n){n=el('p',undefined,'hz-listening-status');area.append(n)}n.textContent=text;n.setAttribute('role',error?'alert':'status')}
 function controls(){area.querySelectorAll('button,input').forEach(n=>n.disabled=busy||n.dataset.locked==='true')}
 function button(text,fn,locked=false,alt=false){const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.dataset.locked=String(locked);b.onclick=fn;return b}
 function receive(next){attempt=next;offset=Date.parse(next.serverNow)-Date.now();if(pending&&(next.status==='completed'||(next.answers[pending.number]??null)===pending.choice))pending=null;if(pending&&pending.number!==next.currentQuestion){pending=null;windowNotice='That question has ended. Its last saved answer is kept.'}}
 async function run(work){if(busy)return;busy=true;const ticket=epoch;controller=new AbortController();controls();try{await work(controller.signal,()=>visible&&ticket===epoch)}catch(error){if(visible&&ticket===epoch){if(attempt){try{const saved=await store.read(attempt.id,controller.signal);if(ticket===epoch){receive(saved);render()}}catch{}}if(ticket===epoch)status(error.name==='AbortError'?'Connection interrupted. Reopen your saved listening test.':error.message,true)}}finally{if(ticket===epoch){busy=false;controls()}}}
 async function open(id){root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');status('Opening TCF listening…');await run(async(signal,current)=>{const session=await client.auth.getSession();viewer=session.data?.session?.user?.id;const nextCatalog=await store.catalog(signal),saved=id?await store.read(id,signal):null;if(!current())return;catalog=nextCatalog;if(saved)receive(saved);else attempt=null;render()})}
 root.addEventListener('hzad-open-tcf-listening',()=>{void open()});
 function begin(){stopAudio();void run(async(signal,current)=>{const next=await store.start(crypto.randomUUID(),catalog.tests[0],signal);if(current()){receive(next);render()}})}
 function saveChoice(){if(!pending)return;void run(async(signal,current)=>{const p={...pending};const next=await store.answer(p.id,p.revision,p.number,p.choice,signal);if(current()){receive(next);render();status('Answer saved.')}})}
 function choose(number,choice){if(busy||pending||!remaining()||now()>=Date.parse(attempt.questionEndsAt))return;pending={id:attempt.id,revision:attempt.revision,number,choice};saveChoice()}
 function finish(){void run(async(signal,current)=>{const next=await store.submit(attempt.id,attempt.revision,signal);if(current()){receive(next);confirming=false;render();area.querySelector('.hz-reading-answer-sheet')?.scrollIntoView({block:'start'})}})}
 function playCurrent(){
  if(attempt?.status!=='active')return;const item=q(),key=attempt.id+':'+item.number;if(key===audioKey)return;stopAudio();audioKey=key;
  if(elapsed()>=item.audioSeconds)return;
  const audio=unlockedAudio||(unlockedAudio=audioFactory());player=audio;audio.controls=false;audio.playbackRate=1;audio.preload='auto';audio.src=media('audio',item.audio);
  let starting=false;
  const start=async()=>{if(starting||audioKey!==key||!visible)return;starting=true;const at=elapsed();if(at>=item.audioSeconds){audio.pause();return}audio.currentTime=at;try{await audio.play();if(audioKey!==key)audio.pause()}catch{if(audioKey===key&&visible)status('Press Continue audio to allow playback. The exam clock continues.',true)}};
  audio.addEventListener('loadedmetadata',()=>{void start()},{once:true});
  audio.addEventListener('error',()=>{if(audioKey===key&&visible)status('Audio could not load. Check your connection and press Continue audio. Your clock continues.',true)});
  if(audio.readyState>=1)void start();
  const next=attempt.paper.questions[item.number];if(next){preload=audioFactory();preload.preload='auto';preload.src=media('audio',next.audio);preload.load?.()}
 }
 function resumeAudio(){if(elapsed()>=q().audioSeconds){status('The recording has finished. Choose your answer.');return}if(!player){playCurrent();return}try{player.currentTime=elapsed()}catch{}void player.play().catch(()=>status('Allow audio playback in your browser, then press Continue audio.',true))}
 function render(){
  clearInterval(timer);area.replaceChildren();const head=el('header',undefined,'hz-exam-hero');head.append(el('p','TCF CANADA · COMPRÉHENSION ORALE','hz-eyebrow'),el('h3','TCF Listening · Test 01'));area.append(head,button('← TEF/TCF AI Tests',()=>root.dispatchEvent(new CustomEvent('hzad-open-exams')),false,true));
  if(!attempt){stopAudio();area.append(el('p','39 questions · 35 minutes · One listen per recording. Questions advance automatically; you cannot return to earlier questions. Answers and your total appear at the end.'));
   const sample=audioFactory();unlockedAudio=sample;sample.controls=true;sample.preload='metadata';sample.src=media('audio','audio-check.mp3');sample.setAttribute('aria-label','Check your listening audio');player=sample;sample.addEventListener('ended',()=>{if(attempt)return;ready=true;const start=area.querySelector('[data-start-listening]');if(start){start.dataset.locked='false';controls()}status('Audio checked. You can start the test.')},{once:true});area.append(el('h4','Check your audio'),sample,el('p','Play the short audio check before starting. Keep this page open and use headphones if possible.','hz-small'));
   const start=button('Start Listening Test 01',begin,!ready);start.dataset.startListening='true';area.append(start);
   const history=el('section',undefined,'hz-writing-history');history.append(el('h4','Your saved listening tests'));for(const row of catalog.history)history.append(button(`Test 01 · ${new Date(row.startedAt).toLocaleDateString()} · ${row.status==='completed'?'View answer sheet':'Resume test'}`,()=>{void open(row.id)},false,true));if(!catalog.history.length)history.append(el('p','Your saved tests will appear here.'));area.append(history);
  }else if(attempt.status==='completed'){stopAudio();renderResults();area.append(button('Listening tests',()=>{void open()},false,true))}
  else renderQuestion();
  if(windowNotice){status(windowNotice,true);windowNotice=null}controls();const viewId=attempt?.id;recordView(root,'tcf-listening:'+(viewId||'home'),()=>open(viewId));
 }
 function renderQuestion(){
  const item=q(),bar=el('div',undefined,'hz-reading-toolbar'),clock=el('strong'),questionClock=el('span');clock.setAttribute('aria-label','Listening time remaining');questionClock.setAttribute('aria-label','Current question time remaining');bar.append(el('span',`${Object.keys(attempt.answers).length}/39 answers saved`),clock,questionClock);area.append(bar);
  const card=el('section',undefined,'hz-reading-question');card.lang='fr';card.append(el('h4',`Question ${item.number} sur 39`),el('p','Écoutez l’enregistrement. Une seule écoute.','hz-small'));
  if(item.image){const image=el('img');image.src=media('images',item.image);image.alt=`Illustration de la question ${item.number}`;image.className='hz-listening-image';card.append(image)}
  const fieldset=el('fieldset'),legend=el('legend');fieldset.append(legend);item.options.forEach((text,i)=>{const letter=String.fromCharCode(65+i),label=el('label',undefined,'hz-reading-option'),input=el('input');input.type='radio';input.name='listening-'+item.number;input.value=letter;input.checked=(pending?.number===item.number?pending.choice:attempt.answers[item.number])===letter;input.dataset.locked=String(!!pending||!remaining()||now()>=Date.parse(attempt.questionEndsAt));input.onchange=()=>choose(item.number,letter);label.append(input,el('span',letter+'. '+text));fieldset.append(label)});card.append(fieldset);area.append(card);
  area.append(button('Continue audio',resumeAudio,false,true),el('p','Playback resumes at the current point. The recording cannot be replayed during the test.','hz-small'));
  if(pending){area.append(el('p','Your choice is waiting to be saved.'),button('Retry saving answer',()=>{pending.revision=attempt.revision;saveChoice()}),button('Use saved answer',()=>{pending=null;render()},false,true))}
  area.append(button('Submit listening test',()=>{confirming=true;render()},!!pending));if(confirming){const box=el('section');box.setAttribute('aria-label','Confirm listening submission');box.append(el('h4','End this test now?'),el('p',`${39-Object.keys(attempt.answers).length} unanswered. You cannot change answers after submitting.`),button('Confirm submission',finish,!!pending),button('Keep listening',()=>{confirming=false;render()},false,true));area.append(box)}
  const tick=()=>{const left=remaining(),questionLeft=Math.max(0,Math.ceil((Date.parse(attempt.questionEndsAt)-now())/1000));clock.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} remaining`;questionClock.textContent=`Next question in ${questionLeft}s`;legend.textContent=elapsed()>=item.audioSeconds?item.question:'Écoutez, puis choisissez une réponse.';
   if(!left||!questionLeft){area.querySelectorAll('input').forEach(n=>n.disabled=true);if(!busy){clearInterval(timer);void run(async(signal,current)=>{const saved=await store.read(attempt.id,signal);if(current()){receive(saved);render()}})}}};
  tick();timer=setInterval(tick,250);playCurrent();
 }
 function renderResults(){
  const result=attempt.result,sheet=el('section',undefined,'hz-reading-answer-sheet');sheet.append(el('h4','Your marked answer sheet'),el('strong',`${result.correct}/39 correct`,'hz-reading-score'),el('p',`${result.unanswered} unanswered · Practice score ${result.percentage}%`),el('p','Practice result; this original test has no official TCF/NCLC conversion.','hz-small'));
  for(const row of result.rows){const item=attempt.paper.questions[row.number-1],card=el('article',undefined,'hz-reading-correction '+(row.isCorrect?'is-correct':'is-incorrect'));card.lang='fr';card.append(el('h5',`Question ${row.number} · ${row.isCorrect?'✓ Correct':row.selected?'✕ Incorrect':'— Unanswered'}`),el('p',item.question));const list=el('ul');item.options.forEach((text,i)=>{const letter=String.fromCharCode(65+i);list.append(el('li',`${letter}. ${text}${letter===row.correct?' · ✓ Correct answer':''}${letter===row.selected?' · Your answer':''}`,letter===row.correct?'is-correct':letter===row.selected?'is-incorrect':''))});card.append(list);if(!row.selected)card.append(el('p','Your answer: unanswered.'));card.append(el('p',row.explanation));const details=el('details');details.append(el('summary','Transcription et enregistrement'));for(const line of row.transcript.split('\n'))details.append(el('p',line));const audio=el('audio');audio.controls=true;audio.preload='none';audio.src=media('audio',item.audio);audio.setAttribute('aria-label',`Review recording ${row.number}`);details.append(audio);card.append(details);sheet.append(card)}
  sheet.append(el('strong',`Total score: ${result.correct}/39 correct · ${result.percentage}%`,'hz-reading-total'));area.append(sheet);
 }
 return {open,reset};
}
