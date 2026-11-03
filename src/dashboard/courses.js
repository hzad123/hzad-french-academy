import {LEVELS} from '../config.js';
export function renderCourseCards(container) {
  container.replaceChildren(...LEVELS.map(([level,title])=>{
    const card=document.createElement('div');card.className='hz-course'+(level==='A0'?' hz-course-ready':'');
    const code=document.createElement('div');code.className='hz-level';code.textContent=level;
    const label=document.createElement('div');label.textContent=title;
    const note=document.createElement('p');note.className='hz-small';note.textContent=level==='A0'?'24 interactive lessons · Available now':'Curriculum coming soon';
    card.append(code,label,note);return card;
  }));
}
