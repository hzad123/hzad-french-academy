import {LEVELS} from '../config.js';

const COURSE_COUNTS={A0:30,A1:49,A2:54,B1:69,B2:69,C1:61,C2:60};
const make=(tag,className,text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};

// Every CEFR level is an immediately accessible course for entitled students.
// Cards are buttons (not decorative tiles); the shared authenticated viewer
// opens their lessons and checks purchase entitlement server-side.
export function renderCourseCards(container){
 container.replaceChildren(...LEVELS.map(([level,title])=>{
  const card=make('button','hz-course'+(level==='A0'?' hz-course-featured':''));card.type='button';
  card.dataset.courseLevel=level;
  card.setAttribute('aria-label','Open '+level+' — '+title+' lessons');
  const top=make('div','hz-course-top');
  top.append(make('span','hz-level',level),make('span','hz-course-status','Available now'));
  const label=make('span','hz-course-name',title);
  const note=make('span','hz-course-count',level==='A0'?'30 interactive lessons':COURSE_COUNTS[level]+' lessons');
  const footer=make('span','hz-course-open','Explore lessons  →');
  card.append(top,label,note,footer);
  return card;
 }));
}
