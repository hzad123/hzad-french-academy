import {makeLearningStore} from './supabase-store.js';
// Call only after the academy's existing Supabase auth and entitlement checks.
// No lesson text or score data is bundled in this component.
export async function mountSecureA0(host,client){
 const store=makeLearningStore(client);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const btn=(label,action)=>{const b=el('button',label);b.type='button';b.className='hz-btn';b.addEventListener('click',action);return b};
 const state={units:[],progress:{},current:null,answers:{},feedback:null};
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
   for(const unit of state.units)nav.append(btn(`${state.progress[unit.id]?.completed?'✓ ':''}${unit.title}`,()=>{state.current=unit;state.answers={};state.feedback=null;render()}));
   host.append(nav);
   const unit=state.current;
   host.append(el('h3',unit.title));
   for(const objective of unit.objectives)host.append(el('p','Goal: '+objective));
   for(const section of unit.sections){
     host.append(el('h4',section.heading),el('p',section.body));
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
     const field=el('fieldset');field.append(el('legend',q.prompt));
     q.options.forEach((option,index)=>{
       const label=el('label');const radio=el('input');
       radio.type='radio';radio.name='secure-'+q.id;radio.checked=state.answers[q.id]===index;
       radio.disabled=!!state.feedback;
       radio.addEventListener('change',()=>state.answers[q.id]=index);
       label.append(radio,document.createTextNode(' '+option));field.append(label);
     });
     host.append(field);
   }
   const info=el('p');info.setAttribute('role','status');host.append(info);
   if(state.feedback){
     const result=state.feedback;
     info.textContent=`Score: ${result.percent}% · ${result.passed?'Passed':'Keep practicing'}`;
     for(const f of result.feedback||[])host.append(el('p',`${f.correct?'✓':'Review'} ${f.answer}: ${f.explanation}`));
     host.append(btn('Try again',()=>{state.answers={};state.feedback=null;render()}));
   }else{
     host.append(btn('Submit quiz',async()=>{
       if(unit.quiz.some(q=>state.answers[q.id]===undefined)){info.textContent='Answer all questions first.';return}
       info.textContent='Grading…';
       try{
         const result=await store.submitQuiz(unit.id,state.answers);
         state.feedback=result;state.progress=await store.readProgress();render();
       }catch(e){info.textContent='Could not submit quiz: '+e.message}
     }));
   }
 }
 render();
}
