import {makePlacementStore} from './store.js';
import {recordView,recordHome} from '../ui/navigation.js';

const levels=new Set(['A0','A1','A2','B1','B2','C1','C2']);
const el=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(cls)node.className=cls;
 return node;
};
export function wirePlacement(root,client){
 const area=root.querySelector('#hz-placement');
 const launch=root.querySelector('#hz-placement-launch');
 const chooser=root.querySelector('#hz-course-chooser');
 const store=makePlacementStore(client);
 let generation=0,audioGeneration=0,busy=false,state=null,heard=false,transcript=false;
 const speech=globalThis.speechSynthesis;
 const button=(text,fn,alt=false)=>{
  const b=el('button',text,'hz-btn'+(alt?' hz-btn-alt':''));b.type='button';b.addEventListener('click',fn);return b;
 };
 const cancelAudio=()=>{audioGeneration++;speech?.cancel()};
 const clear=()=>{generation++;busy=false;cancelAudio();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden');state=null};
 const close=()=>{clear();recordHome(root);launch.focus()};
 root.addEventListener('hzad-route-reset',clear);
 root.addEventListener('hzad-close-placement',clear);
 root.addEventListener('hzad-clear-lessons',()=>{generation++;busy=false;cancelAudio();area.replaceChildren();area.classList.add('hz-hidden');chooser.classList.remove('hz-hidden');state=null});
 // No answers or student data in localStorage: the server resumes each account.
 async function run(operation){
  if(busy)return;
  busy=true;const ticket=generation;
  area.querySelectorAll('button,input').forEach(b=>{b.disabled=true});
  const old=area.querySelector('[role="alert"]');old?.remove();
  try{
   const next=await operation();
   if(ticket!==generation)return;
   state=next;draw();
  }catch(error){
   if(ticket!==generation)return;
   const message=el('p',error.message||'Placement could not load. Please retry.');message.setAttribute('role','alert');area.append(message);
  }finally{
   if(ticket===generation){busy=false;area.querySelectorAll('button,input').forEach(b=>{b.disabled=false})}
  }
 }
 function draw(){
  cancelAudio();heard=false;transcript=false;
  area.replaceChildren();area.classList.remove('hz-hidden');
  const heading=el('h3','French placement test');heading.tabIndex=-1;
  area.append(heading,button('Close — return to courses',close,true));
  const attempt=state?.attempt;
  if(attempt?.status==='active')drawQuestion(attempt);
  else if(attempt?.status==='completed')drawResult(attempt);
  else drawIntro();
  drawHistory();heading.focus();
  const id=attempt?.id,view=attempt?.status||'intro';recordView(root,'placement:'+(id||'intro'),()=>openPlacement(view,id));
 }
 function drawIntro(){
  area.append(el('p','Find a recommended learning starting point from A0 to C2. Work independently, without dictionaries or translation tools. No AI or credits are used.'),
   el('p','Answer up to 56 questions in increasingly challenging groups of eight (about 10–25 minutes). The test stops when a stage needs more practice. Answers save as you go; return within seven days to resume. You may start three attempts per 24 hours.'),
   el('p','Practise grammar, vocabulary, reading and listening. Play the French audio or use a transcript.'),

   button('Start or resume assessment',()=>run(()=>store.start())));
 }
 function drawQuestion(attempt){
  const q=attempt.question;
  if(!q){area.append(el('p','Question unavailable. Close and retry.'));return}
  const progress=el('p',`${attempt.answered} answers saved · ${q.level} ${q.skill} · up to ${attempt.maximum} questions`);
  progress.setAttribute('role','status');
  const meter=el('progress');meter.max=attempt.maximum;meter.value=attempt.answered;meter.setAttribute('aria-label','Answers saved');
  area.append(progress,meter);
  const form=el('form'),fieldset=el('fieldset'),legend=el('legend',q.prompt);
  fieldset.append(legend);
  if(q.skill==='listening'){
   const help=el('p','Listen to the audio or read the transcript.');
   const status=el('p','');status.setAttribute('role','status');
   const reveal=button('Use transcript',()=>{
    cancelAudio();transcript=true;help.textContent=q.audioText;help.lang='fr';status.textContent='Transcript ready.';
   },true);
   const play=button('Play French audio',()=>{
    if(!speech||!globalThis.SpeechSynthesisUtterance){status.textContent='Audio is unavailable. Please use the transcript.';return}
    const voices=speech.getVoices().filter(v=>/^fr(?:-|_)/i.test(v.lang));
    if(!voices.length){status.textContent='No French device voice is available. Please use the transcript, or install a French voice and retry.';return}
    cancelAudio();const audioTicket=audioGeneration;
    const utterance=new SpeechSynthesisUtterance(q.audioText);utterance.lang='fr-FR';utterance.voice=voices[0];utterance.rate=.9;
    utterance.onend=()=>{if(audioTicket!==audioGeneration)return;heard=true;status.textContent='Audio finished. Choose your answer.'};
    utterance.onerror=()=>{if(audioTicket!==audioGeneration)return;heard=false;status.textContent='Audio could not play. Please use the transcript.'};
    speech.speak(utterance);
   });
   fieldset.append(help,play,reveal,status);
  }
  q.options.forEach((option,index)=>{
   const label=el('label',undefined,'hz-placement-option');
   const radio=el('input');radio.type='radio';radio.name='placement-answer';radio.value=String(index);radio.required=true;
   const text=el('span',option);text.lang='fr';label.append(radio,text);fieldset.append(label);
  });
  const submit=el('button','Save answer and continue','hz-btn');submit.type='submit';
  const status=el('p','');status.setAttribute('role','status');
  form.append(fieldset,submit,status);
  form.addEventListener('submit',event=>{
   event.preventDefault();const input=form.querySelector('input:checked');if(!input)return;
   if(q.skill==='listening'&&!heard&&!transcript){status.textContent='Finish listening or choose the transcript before answering.';return}
   const mode=q.skill==='listening'?(transcript?'transcript':'audio'):'standard';
   void run(()=>store.answer(attempt.id,q.id,Number(input.value),mode));
  });
  area.append(form,el('p','You can close now and resume later. Incomplete attempts do not produce a recommendation.'));
 }
 function drawResult(attempt){
  const r=attempt.result;
  if(!r||!levels.has(r.recommendedLevel)){area.append(el('p','Result unavailable. Close and retry.'));return}
  area.append(el('h4',`Recommended starting level: ${r.recommendedLevel}`),el('p',r.rationale));

  const list=el('ul');
  for(const [skill,score] of Object.entries(r.skills)){
   const evidence=score.total?`${score.correct}/${score.total} correct (${score.percent}%)`:'No score yet';
   const action=!score.total?'practise this skill next':score.percent<75?'review this skill':'continue developing this strength';
   list.append(el('li',`${skill}: ${evidence} — ${action}.`));
  }
  area.append(list,el('p',`Assessment ${attempt.version} · ${new Date(attempt.startedAt).toLocaleString()}`),
   button(`Start ${r.recommendedLevel} lessons`,()=>{
    const level=r.recommendedLevel;clear();root.dispatchEvent(new CustomEvent('hzad-open-level',{detail:{level}}));
   }),button('Retake assessment',()=>{state={...state,attempt:null};draw()},true),
   el('p','Your previous attempts are retained. All seven courses remain available to entitled students.'));
 }
 function drawHistory(){
  if(!state?.history?.length)return;
  const details=el('details'),summary=el('summary','Previous attempts (latest 20)');details.append(summary);
  for(const attempt of state.history){
   const level=attempt.result?.recommendedLevel;
   const label=`${new Date(attempt.startedAt).toLocaleString()} — ${attempt.status}${levels.has(level)?' · '+level:''}`;
   details.append(button(label,()=>run(()=>store.state(attempt.id)),true));
  }
  area.append(details);
 }
 async function openPlacement(view='current',id){
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));
  generation++;state=null;chooser.classList.add('hz-hidden');draw();
  await run(async()=>{const next=await store.state(id);return view==='intro'?{...next,attempt:null}:next});
 }
 launch.addEventListener('click',()=>{if(!busy)void openPlacement()});
}
