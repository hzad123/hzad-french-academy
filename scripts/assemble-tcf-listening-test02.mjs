// Authoring-only assembler: validate the 39 original Test02 French items.
// Do not publish the paper before matching verified recordings have been built.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const files=['curriculum/tcf-listening-test02-authored-01-20.json','curriculum/tcf-listening-test02-authored-21-39.json'];
const parts=await Promise.all(files.map(async path=>JSON.parse(await readFile(path,'utf8'))));
const questions=parts.flatMap(p=>p.questions);
if(parts.some(p=>p.paper!==2||p.status!=='AUTHORED_TEXT_AUDIO_PENDING')||questions.length!==39)throw Error('Test02 editorial parts incomplete');
const answerKinds=new Set(['A','B','C','D']),transcripts=new Set();
const assembled=questions.map((draft,index)=>{
 const number=index+1,original=base.questions[index];
 if(draft.number!==number||!answerKinds.has(draft.correct)||draft.options?.length!==4||new Set(draft.options).size!==4)
  throw Error('Invalid Test02 question '+number);
 if(!draft.segments?.length||!draft.segments.every(s=>['male','female'].includes(s.voice)&&s.text?.length>=10))
  throw Error('Incomplete speaker segments '+number);
 if(draft.question.length<12||draft.explanation.length<40)throw Error('Weak item '+number);
 const spoken=[{voice:'female',text:'Question '+number+'.'},...draft.segments];
 if(number>=9)spoken.push({voice:'female',text:draft.question});
 const transcript=spoken.map(s=>s.text).join('\n');
 if(transcripts.has(transcript))throw Error('Duplicate script '+number);
 transcripts.add(transcript);
 return {
  number,kind:draft.kind,question:draft.question,options:draft.options,
  correct:draft.correct,explanation:draft.explanation,transcript,segments:spoken,
  ...(number<=4?{image:'q-'+String(number).padStart(2,'0')+'.svg'}:{}),
  // Audio metadata is populated only after real synthesis/verification.
  audio:'q-'+String(number).padStart(2,'0')+'.mp3',
  audioSeconds:null,slotSeconds:original.slotSeconds
 };
});
const paper={id:'tcf-listening-02',version:'tcf-listening-2026-11-test02-v1',title:'TCF Listening · Test 02',seconds:2100,questions:assembled};
if(paper.questions.reduce((n,q)=>n+q.slotSeconds,0)!==2100)throw Error('35 minute timer changed');
await mkdir('curriculum/tcf-listening-build',{recursive:true});
const dest=resolve('curriculum/tcf-listening-build/test02-audio-pending.json');
await writeFile(dest,JSON.stringify(paper,null,2)+'\n');
console.log('Authored Test02 bank assembled: 39 original scripts, 39 marked keys, 35m timing; awaiting 39 MP3s and 4 visuals before publication. '+dest);
