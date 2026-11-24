import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const pad=n=>String(n).padStart(2,'0');
const sha=b=>createHash('sha256').update(b).digest('hex');
const reference=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const seen=new Map();const results=[];
function ngrams(s,n=6){const words=s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);const set=new Set();for(let i=0;i<=words.length-n;i++)set.add(words.slice(i,i+n).join(' '));return set}
for(let t=2;t<=7;t++){
 const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+pad(t)+'-v1.json','utf8'));
 const root='assets/tef-listening/'+bank.version,manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
 assert.equal(bank.id,'tef-listening-'+pad(t));assert.equal(bank.version,'tef-listening-2026-11-test'+pad(t)+'-v1');
 assert.equal(bank.questions.length,40);assert.equal(bank.seconds,2400);assert.equal(manifest.files.length,36);
 assert.equal(bank.questions.reduce((s,q)=>s+q.slotSeconds,0),2400,'Full 40-minute bank not achieved');
 const keys={A:0,B:0,C:0,D:0},audio=new Map(),pics=[];
 for(const [i,q] of bank.questions.entries()){
  const v=reference.questions[i],n=i+1;
  assert.equal(q.number,n);assert.equal(q.kind,v.kind,'Approved question sequence modified '+n);
  assert.equal(q.previewSeconds,v.previewSeconds,'Reading countdown changed Q'+n);
  assert.equal(q.groupStart,v.groupStart,'Shared audio groups changed Q'+n);
  assert.equal(q.groupEnd,v.groupEnd,'Shared audio groups changed Q'+n);
  assert.equal(q.options.length,4);assert(new Set(q.options.map(s=>s.toLowerCase().trim())).size===4);
  assert(q.question?.length>=12&&q.explanation?.length>=35&&q.transcript?.length>=140);
  assert(['A','B','C','D'].includes(q.correct));keys[q.correct]++;
  if([24,26,28,30].includes(n)){const prior=bank.questions[i-1];assert.equal(q.slotSeconds,0);assert.equal(q.audio,prior.audio);assert.equal(q.transcript,prior.transcript);assert.equal(q.audioSeconds,prior.audioSeconds);continue;}
  assert(q.slotSeconds>0&&q.audioSeconds>0);audio.set(q.audio,q.audioSeconds);
  const entry=manifest.files.find(x=>x.file===q.audio);assert(entry,'Missing manifest recording '+q.audio);
  const body=await readFile(root+'/audio/'+q.audio);
  assert.equal(sha(body),entry.sha256,'Audio digest mismatch Q'+n);
  // Match Python json.dumps(...,ensure_ascii=False,sort_keys=True)
  // so every MP3 is tied to the precise rendered French text and voices.
  const canonical='['+q.segments.map(x=>'{"text": '+JSON.stringify(x.text)+', "voice": '+JSON.stringify(x.voice)+'}').join(', ')+']';
  assert.equal(entry.sourceHash,sha(canonical),'Audio was generated from a different transcript Q'+n);
  const min=n<=4?12:n<=20?18:n<=22?34:n<=28?105:n===29?100:30;
  const max=n<=4?33:n<=20?39:n<=22?62:n<=28?137:n===29?135:66;
  assert(q.audioSeconds>=min&&q.audioSeconds<=max,'Recording length outside approved style band Q'+n+': '+q.audioSeconds);
  const post=n<=12?10:n>=23&&n<=28?30:15;
  assert(q.slotSeconds>=Math.ceil(q.audioSeconds+q.previewSeconds+post));
  assert(q.slotSeconds-(q.audioSeconds+q.previewSeconds+post)<2,'Artificial answer-time padding Q'+n);
  const fingerprint=sha(q.transcript.toLowerCase().replace(/\s+/g,' '));
  assert(!seen.has(fingerprint),'Recording reused across tests '+t+' and '+seen.get(fingerprint));
  seen.set(fingerprint,{test:t,n});
  if(n<=4){
   const p=root+'/images/'+q.image;const image=await readFile(p);
   assert(image.includes(Buffer.from('<svg')),'Missing SVG picture '+n);
   const original=await readFile('assets/tef-listening/'+reference.version+'/images/'+v.image);
   assert.notEqual(sha(image),sha(original),'Copied Test01 picture '+n);pics.push(sha(image));
  }
 }
 assert.equal(audio.size,36,'Not exactly 36 distinct audio clips');
 assert.equal(pics.length,4);assert.deepEqual(keys,{A:10,B:10,C:10,D:10});
 assert.equal(new Set(bank.questions.filter(q=>q.slotSeconds>0).map(q=>q.transcript)).size,36);
 results.push({test:t,questions:40,recordings:36,paired:[23,25,27,29].map(n=>({n,seconds:bank.questions[n-1].audioSeconds})),audioSec:+[...audio.values()].reduce((a,b)=>a+b,0).toFixed(1)});
}
console.log(JSON.stringify({status:'MEASURED_BANK_STRUCTURE_PASS_NOT_INDEPENDENT_SEMANTIC_QA',tests:results,questionCount:240,mediaCount:216},null,2));
