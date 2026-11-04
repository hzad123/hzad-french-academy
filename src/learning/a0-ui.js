// Reusable A0 lesson navigation and vocabulary presentation.
// Content and answer keys remain in Supabase; this module handles UI only.
function el(tag,text){
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=String(text);
 return n;
}
function action(label,className,callback){
 const b=el('button',label);b.type='button';b.className=className;
 b.addEventListener('click',callback);return b;
}
function lessonNumber(unit){return String(unit.id||'').split('-')[1]||String(unit.position||'');}
function normalize(value){return String(value||'').toLocaleLowerCase('fr').replace(/[.!?…\s]+/g,' ').trim();}
export function speakFrench(french,button,status,rate=.86){
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
   status.textContent='French pronunciation is not available in this browser.';return;
 }
 try{
   window.speechSynthesis.cancel();
   const u=new SpeechSynthesisUtterance(french);
   u.lang='fr-FR';u.rate=rate;
   const voice=window.speechSynthesis.getVoices().find(v=>/^fr(?:-|$)/i.test(v.lang));
   if(voice)u.voice=voice;
   button.classList.add('is-playing');
   u.onend=()=>button.classList.remove('is-playing');
   u.onerror=()=>{button.classList.remove('is-playing');status.textContent='Audio playback was unavailable. Try again.';};
   window.speechSynthesis.speak(u);
 }catch(error){button.classList.remove('is-playing');status.textContent='Audio playback was unavailable.';}
}

