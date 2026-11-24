import {selectOriginalAddenda} from './lib/select-tef-listening-additions.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const ids=[2,3,4,5,6,7], pad=x=>String(x).padStart(2,'0');
const starts=new Set([23,25,27,29]), second=new Set([24,26,28,30]);
const all=[],reports=[];
const reference=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const normalize=s=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const grams=(s,n=5)=>{let w=normalize(s).split(' '),out=new Set();for(let i=0;i<=w.length-n;i++)out.add(w.slice(i,i+n).join(' '));return out};
const ext=s=>s.match(/\b(toujours|jamais|necessairement|systematiquement|exclusivement|automatiquement|integralement|seulement|uniquement|tous|aucun)\b/gi)||[];
const flag=[];
for(const id of ids){
 const {clips:authoredClips}=await import('../curriculum/tef-listening-02-07/test-'+pad(id)+'.mjs');
 const {sourceOverrides}=await import('../curriculum/tef-listening-02-07/editorial-source-overrides.mjs');
 const clips=authoredClips.map(clip=>({...clip,...(sourceOverrides[id]?.[clip.start]||{})}));
 const {additions}=await import('../curriculum/tef-listening-02-07/test-'+pad(id)+'-additions.mjs');
 const actualAdditions={...additions};for(const [n,v] of Object.entries(sourceOverrides[id]||{}))actualAdditions[n]=v.addendum||'';
 const selection=selectOriginalAddenda(clips,actualAdditions,reference);
 assert.equal(clips.length,36,'Missing authored sources Test'+id);
 const recorded=new Set(),keys={A:0,B:0,C:0,D:0},qstats=[],sources=[];
 const expected=Array.from({length:40},(_,i)=>i+1).filter(i=>!second.has(i));
 assert.deepEqual(clips.map(x=>x.start),expected,'Wrong recording sequence Test'+id);
 const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+pad(id)+'-v1.json','utf8'));
 assert.equal(bank.questions.length,40);assert.equal(bank.seconds,2400);assert.equal(bank.id,'tef-listening-'+pad(id));
 const orig=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
 for(const clip of clips){
   const fullScript=(clip.script.trim()+'\n'+(selection.picked.has(clip.start)?(actualAdditions[clip.start]||''):'')).trim();
   const nw=fullScript.split(/\s+/).length, min=clip.start<=4?43:clip.start<=12?53:clip.start<=20?62:clip.start<=22?85:clip.start<=28?270:clip.start===29?260:84;
   if(nw<min)flag.push({test:id,question:clip.start,category:'short_source',details:nw+' words; threshold '+min});
   const ident=normalize(clip.topic);
   if(recorded.has(ident))throw Error('Duplicate topic in test '+id+': '+ident);
   recorded.add(ident);
   sources.push({test:id,n:clip.start,topic:clip.topic,script:fullScript,words:nw,grams:grams(fullScript)});
 }
 for(const q of bank.questions){
  const lens=q.options.map(x=>x.length), i='ABCD'.indexOf(q.correct),mn=Math.min(...lens),mx=Math.max(...lens);
  assert.equal(q.options.length,4);
  assert(mn>10,'Short option in test '+id+' q'+q.number);
  keys[q.correct]++;
  if(mx>mn*2.15)flag.push({test:id,question:q.number,category:'option_length_range',details:lens});
  if(lens[i]===mx&&lens.filter(x=>x===mx).length===1)flag.push({test:id,question:q.number,category:'correct_unique_longest',details:lens});
  if(ext(normalize(q.options.filter((v,j)=>j!==i).join(' '))).length>=2)flag.push({test:id,question:q.number,category:'absolute_word_distractors',details:q.options.filter((v,j)=>j!==i)});
  const qgrams=grams(q.question,3);
  const origs=orig.questions[q.number-1];
  const intersect=[...qgrams].filter(x=>grams(origs.question,3).has(x));
  if(intersect.length>=7)flag.push({test:id,question:q.number,category:'similar_stem_to_reference',details:intersect});
  if(second.has(q.number)){
    assert.equal(q.audio,bank.questions[q.number-2].audio);
    let prev=bank.questions[q.number-2];
    const nums=normalize(prev.options.join(' ')).split(' '),other=normalize(q.options.join(' '));
    const overlap=new Set(nums.filter(w=>w.length>=9&&other.includes(w)));
    if(overlap.size>2)flag.push({test:id,question:q.number,category:'possible_paired_answer_leakage',details:[...overlap]});
  }
  qstats.push({n:q.number,key:q.correct,lengths:lens});
 }
 assert.deepEqual(keys,{A:10,B:10,C:10,D:10},'Answer balance failed');
 all.push(...sources);reports.push({test:id,questions:40,recordings:clips.length,words:sources.reduce((x,y)=>x+y.words,0),keys});
}
for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
 const a=all[i],b=all[j];const intersection=[...a.grams].filter(x=>b.grams.has(x)).length;
 const similarity=intersection/Math.max(1,Math.min(a.grams.size,b.grams.size));
 if(similarity>=.3)flag.push({test:a.test,question:a.n,category:'source_similarity',details:{otherTest:b.test,otherQuestion:b.n,similarity:+similarity.toFixed(3)}});
 const topicA=new Set(normalize(a.topic).split(' ').filter(x=>x.length>4));
 const topicB=new Set(normalize(b.topic).split(' ').filter(x=>x.length>4));
 const common=[...topicA].filter(x=>topicB.has(x));
 if(common.length>=3)flag.push({test:a.test,question:a.n,category:'topic_overlap',details:{otherTest:b.test,otherQuestion:b.n,common}});
}
await mkdir('work/tef-listening-02-07',{recursive:true});
await writeFile('work/tef-listening-02-07/draft-quality.json',JSON.stringify({status:'UNPUBLISHED_EDITORIAL_DRAFT_NOT_SEMANTICALLY_VERIFIED',reports,flags:flag},null,2)+'\n');
console.log(JSON.stringify({total:reports.reduce((s,x)=>s+x.questions,0),recordings:all.length,summary:reports,qualityFlags:Object.fromEntries([...new Set(flag.map(x=>x.category))].map(k=>[k,flag.filter(x=>x.category===k).length]))},null,2));
