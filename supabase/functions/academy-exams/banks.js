import {SPECIFICATIONS} from '../../exams/specifications.js';
import {reading} from '../../exams/reading.js';
import {listening} from '../../exams/listening.js';
import tasks from '../../exams/productive-tasks-draft.json' with {type:'json'};
export const BANKS = Object.fromEntries(Object.keys(SPECIFICATIONS).map(exam=>{
 const version=exam+'-hzad-01-20261105';let index=0;
 function choices(row){const [prompt,correct,...rest]=row,distractors=rest.slice(0,3),explanation=rest[3],answer=index++%4,options=[...distractors];options.splice(answer,0,correct);return {prompt,options,answer,explanation}}
 const read=reading[exam].flatMap(([passage,questions])=>questions.map(row=>({id:version+'-r'+(index+1),passage,...choices(row)})));
 index=0;const listen=listening[exam].map(([transcript,...row])=>({id:version+'-l'+(index+1),transcript,audioPath:version+'/l'+(index+1)+'.mp3',...choices(row)}));
 const writing=structuredClone(tasks[exam].writing),speaking=structuredClone(tasks[exam].speaking);
 if(exam==='tcf-canada')speaking[2].monologue=true;
 if(exam==='tef-canada'){writing[0].responseSeconds=1500;writing[1].responseSeconds=2100}
 // The supplied TCF page confirms overall task-3 limits, not sub-part limits.
 for(const task of writing)for(const key of ['summaryMinWords','summaryMaxWords','opinionMinWords','opinionMaxWords'])delete task[key];
 return [exam,{exam,version,specification:SPECIFICATIONS[exam],sections:[
 {skill:'reading',navigation:'review',seconds:3600,items:read},
 {skill:'listening',navigation:'forward',seconds:SPECIFICATIONS[exam].sections.listening.seconds,items:listen},
 {skill:'writing',navigation:exam==='tef-canada'?'forward':'review',seconds:3600,items:writing},
 {skill:'speaking',navigation:'forward',seconds:SPECIFICATIONS[exam].sections.speaking.seconds,items:speaking}]}];
}));
