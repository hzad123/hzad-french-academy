import {makeLearningStore} from './supabase-store.js';
import {isSessionRequired} from '../auth/session.js';
import {isRateLimited,showCooldown} from '../auth/rate-limit.js';

export async function mountSecureA0(host,client){
 const store=makeLearningStore(client);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const btn=(label,action)=>{const b=el('button',label);b.type='button';b.className='hz-btn';b.addEventListener('click',action);return b};
 const ticket=String(Date.now())+Math.random();host.dataset.mountToken=ticket;
 const active=()=>host.dataset.mountToken===ticket&&host.isConnected;
 host.replaceChildren(el('p','Loading your lessons...'));
 // Both APIs authorize the caller server-side. No duplicate Auth /user request.
 const [units,progress]=await Promise.all([store.listUnits(),store.readProgress()]);
 if(!active())return;
 const state={units,progress,current:units[0]||null,answers:{},feedback:{},pending:{},saving:false,saved:false};
 let generation=0;
 function render(){
   const renderId=++generation;host.replaceChildren();
   const progressText=el('p');
   const updateProgress=()=>{progressText.textContent=`${state.units.filter(u=>state.progress[u.id]?.completed).length} of ${state.units.length} lessons completed`};
   updateProgress();host.append(el('h2','A0 \u00b7 Absolute Beginner'),progressText);
   if(!state.current){host.append(el('p','No lessons are published yet.'));return}
   const nav=el('nav');nav.setAttribute('aria-label','Choose a lesson');
   for(const unit of state.units)nav.append(btn((state.progress[unit.id]?.completed?'\u2713 ':'')+unit.title,()=>{
     state.current=unit;state.answers={};state.feedback={};state.pending={};state.saving=false;state.saved=false;render();
   }));host.append(nav);
   const unit=state.current;
   const stillHere=()=>active()&&generation===renderId;
   host.append(el('h3',unit.title));
   for(const section of unit.sections){
     const block=el('section');block.className='hz-lesson-section';block.append(el('h4',section.heading));
     if(Array.isArray(section.items)){
       const list=el('ul');list.className='hz-expression-list';
       for(const item of section.items){
         const li=el('li');li.className='hz-expression-item';
         const phrase=el('strong',item.french);phrase.className='hz-expression-french';
         const meaning=el('span',item.english);meaning.className='hz-expression-english';
         const usage=el('p',item.usage);usage.className='hz-expression-usage';
         li.append(phrase,meaning,usage);list.append(li);
       }block.append(list);
     }else if(Array.isArray(section.dialogue)){
       const dialogue=el('div');dialogue.className='hz-dialogue';
       for(const line of section.dialogue){
         const turn=el('div');turn.className='hz-dialogue-turn';
         const french=el('p',line.french);french.className='hz-dialogue-french';
         const english=el('p',line.english);english.className='hz-dialogue-english';
         turn.append(french,english);dialogue.append(turn);
       }block.append(dialogue);
     }else if(section.body)block.append(el('p',section.body));
     host.append(block);
   }
   host.append(el('h4','Vocabulary'));
   for(const [french,english] of unit.vocabulary)host.append(btn('\ud83d\udd0a '+french+' \u2014 '+english,()=>{
     if(!('speechSynthesis' in window))return;
     speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(french);u.lang='fr-FR';u.rate=.82;speechSynthesis.speak(u);
   }));
   host.append(el('h4','Practice quiz'));
   const info=el('p');info.setAttribute('role','status');
   for(const q of unit.quiz){
     const field=el('fieldset');field.className='hz-quiz-question';field.append(el('legend',q.prompt));
     q.options.forEach((option,index)=>{
       const label=el('label');label.className='hz-quiz-option';
       const radio=el('input');radio.type='radio';radio.name='secure-'+q.id;
       label.append(radio,document.createTextNode(' '+option));field.append(label);
       radio.addEventListener('change',async()=>{
         if(state.pending[q.id]||state.feedback[q.id]||!stillHere())return;
         const unitId=unit.id,questionId=q.id;let cooling=false;
         state.answers[questionId]=index;state.pending[questionId]=true;
         const options=Array.from(field.querySelectorAll('input[type="radio"]'));
         options.forEach(input=>{input.disabled=true});
         field.querySelectorAll('.hz-quiz-waiting').forEach(n=>n.remove());
         const waiting=el('p','Checking answer...');waiting.className='hz-quiz-waiting';waiting.setAttribute('role','status');field.append(waiting);
         try{
           const result=await store.checkAnswer(unitId,questionId,index);
           if(!stillHere())return;
           state.feedback[questionId]=result;waiting.remove();
           field.classList.add(result.correct?'hz-quiz-correct':'hz-quiz-wrong');
           label.classList.add(result.correct?'hz-answer-correct':'hz-answer-wrong');
           const marker=el('span',result.correct?'\u2713':'\u2715');marker.className='hz-answer-icon';marker.setAttribute('aria-hidden','true');label.append(marker);
           const notice=el('div');notice.className='hz-quiz-feedback '+(result.correct?'hz-quiz-feedback-good':'hz-quiz-feedback-bad');notice.setAttribute('role','status');
           notice.append(el('strong',result.correct?'\u2713 Correct!':'\u2715 Not quite \u2014 here is why'));
           const explanation=el('p',result.explanation||'Review the lesson for more context.');explanation.className='hz-quiz-explanation';notice.append(explanation);
           if(!result.correct)notice.append(el('p','Correct answer: '+result.answer));
           field.append(notice);
           if(unit.quiz.every(item=>state.feedback[item.id])&&!state.saving&&!state.saved){
             state.saving=true;
             try{
               // Never automatically retry this write: a lost response can hide a successful save.
               await store.submitQuiz(unitId,{...state.answers});
               if(!stillHere())return;
               state.saved=true;state.progress=await store.readProgress();if(stillHere())updateProgress();
             }catch(error){if(stillHere())info.textContent='Answer feedback is available, but progress could not be confirmed: '+error.message}
             finally{if(stillHere())state.saving=false}
           }
         }catch(error){
           if(!stillHere())return;
           if(isRateLimited(error)){
             cooling=true;
             showCooldown(waiting,client,error,()=>{
               if(!stillHere())return;
               delete state.pending[questionId];delete state.answers[questionId];radio.checked=false;
               options.forEach(input=>{input.disabled=false});waiting.textContent='You can select an answer again now.';
             });return;
           }
           if(isSessionRequired(error)){host.dispatchEvent(new CustomEvent('hzad-session-expired',{bubbles:true}));return}
           waiting.textContent='Could not check this answer: '+error.message;
           delete state.answers[questionId];radio.checked=false;options.forEach(input=>{input.disabled=false});
         }finally{if(stillHere()&&!cooling)delete state.pending[questionId]}
       });
     });host.append(field);
   }host.append(info);
 }
 render();
}
