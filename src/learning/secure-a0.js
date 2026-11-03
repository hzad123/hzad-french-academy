import {makeLearningStore} from './supabase-store.js';
import {renderA0Layout,renderVocabulary} from './a0-ui.js';
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
 const state={units,progress,current:units.find(u=>!progress[u.id]?.completed)||units[0]||null,
   answers:{},feedback:{},pending:{},saving:false,saved:false,
   navOpen:!window.matchMedia('(max-width: 800px)').matches,navScroll:0,showTranslations:true};
 let generation=0, currentChrome=null;
 function selectLesson(next){
   if(!next)return;
   if(state.current?.id===next.id){
     const currentTitle=host.querySelector('.hz-a0-lesson-title');
     currentTitle?.focus();return;
   }
   if('speechSynthesis' in window)window.speechSynthesis.cancel();
   state.current=next;state.answers={};state.feedback={};state.pending={};state.saving=false;state.saved=false;
   if(window.matchMedia('(max-width: 800px)').matches)state.navOpen=false;
   const chrome=render();chrome?.scrollToLesson();
 }
 function render(){
   const renderId=++generation;
   const chrome=renderA0Layout(host,state,selectLesson);
   currentChrome=chrome;
   const content=chrome.main;
   if(!state.current){content.append(el('p','No lessons are published yet.'));return chrome}
   const unit=state.current;
   const stillHere=()=>active()&&generation===renderId;
   const intro=el('header');intro.className='hz-a0-lesson-intro';
   const meta=el('div');meta.className='hz-a0-lesson-meta';
   const number=String(unit.id||'').split('-')[1]||'';
   meta.append(el('span','LESSON '+number),el('span',String(unit.minutes||10)+' MIN'));
   const title=el('h3',unit.title);title.className='hz-a0-lesson-title';
   intro.append(meta,title);content.append(intro);
   for(const section of unit.sections){
     const block=el('section');block.className='hz-lesson-section';block.append(el('h4',section.heading));
     if(Array.isArray(section.items)){
       const list=el('ul');list.className='hz-expression-list';
       for(const item of section.items){
         const li=el('li');li.className='hz-expression-item';
         const phrase=el('strong',item.french);phrase.className='hz-expression-french';
         const meaning=el('span',item.english);meaning.className='hz-expression-english';
         const usage=el('p',item.usage);usage.className='hz-expression-usage';
         li.append(phrase,meaning);
         if(item.usage){
           const detail=el('details');detail.className='hz-expression-tip';
           detail.append(el('summary','Usage & explanation'),usage);li.append(detail);
         }
         list.append(li);
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
     content.append(block);
   }
   renderVocabulary(content,unit,state);
   const quizTitle=el('h4','Practice quiz');quizTitle.className='hz-a0-quiz-title';content.append(quizTitle);
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
               const submission=await store.submitQuiz(unitId,{...state.answers});
               if(!active())return;
               // The server verifies that every question was answered and saves completion.
               // Update the progress bar from the successful write; avoid a second request
               // that could be rate-limited or fail after the completion was already saved.
               const previous=state.progress[unitId]||{};
               state.progress[unitId]={
                 ...previous,
                 completed:true,
                 attempts:(previous.attempts||0)+1,
                 best:Math.max(previous.best||0,submission.percent||0)
               };
               if(active())currentChrome?.updateProgress();
               if(stillHere()){
                 state.saved=true;
                 const totalDone=state.units.filter(u=>state.progress[u.id]?.completed).length;
                 const percent=typeof submission.percent==='number'?submission.percent:0;
                 info.textContent='✓ Lesson completed! '+totalDone+' of '+state.units.length+
                   ' lessons complete. Quiz score: '+percent+'%. '+
                   (submission.passed?'Well done!':'You can review and retake this lesson to improve your score.');
                 info.className='hz-a0-completion-notice';
               }
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
     });content.append(field);
   }content.append(info);
   const navFooter=el('div');navFooter.className='hz-a0-next-prev';
   const currentIndex=state.units.findIndex(u=>u.id===unit.id);
   if(currentIndex>0)navFooter.append(btn('← Previous lesson',()=>selectLesson(state.units[currentIndex-1])));
   if(currentIndex>=0&&currentIndex<state.units.length-1)navFooter.append(btn('Next lesson →',()=>selectLesson(state.units[currentIndex+1])));
   content.append(navFooter);
   return chrome;
 }
 render();
}
