import {LEVELS} from '../config.js';
export function renderCourseCards(container) {
  container.replaceChildren(...LEVELS.map(([level,title])=>{
    const card=document.createElement('button');card.type='button';card.dataset.courseLevel=level;card.setAttribute('aria-label','Open '+level+' lessons');card.className='hz-course hz-course-ready';
    const code=document.createElement('div');code.className='hz-level';code.textContent=level;
    const label=document.createElement('div');label.textContent=title;
    const note=document.createElement('p');note.className='hz-small';note.textContent=level==='A0'?'30 interactive lessons · Available now':({A1:49,A2:54,B1:69,B2:69,C1:61,C2:60}[level]+' lessons · Early-access drafts');
    card.append(code,label,note);return card;
  }));
}
