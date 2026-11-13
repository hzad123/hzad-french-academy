import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const ref=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const {contexts}=JSON.parse(await readFile('curriculum/tcf-listening-03-20-editorial-contexts.json','utf8'));
const paperNos=process.argv.includes('--test')?[Number(process.argv[process.argv.indexOf('--test')+1])]:Array.from({length:18},(_,i)=>i+3);
const ready=process.argv.includes('--ready');
const refOrder=ref.questions.map(q=>q.kind);
const compare=[...ref.questions];
const genres=new Set(['image','response','announcement','dialogue','radio-news','telephone','interview','panel-discussion','television-report','debate','academic-monologue','commentary','roundtable','public-lecture']);
const assert=(p,msg)=>{if(!p)throw Error(msg)};
const textSeen=new Set(ref.questions.map(q=>q.transcript));
const keys=new Map();
for(const num of paperNos){
 const id=String(num).padStart(2,'0'),context=contexts.find(c=>c.n===num);
 const source=ready?'supabase/exams/tcf-listening-test'+id+'.json':'curriculum/tcf-listening-build/test'+id+'-audio-pending.json';
 const p=JSON.parse(await readFile(source,'utf8'));
 const version='tcf-listening-2026-11-test'+id+'-v1';
 const dir=join('assets/tcf-listening',version);
 assert(p.id==='tcf-listening-'+id&&p.version===version&&p.title.endsWith('Test '+id),'Paper identity mismatch: '+id);
 assert(p.questions.length===39&&p.seconds===2100,'Exam count/duration changed: '+id);
 let sum=0,answers=new Set(),forms=new Map(),rawLength=0;
 const manifest=ready?JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')):null;
 if(ready)assert(manifest.version===version&&manifest.files.length===39,'Missing audio manifest '+id);
 for(const [ix,q] of p.questions.entries()){
  const label=id+' Q'+(ix+1);
  assert(q.number===ix+1&&q.kind===refOrder[ix]&&genres.has(q.kind),'Original format changed: '+label);
  assert(q.options?.length===4&&new Set(q.options).size===4&&/^[ABCD]$/.test(q.correct),'Invalid multiple choice: '+label);
  assert(q.question.length>=18&&q.explanation.length>=40&&q.transcript.length>=75,'Poorly specified question: '+label);
  assert(Array.isArray(q.segments)&&q.segments.length>=2&&q.segments.every(s=>['female','male'].includes(s.voice)&&s.text?.length>5),'Missing complete voice segments: '+label);
  assert(!textSeen.has(q.transcript),'Duplicate transcript across tests: '+label);textSeen.add(q.transcript);
  assert(!q.transcript.includes('undefined')&&!q.transcript.includes('null'),'Unfilled authoring field: '+label);
  assert(q.transcript.includes('Question '+q.number+'.'),'Missing spoken question index: '+label);
  const spoken=q.segments.map(s=>s.text).join('\n');
  assert(spoken===q.transcript,'Transcript and spoken audio segments mismatch: '+label);
  assert(q.audio==='q-'+String(q.number).padStart(2,'0')+'.mp3','Media key changed: '+label);
  if(q.number<5){
   assert(q.image==='q-'+String(q.number).padStart(2,'0')+'.svg','Image key changed: '+label);
   assert((await stat(join(dir,'images',q.image))).size>600,'Missing illustrated stimulus: '+label);
  }else assert(!q.image,'Unexpected picture stimulus: '+label);
  if(q.number<=8)assert(q.options.every((o,i)=>o==='Proposition '+String.fromCharCode(65+i)),'Spoken-option format mismatch '+label);
  if(q.number>8)assert(!q.options.some(o=>o.startsWith('Proposition')),'Written-choice format mismatch '+label);
  answers.add(q.correct);forms.set(q.kind,(forms.get(q.kind)||0)+1);
  if(ready){
   assert(Number.isFinite(q.audioSeconds)&&q.audioSeconds>0&&q.slotSeconds-q.audioSeconds>=12,'Too little after-audio choice time: '+label);
   const bytes=await readFile(join(dir,'audio',q.audio));
   assert(bytes.length>1000,'Missing real French audio: '+label);
   const digest=createHash('sha256').update(bytes).digest('hex');
   const m=manifest.files[ix];
   assert(m.sha256===digest&&m.file===q.audio,'Recording hash/identity mismatch: '+label);
   const seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',join(dir,'audio',q.audio)],{encoding:'utf8'}));
   assert(Math.abs(seconds-q.audioSeconds)<0.3,'Incorrect audio length: '+label);
  }else{
   assert(q.audioSeconds===null&&q.slotSeconds===ref.questions[ix].slotSeconds,'Unreleased draft changed clock slots: '+label);
  }
  sum+=q.slotSeconds;
  rawLength+=q.transcript.length;
 }
 assert(sum===2100,'Thirty-five-minute timer changed: '+id);
 assert(answers.size===4,'Correct option placement not balanced across A-D: '+id);
 for(const kind of genres)assert(forms.has(kind),'Missing required listening genre '+kind+': '+id);
 assert(rawLength>13000,'Missing substantial source French material: '+id);
 keys.set(id,rawLength);
}
console.log((ready?'READY':'DRAFT')+' TCF listening validation PASSED: '+paperNos.length+' papers; '+(39*paperNos.length)+' unique items; 35min/test; all 14 genres; forward-only Test02 format preserved; '+(ready?'audio hashed':'no unpublished audio claims')+'.');
