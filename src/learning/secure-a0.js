import {makeLearningStore} from './supabase-store.js';
// Call only after the academy's existing Supabase auth and entitlement checks.
// No lesson text or score data is bundled in this component.
export async function mountSecureA0(host,client){
 const store=makeLearningStore(client);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const btn=(label,action)=>{const b=el('button',label);b.type='button';b.className='hz-btn';b.addEventListener('click',action);return b};
 const state={units:[],progress:{},current:null,answers:{},feedback:{},pending:{},saveError:''};
 const status=el('p','Loading your lessons…');host.replaceChildren(status);
 try{
   const [{data:{user},error:authError},units,progress]=await Promise.all([
     client.auth.getUser(),store.listUnits(),store.readProgress()
   ]);
   if(authError||!user)throw Error('Sign in to view your lessons.');
   state.units=units;state.progress=progress;state.current=units[0]||null;
 }catch(e){status.textContent='Could not load your lessons: '+e.message;return}
 function render(){
   host.replaceChildren();
   const total=state.units.length,done=state.units.filter(x=>state.progress[x.id]?.completed).length;
   host.append(el('h2','A0 · Absolute Beginner'),el('p',`${done} of ${total} lessons completed`));
   if(!total){host.append(el('p','No lessons are published yet. Please check back soon.'));return}
   const nav=el('nav');nav.setAttribute('aria-label','Choose a lesson');
   for(const unit of state.units)nav.append(btn(`${state.progress[unit.id]?.completed?'✓ ':''}${unit.title}`,()=>{state.current=unit;state.answers={};state.feedback={};state.pending={};state.saveError='';render()}));
   host.append(nav);
   const unit=state.current;
   host.append(el('h3',unit.title));
   for(const section of unit.sections){
     const block=el('section');
     block.className='hz-lesson-section';
     block.append(el('h4',section.heading));
     if(Array.isArray(section.items)){
       const list=el('ul');
       list.className='hz-expression-list';
       for(const item of section.items){
         const li=el('li');
         li.className='hz-expression-item';
         const phrase=el('strong',item.french);
         phrase.className='hz-expression-french';
         const meaning=el('span',item.english);
         meaning.className='hz-expression-english';
         const usage=el('p',item.usage);
         usage.className='hz-expression-usage';
         li.append(phrase,meaning,usage);
         list.append(li);
       }
       block.append(list);
     }else if(Array.isArray(section.dialogue)){
       const dialogue=el('div');
       dialogue.className='hz-dialogue';
       for(const line of section.dialogue){
         const turn=el('div');
         turn.className='hz-dialogue-turn';
         const french=el('p',line.french);
         french.className='hz-dialogue-french';
         const english=el('p',line.english);
         english.className='hz-dialogue-english';
         turn.append(french,english);
         dialogue.append(turn);
       }
       block.append(dialogue);
     }else if(section.body){
       block.append(el('p',section.body));
     }
     host.append(block);
   }
   host.append(el('h4','Vocabulary'));
   for(const [french,english] of unit.vocabulary){
     const speak=btn('🔊 '+french+' — '+english,()=>{
       if(!('speechSynthesis' in window))return;
       window.speechSynthesis.cancel();
       const u=new SpeechSynthesisUtterance(french);u.lang='fr-FR';u.rate=.82;window.speechSynthesis.speak(u);
     });host.append(speak);
   }
   host.append(el('h4','Practice quiz'));
   for(const q of unit.quiz){
     const feedback=state.feedback[q.id];
     const selected=state.answers[q.id];
     const field=el('fieldset');
     field.className='hz-quiz-question'+(feedback?(feedback.correct?' hz-quiz-correct':' hz-quiz-wrong'):'');
     const legend=el('legend',q.prompt);field.append(legend);
     q.options.forEach((option,index)=>{
       const label=el('label');
       label.className='hz-quiz-option';
       if(feedback&&selected===index)label.classList.add(feedback.correct?'hz-answer-correct':'hz-answer-wrong');
       const radio=el('input');
       radio.type='radio';radio.name='secure-'+q.id;radio.checked=selected===index;
       radio.disabled=!!feedback||!!state.pending[q.id];
       radio.addEventListener('change',async()=>{
         if(state.feedback[q.id]||state.pending[q.id])return;
         const questionId=q.id,unitId=unit.id;
         state.answers[questionId]=index;
         state.pending[questionId]=true;
         // Keep the selected input mounted; replacing the entire quiz here
         // interrupts the browser's native radio selection and focus.
         const options=Array.from(field.querySelectorAll('input[type="radio"]'));
         options.forEach(input=>{input.disabled=true});
         const waiting=el('p','Checking answer…');
         waiting.className='hz-quiz-waiting';
         waiting.setAttribute('role','status');
         field.append(waiting);
         try{
           const result=await store.checkAnswer(unitId,questionId,index);
           if(state.current?.id!==unitId)return;
           state.feedback[questionId]=result;
           waiting.remove();
           field.classList.add(result.correct?'hz-quiz-correct':'hz-quiz-wrong');
           label.classList.add(result.correct?'hz-answer-correct':'hz-answer-wrong');
           const marker=el('span',result.correct?'✓':'✕');
           marker.className='hz-answer-icon';
           marker.setAttribute('aria-hidden','true');
           label.append(marker);
           const notice=el('div');
           notice.className='hz-quiz-feedback '+(result.correct?'hz-quiz-feedback-good':'hz-quiz-feedback-bad');
           notice.setAttribute('role','status');
           notice.append(el('strong',result.correct?'✓ Correct!':'✕ Not quite — here’s why'));
           const explanation=el('p',result.explanation||'Review the lesson for more context.');
           explanation.className='hz-quiz-explanation';
           notice.append(explanation);
           if(!result.correct)notice.append(el('p','Correct answer: '+result.answer));
           field.append(notice);
           if(unit.quiz.every(item=>state.feedback[item.id])){
             try{
               await store.submitQuiz(unitId,state.answers);
               state.progress=await store.readProgress();
             }catch(e){
               state.saveError='Your answers were checked, but progress could not be saved: '+e.message;
               info.textContent=state.saveError;
             }
           }
         }catch(e){
           if(state.current?.id!==unitId)return;
           waiting.textContent='Could not check this answer: '+e.message+'. Please select again.';
           delete state.answers[questionId];
           options.forEach(input=>{input.disabled=false});
           radio.checked=false;
         }finally{
           delete state.pending[questionId];
         }
       });
       label.append(radio,document.createTextNode(' '+option));
       if(feedback&&selected===index){
         const marker=el('span',feedback.correct?'✓':'✕');
         marker.className='hz-answer-icon';marker.setAttribute('aria-hidden','true');label.append(marker);
       }
       field.append(label);
     });
     if(feedback){
       const notice=el('div');
       notice.className='hz-quiz-feedback '+(feedback.correct?'hz-quiz-feedback-good':'hz-quiz-feedback-bad');
       notice.setAttribute('role','status');
       notice.append(el('strong',feedback.correct?'✓ Correct!':'✕ Not quite — here’s why'));
       const explanation=el('p',feedback.explanation||'Review the lesson for more context.');
       explanation.className='hz-quiz-explanation';
       notice.append(explanation);
       if(!feedback.correct)notice.append(el('p','Correct answer: '+feedback.answer));
       field.append(notice);
     }else if(state.pending[q.id]){
       field.append(el('p','Checking answer…'));
     }
     host.append(field);
   }
   const info=el('p');info.setAttribute('role','status');host.append(info);
   if(state.saveError)info.textContent=state.saveError;

 }
 render();
}
