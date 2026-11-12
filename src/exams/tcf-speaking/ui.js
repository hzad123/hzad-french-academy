import {makeSpeakingStore} from './store.js';
import {mountRecorder} from '../../ai/audio.js';
import {recordView} from '../../ui/navigation.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
export function wireTcfSpeaking(root,client,{fetcher,recorderFactory=mountRecorder}={}){
 const area=root.querySelector('#hz-tcf-speaking'),chooser=root.querySelector('#hz-course-chooser');if(!area)return;
 const store=makeSpeakingStore(client,fetcher);let catalog,attempt,recorder,timer,controller,epoch=0,visible=false,busy=false,viewer;
 function clear(){epoch++;visible=false;busy=false;controller?.abort();recorder?.dispose();clearInterval(timer);globalThis.speechSynthesis?.cancel();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden')}
 function reset(){clear();catalog=null;attempt=null;viewer=null}
 root.addEventListener('hzad-route-reset',clear);root.addEventListener('hzad-clear-lessons',reset);
 client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||viewer&&session?.user?.id&&viewer!==session.user.id)reset();if(session?.user?.id)viewer=session.user.id});
 function status(text){let p=area.querySelector('.hz-speaking-status');if(!p){p=el('p',undefined,'hz-speaking-status');p.setAttribute('role','status');area.append(p)}p.textContent=text}
 function button(text,fn,locked=false){const b=el('button',text,'hz-btn hz-btn-alt');b.type='button';b.disabled=busy||locked;b.dataset.locked=String(locked);b.onclick=fn;return b}
 async function run(work){if(busy)return;busy=true;const tick=epoch;controller=new AbortController();area.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await work(controller.signal,()=>visible&&tick===epoch)}catch(e){if(visible&&tick===epoch){if(attempt)try{attempt=await store.read(attempt.id,controller.signal);render()}catch{}status(e.message)}}finally{if(tick===epoch){busy=false;area.querySelectorAll('button').forEach(b=>b.disabled=b.dataset.locked==='true')}}}
 async function open(id){root.dispatchEvent(new CustomEvent('hzad-route-reset'));visible=true;area.classList.remove('hz-hidden');chooser.classList.add('hz-hidden');status('Opening TCF speaking…');await run(async(signal,current)=>{catalog=await store.catalog(signal);attempt=id?await store.read(id,signal):null;if(current())render()})}
 root.addEventListener('hzad-open-tcf-speaking',()=>{void open()});
 function speak(text){if(!text||!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return;globalThis.speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(text);voice.lang='fr-CA';globalThis.speechSynthesis.speak(voice)}
 function action(body){void run(async(signal,current)=>{const next=await store.send(body,signal);if(!current())return;if(next.processing){attempt=await store.read(attempt.id,signal);render();status('Examiner processing. Check the saved reply before sending again.');return}attempt=next;render();const last=attempt.calls.filter(c=>c.status==='completed'&&c.kind==='turn').at(-1);if(body.kind==='turn')speak(last?.result.reply)})}
 function render(){recorder?.dispose();clearInterval(timer);area.replaceChildren();area.append(el('h3','TCF Speaking · Test 01'),button('← TEF/TCF AI Tests',()=>root.dispatchEvent(new CustomEvent('hzad-open-exams'))));
 const turn=catalog.activities?.['tcf-speaking-turn'],grade=catalog.activities?.['tcf-speaking-feedback'];
 const ready=catalog.enabled&&turn?.enabled&&grade?.enabled;
 const canPay=cost=>ready&&Number.isSafeInteger(cost)&&catalog.wallet?.available>=cost&&catalog.wallet.budgetAvailable&&Date.parse(catalog.wallet.expiresAt)>Date.now();
 if(!attempt){
  area.append(el('p','Guided interview · 2 min. Information role-play · 2 min preparation + 3½ min interaction. Opinion · 4½ min.'));
  area.append(el('p','Speak into your microphone. Send recordings of up to 30 seconds per turn; for Task 3, continue your opinion across clips. The examiner speaks French and your conversation is saved.'));
  if(turn?.credits&&grade?.credits)area.append(el('p',`${turn.credits} credits per audio turn; ${grade.credits} credits for final TCF/NCLC feedback. Up to 30 turns (maximum ${30*turn.credits+grade.credits} credits for this test). Saved review is free.`));
  if(!ready)area.append(el('p','The AI speaking examiner is being prepared.'));
  else if(!canPay(3*turn.credits+grade.credits))area.append(el('p','You need enough AI credits for at least one turn in each task and the final feedback. Saved tests remain available.'));
  area.append(button('Start speaking Test 01',()=>action({kind:'start',id:crypto.randomUUID()}),!canPay(3*(turn?.credits||0)+(grade?.credits||0))));
  for(const row of catalog.history)area.append(button('Saved speaking test · '+new Date(row.createdAt).toLocaleDateString(),()=>{void open(row.id)}));
 }else{
  const completed=attempt.calls.filter(c=>c.kind==='turn'&&c.status==='completed');
  for(const [index,phase] of catalog.test.phases.entries()){
   const block=el('section',undefined,'hz-writing-task');block.append(el('h4',phase.name));
   if(index<=attempt.phase){const p=el('p',phase.prompt);p.lang='fr';block.append(p)}
   for(const call of completed.filter(c=>c.phase===index)){block.append(el('p','You: '+call.result.transcript));if(call.result.reply)block.append(el('p','Examiner: '+call.result.reply))}
   if(index===attempt.phase){
    let prep;const clock=el('strong');block.append(clock);const offset=Date.parse(attempt.serverNow)-Date.now();
    const tick=()=>{const left=Math.max(0,Math.ceil((Date.parse(attempt.deadline)-Date.now()-offset)/1000));if(prep){prep.dataset.locked=String(left>0);prep.disabled=busy||left>0}clock.textContent=attempt.pending?'Examiner processing…':`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} remaining`;};tick();timer=setInterval(tick,1000);
    if(attempt.pending)block.append(button('Check saved examiner reply',()=>{void open(attempt.id)}));
    else if(index===1){prep=button('Begin role-play after preparation',()=>action({kind:'advance',id:attempt.id}),Date.parse(attempt.deadline)>Date.now()+offset);block.append(prep)}
    else{
     const same=completed.filter(c=>c.phase===index),reply=same.length?same.at(-1).result.reply:phase.opening;
     if(reply)block.append(el('p','Examiner: '+reply),button('Listen to examiner',()=>speak(reply)));else block.append(el('p','Continue your opinion. The examiner is listening.'));
     recorder=recorderFactory(block);block.append(button(`Send spoken turn · ${turn?.credits??'—'} credits`,()=>{const audio=recorder.getAudio();if(!audio){status('Record your French response first.');return}action({kind:'turn',id:attempt.id,callId:crypto.randomUUID(),audio,expectedCredits:turn.credits})},!canPay(turn?.credits)));
     block.append(button(index===3?'Finish speaking test':'Finish this task',()=>action({kind:'advance',id:attempt.id})));
    }
   }
   area.append(block);
  }

  if(attempt.phase===4){const result=attempt.calls.find(c=>c.kind==='feedback'&&c.status==='completed')?.result;
   if(result){const feedback=el('section',undefined,'hz-writing-feedback');feedback.append(el('h4','Your TCF speaking result'),el('strong',result.score===null?'More audible task evidence needed':`Estimated TCF speaking ${result.score}/20 · NCLC ${result.nclc}`),el('p',result.summary));
    const labels={linguistic:'Linguistic competence · pronunciation, fluency and language',pragmatic:'Pragmatic competence · interaction, coherence and argument',sociolinguistic:'Sociolinguistic competence · audience and register'};
    for(const c of result.criteria){const card=el('article',undefined,'hz-writing-criterion');card.append(el('h5',labels[c.id]),el('blockquote','Task '+c.task+': '+c.evidence),el('p',c.reason));for(const observation of c.audioEvidence)card.append(el('p',observation,'hz-small'));if(c.improvement)card.append(el('h6','What to fix'),el('p',c.improvement));feedback.append(card)}
    for(const task of result.missingTasks)feedback.append(el('p','Task '+task+' needs intelligible spoken evidence.'));area.append(feedback);
   }else if(!attempt.pending)area.append(button(`Get TCF speaking feedback · ${grade?.credits??'—'} ${grade?.credits===1?'credit':'credits'}`,()=>action({kind:'feedback',id:attempt.id,callId:crypto.randomUUID(),expectedCredits:grade.credits}),!canPay(grade?.credits)));
   else area.append(button('Check saved feedback',()=>{void open(attempt.id)}));
  }
 }
 const savedId=attempt?.id;recordView(root,'tcf-speaking:'+(savedId||'home'),()=>open(savedId));
 }
 return {open,reset};
}
