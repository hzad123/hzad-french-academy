const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const names={'tef-reading':'Reading','tef-listening':'Listening','tef-writing':'Writing','tef-speaking':'Speaking','tcf-reading':'Reading','tcf-listening':'Listening','tcf-writing':'Writing','tcf-speaking':'Speaking',pronunciation:'Pronunciation',conversation:'Conversation',writing:'Writing trainer'};
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const pct=v=>numeric(v)?v.toFixed(1).replace(/\.0$/,'')+'%':'—';
export function renderLearningInsights(data,root){
 const wrap=el('section',undefined,'hz-insights');
 if(!data){wrap.append(el('p','Learning statistics are temporarily unavailable. Refresh progress to retry.'));return wrap}
 const modules=data.modules||[],activity=data.activity||[],course=data.course||{};
 const exams=modules.filter(m=>/^(tef|tcf)-/.test(m.module)),practice=modules.filter(m=>!exams.includes(m));
 const sum=a=>a.reduce((n,m)=>n+Number(m.count||0),0);
 const stats=el('div',undefined,'hz-insights-stats');
 for(const [label,value,sub] of [['Course completion',course.total?Math.round(100*course.completed/course.total)+'%':'—',course.completed+' / '+course.total+' lessons'],['Mock test results',sum(exams),'Completed results / full assessments'],['AI practice',sum(practice),'Completed training activities'],['Active days',activity.filter(d=>d.count>0).length,'Last 30 days (UTC)']]){
  const card=el('article',undefined,'hz-insights-stat');card.append(el('span',label),el('strong',String(value)),el('small',sub));stats.append(card)
 }
 wrap.append(stats);
 const chart=el('section',undefined,'hz-insights-card');chart.append(el('h4','Your learning rhythm'),el('p','Saved activity over the last 30 days. Lesson activity uses the latest completion record.'));
 const bars=el('div',undefined,'hz-insights-bars');const max=Math.max(1,...activity.map(d=>d.count));
 for(const d of activity){const col=el('div',undefined,'hz-insights-bar-col'),bar=el('div',undefined,'hz-insights-bar');bar.style.height=Math.max(3,100*d.count/max)+'%';bar.title=d.day+': '+d.count+' activities';bar.setAttribute('aria-label',bar.title);col.append(bar);bars.append(col)}
 chart.append(bars,el('p',activity.length?activity[0].day+' — '+activity.at(-1).day:'No activity yet','hz-insights-muted'));wrap.append(chart);
 const grid=el('div',undefined,'hz-insights-exams');
 for(const exam of ['tef','tcf']){
  const card=el('section',undefined,'hz-insights-card');card.append(el('h4',exam.toUpperCase()+' Canada'),el('p','Saved mock-test performance'));
  for(const m of exams.filter(m=>m.module.startsWith(exam+'-'))){
   const row=el('div',undefined,'hz-insights-module');const top=el('div',undefined,'hz-insights-module-top');top.append(el('strong',names[m.module]),el('span',m.count+' results'));row.append(top);
   if(numeric(m.average)){
    row.append(el('strong',pct(m.average)+' average','hz-insights-score'),el('span','Best '+pct(m.best),'hz-insights-muted'));
    const track=el('div',undefined,'hz-insights-track'),fill=el('div');fill.style.width=Math.max(0,Math.min(100,m.average))+'%';track.append(fill);row.append(track);
    const history=el('div',undefined,'hz-insights-history');for(const r of m.recent||[]){const item=el('div',pct(r.percent));item.title=r.test+' · '+new Date(r.at).toLocaleDateString();history.append(item)}row.append(history);
   }else if(m.latestEstimate){const e=m.latestEstimate;row.append(el('strong',e.nclc!=null?'Estimated NCLC '+e.nclc:'Estimated score '+(e.score??'—'),'hz-insights-score'),el('small','AI assessment · '+new Date(e.at).toLocaleDateString()))}
   else row.append(el('p','No scored result yet','hz-insights-muted'));
   card.append(row)
  }grid.append(card)
 }
 wrap.append(grid);
 const coaching=el('section',undefined,'hz-insights-card');coaching.append(el('h4','What to work on next'));
 const scored=exams.filter(m=>numeric(m.average)).sort((a,b)=>a.average-b.average);
 if(scored.length)coaching.append(el('p','Prioritize '+scored[0].module.toUpperCase().replace('-',' ')+' — your lowest recorded objective average is '+pct(scored[0].average)+'.'));
 else coaching.append(el('p','Complete a reading or listening mock to establish a baseline.'));
 if(data.notebookDue>0)coaching.append(el('p',data.notebookDue+' saved lesson mistakes are due for revision.'));
 const feedback=data.recentFeedback||[];for(const f of feedback.slice(0,4)){const item=el('article',undefined,'hz-insights-feedback');item.append(el('strong',f.module.replaceAll('-',' ').toUpperCase()),el('small',new Date(f.at).toLocaleDateString()));if(f.summary)item.append(el('p',f.summary));for(const tip of (f.tips||[]).filter(Boolean).slice(0,2))item.append(el('p',tip));coaching.append(item)}
 const ask=el('button','Discuss my progress with HZad French Tutor','hz-btn');ask.type='button';ask.addEventListener('click',()=>root.dispatchEvent(new CustomEvent('hzad-open-french-tutor')));coaching.append(ask,el('p','Opening the tutor is free. Sending a message uses the usual AI credit charge.','hz-insights-muted'));wrap.append(coaching);return wrap;
}
