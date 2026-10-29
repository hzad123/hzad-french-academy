import {a0Lessons,gradeQuiz} from '../curriculum/a0.js';
import {readPreviewProgress,recordPreviewAttempt,progressPercent} from '../progress/local.js';
export function mountA0Learning(host){
 const state={lesson:a0Lessons[0],answers:{},submitted:false};
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const button=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b};
 function speak(text){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=.82;window.speechSynthesis.speak(u)}
 function render(){
  const progress=readPreviewProgress(),lesson=state.lesson;
  host.replaceChildren();host.className='hz-learning';
  const head=el('header','hz-learning-header');
  head.append(el('div','hz-learning-kicker','HZAD FRENCH ACADEMY · A0'),el('h1','', 'Start speaking French'));
  const p=el('p','',`Your journey: ${progressPercent(a0Lessons,progress)}% complete · ${a0Lessons.length} starter lessons`);head.append(p);host.append(head);
  const layout=el('div','hz-learning-layout'),nav=el('nav','hz-learning-nav');
  nav.setAttribute('aria-label','A0 lessons');
  a0Lessons.forEach((l,i)=>nav.append(button(`${i+1}. ${l.title} ${progress[l.id]?.completed?'✓':''}`,()=>{state.lesson=l;state.answers={};state.submitted=false;render()},l.id===lesson.id?'active':'')));
  const main=el('main','hz-learning-main');
  main.append(el('div','hz-learning-kicker',`LESSON · ${lesson.minutes} MINUTES`),el('h2','',lesson.title));
  const objectives=el('div','hz-learning-card');objectives.append(el('h3','','You will learn'));const ul=el('ul');lesson.objectives.forEach(o=>ul.append(el('li','',o)));objectives.append(ul);main.append(objectives);
  lesson.sections.forEach(s=>{const card=el('section','hz-learning-card');card.append(el('h3','',s.heading));const body=el('p','hz-learning-text',s.body);card.append(body);main.append(card)});
  const vocab=el('section','hz-learning-card');vocab.append(el('h3','','Vocabulary · tap to hear'));
  const words=el('div','hz-learning-vocab');
  lesson.vocabulary.forEach(([fr,en])=>{const card=button('🔊 '+fr,()=>speak(fr),'hz-learning-word');card.append(el('small','',en));words.append(card)});vocab.append(words);main.append(vocab);
  const quiz=el('section','hz-learning-card');quiz.append(el('h3','','Check your understanding'),el('p','','Choose an answer for each question. You can retry as often as you like.'));
  lesson.quiz.forEach((q,i)=>{
    const field=el('fieldset','hz-learning-question');field.append(el('legend','',`${i+1}. ${q.prompt}`));
    q.options.forEach((option,j)=>{const label=el('label','hz-learning-option');const radio=el('input');radio.type='radio';radio.name=q.id;radio.value=String(j);radio.checked=state.answers[q.id]===j;radio.disabled=state.submitted;radio.addEventListener('change',()=>{state.answers[q.id]=j});label.append(radio,document.createTextNode(' '+option));field.append(label)});
    quiz.append(field);
  });
  if(!state.submitted)quiz.append(button('Grade my quiz',()=>{
    if(lesson.quiz.some(q=>state.answers[q.id]===undefined)){window.alert('Answer every question before grading.');return}
    state.submitted=true;const result=gradeQuiz(lesson,state.answers);recordPreviewAttempt(lesson.id,result);render();
  },'hz-learning-primary'));
  else{
    const result=gradeQuiz(lesson,state.answers);
    quiz.append(el('h3','',`Score: ${result.correct}/${result.total} (${result.percent}%) — ${result.passed?'Passed!':'Keep practicing'}`));
    result.feedback.forEach((f,i)=>quiz.append(el('p',f.correct?'hz-learning-correct':'hz-learning-incorrect',`${i+1}. ${f.correct?'Correct':'Review'} — ${f.answer}. ${f.explanation}`)));
    quiz.append(button('Try again',()=>{state.answers={};state.submitted=false;render()},'hz-learning-primary'));
  }
  main.append(quiz);layout.append(nav,main);host.append(layout);
  host.append(el('p','hz-learning-disclaimer','Preview progress is stored in this browser only. Secure Supabase syncing will be added before student release.'));
 }
 render();
}