export function renderA0Layout(host,state,onSelect){
 const completed=()=>state.units.filter(u=>state.progress[u.id]?.completed).length;
 const upcoming=()=>state.units.find(u=>!state.progress[u.id]?.completed)||state.units.at(-1);
 const header=el('header');header.className='hz-a0-course-head';
 const headerCopy=el('div');headerCopy.className='hz-a0-heading-copy';
 const level=state.level||'A0';
 const levels={A0:'Absolute Beginner',A1:'Beginner',A2:'Elementary',B1:'Intermediate',B2:'Upper Intermediate',C1:'Advanced',C2:'Mastery'};
 headerCopy.append(el('p','FRENCH ACADEMY  /  COURSE '+level),el('h2',levels[level]||level));
 headerCopy.firstElementChild.className='hz-a0-eyebrow';
 const subtitle=el('p','Learn step by step with French audio, examples and instant-feedback practice.');
 subtitle.className='hz-a0-course-subtitle';headerCopy.append(subtitle);
 const status=el('div');status.className='hz-a0-progress-status';
 const count=el('strong');count.className='hz-a0-count';
 const summary=el('span','lessons completed');status.append(count,summary);
 header.append(headerCopy,status);
 const progress=el('div');progress.className='hz-a0-progress-track';
 progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','A0 course completion');
 progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(state.units.length));
 const fill=el('div');fill.className='hz-a0-progress-fill';progress.append(fill);
 const quick=el('div');quick.className='hz-a0-quick-row';
 const continueBtn=action('Continue learning →','hz-a0-continue',()=>onSelect(upcoming()));
 quick.append(el('span','Select any lesson or continue where you left off.'),continueBtn);
 const layout=el('div');layout.className='hz-a0-layout';
 const sidebar=el('aside');sidebar.className='hz-a0-sidebar';
 const sideHead=el('div');sideHead.className='hz-a0-sidebar-head';
 const sideHeading=el('strong','Course lessons');
 const toggle=action('☰','hz-a0-sidebar-toggle',()=>{
   state.navOpen=!state.navOpen;syncSidebar();
 });
 toggle.setAttribute('aria-controls','hz-a0-lesson-nav');
 const list=el('nav');list.id='hz-a0-lesson-nav';list.className='hz-a0-lesson-nav';
 list.setAttribute('aria-label',level+' course lessons');
 list.addEventListener('scroll',()=>{state.navScroll=list.scrollTop;},{passive:true});
 const navButtons=[];
 for(let i=0;i<state.units.length;i++){
   if(i%8===0){
     const group=el('p','LESSONS '+String(i+1).padStart(2,'0')+'–'+String(Math.min(i+8,state.units.length)).padStart(2,'0'));
     group.className='hz-a0-nav-group';list.append(group);
   }
   const unit=state.units[i];
   const b=action('','hz-a0-lesson-link',()=>onSelect(unit));
   b.dataset.unitId=unit.id;
   if(state.current?.id===unit.id){b.classList.add('is-current');b.setAttribute('aria-current','step')}
   const number=el('span',lessonNumber(unit));number.className='hz-a0-lesson-number';
   const name=el('span',unit.title);name.className='hz-a0-lesson-name';
   const indicator=el('span');indicator.className='hz-a0-lesson-indicator';
   indicator.setAttribute('aria-hidden','true');
   b.append(number,name,indicator);list.append(b);
   navButtons.push({unit,button:b,indicator});
 }
 sideHead.append(sideHeading,toggle);sidebar.append(sideHead,list);
 const main=el('article');main.className='hz-a0-main';main.setAttribute('aria-label','Selected '+level+' lesson');
 layout.append(sidebar,main);
 host.replaceChildren(header,progress,quick,layout);
 function syncSidebar(){
   const collapsed=!state.navOpen;
   sidebar.classList.toggle('is-collapsed',collapsed);
   layout.classList.toggle('is-sidebar-collapsed',collapsed);
   list.hidden=collapsed;toggle.setAttribute('aria-expanded',String(!collapsed));
   toggle.textContent=collapsed?'☰':'‹';
   toggle.setAttribute('aria-label',collapsed?'Show course lesson list':'Collapse course lesson list');
   sideHeading.textContent=collapsed?'Lessons':'Course lessons';
   if(!collapsed)list.scrollTop=state.navScroll||0;
 }
 function updateProgress(){
   const n=completed();
   count.textContent=n+' / '+state.units.length;
   fill.style.width=(state.units.length?100*n/state.units.length:0)+'%';
   progress.setAttribute('aria-valuenow',String(n));
   continueBtn.textContent=n===state.units.length?'Review A0 lessons →':'Continue learning →';
   for(const item of navButtons){
     const done=!!state.progress[item.unit.id]?.completed;
     item.button.classList.toggle('is-complete',done);
     item.indicator.textContent=done?'✓':item.unit.id===state.current?.id?'●':'';
     item.indicator.setAttribute('title',done?'Completed':'');
   }
 }
 syncSidebar();updateProgress();
 return {main,updateProgress,scrollToLesson(){
   const heading=main.querySelector('.hz-a0-lesson-title');
   if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
   main.scrollIntoView?.({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }};
}

export function renderVocabulary(target,unit,state){
 const vocabulary=Array.isArray(unit.vocabulary)?unit.vocabulary:[];
 const header=el('div');header.className='hz-vocab-heading';
 const headingLeft=el('div');headingLeft.className='hz-vocab-heading-copy';
 headingLeft.append(el('h4','Vocabulary & Listening'));
 const help=el('p','Tap the speaker to hear French. Listen, repeat, then test yourself by hiding English.');
 help.className='hz-vocab-help';headingLeft.append(help);
 const controls=el('div');controls.className='hz-vocab-controls';
 const translation=action('','hz-vocab-translation-toggle',()=>{
   state.showTranslations=!state.showTranslations;syncTranslations();
 });
 const badge=el('span',vocabulary.length+' expressions');badge.className='hz-vocab-count';
 controls.append(badge,translation);header.append(headingLeft,controls);target.append(header);
 const standard=el('div');standard.className='hz-vocab-grid';
 const passages=el('div');passages.className='hz-vocab-passages';
 const descriptions=[];
 const terms=unit.sections.flatMap(s=>Array.isArray(s.items)?s.items:[]);
 const tips=new Map(terms.filter(x=>x?.french&&x?.usage).map(x=>[normalize(x.french),x.usage]));
 const longEntries=[];
 vocabulary.forEach((pair,i)=>{
   const french=pair[0]||'',english=pair[1]||'';
   const isPassage=french.length>105&&(french.match(/[.!?]/g)||[]).length>=2;
   const card=el('div');card.className=isPassage?'hz-vocab-passage':'hz-vocab-card';
   const cardBody=el('div');cardBody.className='hz-vocab-card-body';
   if(isPassage){
     cardBody.append(el('p','LISTENING PRACTICE'));
     cardBody.firstElementChild.className='hz-vocab-label';
   }else{
     const position=el('span',String(i+1).padStart(2,'0'));position.className='hz-vocab-index';
     cardBody.append(position);
   }
   const frenchLine=el('p',french);frenchLine.className='hz-vocab-french';frenchLine.lang='fr';
   const englishLine=el('p',english);englishLine.className='hz-vocab-english';englishLine.lang='en';
   cardBody.append(frenchLine,englishLine);descriptions.push(englishLine);
   const audio=action('🔊','hz-vocab-audio',()=>speakFrench(french,audio,audioStatus));
   audio.title='Play French pronunciation';
   audio.setAttribute('aria-label','Play French audio for expression '+String(i+1));
   const audioStatus=el('span');audioStatus.className='hz-vocab-audio-status';
   audioStatus.setAttribute('role','status');
   const top=el('div');top.className='hz-vocab-card-top';
   top.append(cardBody,audio);card.append(top,audioStatus);
   const note=tips.get(normalize(french));
   if(note){
     const detail=el('details');detail.className='hz-vocab-tip';
     const summary=el('summary','Explain this expression');
     detail.append(summary,el('p',note));card.append(detail);
   }
   if(isPassage)longEntries.push(card);
   else standard.append(card);
 });
 target.append(standard);
 if(longEntries.length){
   const section=el('section');section.className='hz-vocab-listening-section';
   section.append(el('h4','Longer listening practice'));
   const intro=el('p','Play the full French passage, then identify the details before showing English.');
   intro.className='hz-vocab-help';section.append(intro,passages);
   longEntries.forEach(c=>passages.append(c));target.append(section);
 }
 function syncTranslations(){
   translation.textContent=state.showTranslations?'Hide English':'Show English';
   translation.setAttribute('aria-pressed',String(state.showTranslations));
   for(const description of descriptions)description.hidden=!state.showTranslations;
 }
 syncTranslations();
}
