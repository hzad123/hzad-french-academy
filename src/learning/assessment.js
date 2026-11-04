// Client-only feedback summary. The trusted score comes from the server,
// while skill categories are labels for the already-checked multiple-choice items.
// This is not an official CEFR or independently graded speaking/writing score.
export function assessmentBreakdown(unit,feedback){
 const domains=Array.isArray(unit.assessmentDomains)?unit.assessmentDomains:[];
 const groups=new Map();
 for(const item of domains){
   const id=item?.questionId,domain=item?.domain;
   if(typeof id!=='string'||typeof domain!=='string'||!domain.trim())continue;
   if(!groups.has(domain))groups.set(domain,{name:domain,correct:0,total:0});
   const group=groups.get(domain);
   if(!feedback[id])continue;
   group.total++;
   if(feedback[id].correct===true)group.correct++;
 }
 return [...groups.values()].filter(group=>group.total>0).map(group=>({
   ...group,percent:Math.round(100*group.correct/group.total)
 }));
}
export function showAssessmentBreakdown(afterNode,unit,feedback){
 const scores=assessmentBreakdown(unit,feedback);
 if(!scores.length)return;
 const section=document.createElement('section');section.className='hz-assessment-results';
 const title=document.createElement('h4');title.textContent='Your final A0 practice breakdown';section.append(title);
 const note=document.createElement('p');note.className='hz-assessment-note';
 note.textContent='These are scores from checked multiple-choice questions. Speaking recordings and written drafts are self-assessed, not automatically graded or certified.';
 section.append(note);
 for(const score of scores){
   const row=document.createElement('div');row.className='hz-assessment-row';
   const head=document.createElement('div');head.className='hz-assessment-row-label';
   const name=document.createElement('span');name.textContent=score.name;
   const numbers=document.createElement('strong');numbers.textContent=score.correct+' / '+score.total+' correct';
   head.append(name,numbers);
   const track=document.createElement('div');track.className='hz-assessment-track';
   track.setAttribute('role','progressbar');track.setAttribute('aria-label',score.name+' answers correct');
   track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(score.percent));
   const fill=document.createElement('div');fill.className='hz-assessment-fill';
   fill.style.width=score.percent+'%';
   track.append(fill);row.append(head,track);section.append(row);
 }
 const advise=document.createElement('p');advise.className='hz-assessment-advice';
 const needs=scores.filter(s=>s.percent<70).map(s=>s.name);
 advise.textContent=needs.length?'Suggested review: '+needs.join(', ')+'. Revisit earlier A0 lessons, then retake this practice check.':'Well done on the checked questions. Continue practising speaking and writing before starting A1.';
 section.append(advise);
 afterNode.after(section);
}
