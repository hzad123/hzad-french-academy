import {readFile,stat,access} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const blueprint=JSON.parse(await readFile('curriculum/tcf-listening-20-paper-blueprint.json','utf8'));
const first=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const slots=first.questions.map(q=>q.slotSeconds);
function assert(value,message){if(!value)throw Error(message)}
assert(blueprint.status==='EDITORIAL_PRODUCTION_BLUEPRINT_NOT_19_READY_TESTS','Never mislabel editorial briefs as published tests');
assert(blueprint.papers.length===19,'Exactly19 additional listening papers required');
assert(slots.reduce((a,b)=>a+b,0)===2100,'Reference slots must remain35minutes');
const kinds=new Set(['image','response','announcement','dialogue','radio-news','telephone','interview','panel-discussion','television-report','debate','academic-monologue','commentary','roundtable','public-lecture']);
for(let index=0;index<19;index++){
 const p=blueprint.papers[index],n=String(index+2).padStart(2,'0');
 assert(p.id==='tcf-listening-'+n&&p.number===index+2,'Wrong paper id/order '+n);
 assert(p.status==='EDITORIAL_BRIEFS_ONLY_NOT_PUBLISHED','Draft paper must stay unpublished');
 assert(p.seconds===2100&&p.questions.length===39,'Wrong test duration/count '+n);
 const topics=new Set();
 for(let i=0;i<39;i++){
  const q=p.questions[i];
  assert(q.number===i+1&&q.slotSeconds===slots[i],'Changed order or response slot '+p.id+' Q'+(i+1));
  assert(kinds.has(q.format),'Unknown genre '+q.format);
  assert(q.objective&&q.theme&&q.uniqueBrief,'Missing meaningful editorial objective');
  topics.add(q.theme);
 }
 assert(topics.size>=10,'Theme variety too narrow in '+p.id);
 for(const kind of ['radio-news','telephone','debate','academic-monologue','roundtable','public-lecture'])
  assert(p.questions.some(q=>q.format===kind),'Missing required format '+kind+' in '+p.id);
}
console.log('Listening expansion blueprint validated: Test01 preserved; 19 distinct paper plans, 741 slots; fixed 35min/39Q, genres and navigation. NOT playable tests.');
// Full paper release gate: deliberately separate from editorial briefs.
// Run after authoring new immutable banks and producing their actual recordings.
if(process.argv.includes('--verify-release')){
 const seen=new Set(first.questions.map(q=>q.transcript));
 for(let n=2;n<=20;n++){
  const label=String(n).padStart(2,'0');
  const path='supabase/exams/tcf-listening-test'+label+'.json';
  let paper;try{paper=JSON.parse(await readFile(path,'utf8'))}catch{throw Error('Missing complete listening bank: '+path)}
  assert(paper.id==='tcf-listening-'+label&&paper.seconds===2100&&paper.questions.length===39,'Invalid bank '+label);
  assert(paper.version!=='tcf-listening-2026-11-v1'&&!paper.version.includes('draft'),'Use immutable new version '+label);
  let total=0;
  for(const q of paper.questions){
   assert(q.number>0&&q.number<=39&&q.number===paper.questions.indexOf(q)+1,'Question order mismatch in '+label);
   assert(q.options?.length===4&&new Set(q.options).size===4,'Invalid answer choices '+label+' Q'+q.number);
   assert(/^[ABCD]$/.test(q.correct),'Invalid correct choice '+label+' Q'+q.number);
   assert(q.explanation?.length>=45&&q.transcript?.length>=60,'Incomplete transcription or explanation '+label+' Q'+q.number);
   assert(!seen.has(q.transcript),'Duplicate transcript across bank '+label+' Q'+q.number);
   seen.add(q.transcript);
   assert(Array.isArray(q.segments)&&q.segments.length>0,'Missing speakable segments '+label+' Q'+q.number);
   assert(q.slotSeconds>q.audioSeconds+4,'Audio does not leave sufficient time '+label+' Q'+q.number);
   total+=q.slotSeconds;
   if(q.image)await access(join('assets/tcf-listening',paper.version,'images',q.image));
   const audio=join('assets/tcf-listening',paper.version,'audio',q.audio);
   assert((await stat(audio)).size>1000,'Missing actual MP3 '+audio);
  }
  assert(total===2100,'Paper duration changed '+label);
 }
 console.log('Ready for independent human audio/editorial review. 19 new immutable banks and files validated.');
}
