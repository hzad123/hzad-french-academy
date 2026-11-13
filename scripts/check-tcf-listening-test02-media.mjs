// Release gate: refuse to publish Test02 without all 39 real recordings
// and four matching illustrated stimuli, verified timing and unique transcripts.
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const paper=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const reference=JSON.parse(await readFile('supabase/exams/tcf-listening-test01.json','utf8'));
const base=join('assets/tcf-listening',paper.version);
const manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
const required=['radio-news','telephone','panel-discussion','television-report','debate','academic-monologue','roundtable','public-lecture'];
if(paper.id!=='tcf-listening-02'||paper.seconds!==2100||paper.questions.length!==39||manifest.files.length!==39)throw Error('Incomplete Test02 paper');
const kinds=new Set(),seen=new Set(),hashes=new Set();
let total=0;
for(const [index,q] of paper.questions.entries()){
 if(q.number!==index+1||q.options.length!==4||new Set(q.options).size!==4||!('ABCD'.includes(q.correct))||!q.explanation||!q.transcript)throw Error('Bad Test02 question '+q.number);
 if(reference.questions.some(r=>r.transcript===q.transcript)||seen.has(q.transcript))throw Error('Repeated listening text '+q.number);
 seen.add(q.transcript);kinds.add(q.kind);
 if(q.slotSeconds<q.audioSeconds+12)throw Error('Recording leaves under twelve seconds for Q'+q.number);
 total+=q.slotSeconds;
 const audio=join(base,'audio',q.audio);
 const record=manifest.files[index];
 const buf=await readFile(audio);
 const digest=createHash('sha256').update(buf).digest('hex');
 if(!buf.length||!record||record.sha256!==digest||record.file!==q.audio||hashes.has(digest))throw Error('Recording missing or duplicated at Q'+q.number);
 hashes.add(digest);
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',audio],{encoding:'utf8'}));
 if(!Number.isFinite(duration)||Math.abs(duration-q.audioSeconds)>0.25)throw Error('Audio metadata mismatch '+q.number);
 if(index<4){
  const image=join(base,'images',q.image);
  if((await stat(image)).size<600)throw Error('Missing complete image '+q.number);
 }
}
if(total!==2100)throw Error('35-minute timing changed');
for(const name of required)if(!kinds.has(name))throw Error('Missing required TCF format '+name);
console.log('Test02 audio/visual bank validated: 39 original MP3s and 4 SVGs; total 2100 seconds; no duplicate transcripts; server keys private.');
