// Select entire optional, hand-authored contextual sentences/exchanges against
// the published Test01 spoken-length profile. Never truncate speech mid-sentence,
// pad silence, or modify playback speed. The MP3 renderer remains the final gate.
const words=s=>(s||'').trim().split(/\s+/).filter(Boolean).length;
export function selectOriginalAddenda(clips,additions,reference){
 const refMap=new Map(reference.questions.filter(q=>q.slotSeconds>0).map(q=>[q.number,words(q.transcript)]));
 const items=clips.map(clip=>({start:clip.start,base:words(clip.script),extra:words(additions[clip.start]),reference:refMap.get(clip.start)}));
 if(items.some(x=>!Number.isInteger(x.reference)))throw Error('Missing published benchmark recording');
 const target=items.reduce((s,x)=>s+x.reference-x.base,0);
 if(target<0)throw Error('Source bank longer than reference even before editorial review');
 // Knapsack with a cost for deviating from reference by clip. The global target
 // is near-equal spoken length, not manufactured extra response time.
 let dp=new Map([[0,{cost:0,taken:[]}]]);
 for(const it of items){
  const next=new Map();
  for(const [sum,state] of dp){
   const options=[{sum,cost:(it.base-it.reference)**2,take:false}];
   if(it.extra>0)options.push({sum:sum+it.extra,cost:(it.base+it.extra-it.reference)**2,take:true});
   for(const opt of options){
    const existing=next.get(opt.sum),value={cost:state.cost+opt.cost,taken:opt.take?[...state.taken,it.start]:state.taken};
    if(!existing||value.cost<existing.cost)next.set(opt.sum,value);
   }
  }
  dp=next;
 }
 const scored=[...dp].map(([sum,state])=>({sum,state,score:Math.abs(sum-target)*120+state.cost}));
 scored.sort((a,b)=>a.score-b.score||Math.abs(a.sum-target)-Math.abs(b.sum-target));
 const best=scored[0],picked=new Set(best.state.taken);
 return {picked,target,totalWords:items.reduce((s,x)=>s+x.base+(picked.has(x.start)?x.extra:0),0),referenceWords:items.reduce((s,x)=>s+x.reference,0),selected:items.filter(x=>picked.has(x.start)).map(x=>x.start),skipped:items.filter(x=>!picked.has(x.start)&&x.extra>0).map(x=>x.start)};
}
