import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const v2=JSON.parse(await readFile('supabase/exams/tcf-listening-test03-v2.json','utf8'));
const pilot=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const prior=JSON.parse(await readFile('supabase/exams/tcf-listening-test03.json','utf8'));
const media=join('assets/tcf-listening',v2.version);
const manifest=JSON.parse(await readFile(join(media,'manifest.json'),'utf8'));
const terms=s=>String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]+/g,' ').split(' ').filter(Boolean);
const overlap=(a,b)=>{const five=t=>{const g=new Set;for(let i=0;i<=t.length-5;i++)g.add(t.slice(i,i+5).join(' '));return g};const x=five(terms(a)),y=five(terms(b));let hit=0;for(const v of x)if(y.has(v))hit++;return hit/Math.max(1,Math.min(x.size,y.size))};
test('Test03 v2 is 39 truly rewritten French scripts with retained TCF structure',()=>{
 assert.equal(v2.id,'tcf-listening-03');
 assert.equal(v2.version,'tcf-listening-2026-11-test03-v2');
 assert.equal(v2.seconds,2100);
 assert.equal(v2.questions.length,39);
 assert.equal(v2.questions.reduce((n,q)=>n+q.slotSeconds,0),2100);
 const formats=v2.questions.map(q=>q.kind);
 assert.deepEqual(formats,pilot.questions.map(q=>q.kind));
 let longest=0;
 for(const [i,q] of v2.questions.entries()){
  assert.equal(q.number,i+1);
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.options).size,4);
  assert.match(q.correct,/^[ABCD]$/);
  assert(q.explanation.length>=45);
  assert(q.audioSeconds>0);
  assert(q.slotSeconds-q.audioSeconds>=12);
  assert.deepEqual(q.segments.map(s=>s.text).join('\n'),q.transcript);
  const passage=q.segments.filter((s,j)=>j>0&&s.text!==q.question).map(s=>s.text).join(' ');
  const original=prior.questions[i].segments.filter((s,j)=>j>0&&s.text!==prior.questions[i].question).map(s=>s.text).join(' ');
  assert(overlap(passage,original)<0.55,'Still templated like old Test03 at Q'+q.number);
  const sample=pilot.questions[i].segments.filter((s,j)=>j>0&&s.text!==pilot.questions[i].question).map(s=>s.text).join(' ');
  assert(overlap(passage,sample)<0.55,'Test03 accidentally duplicates Test02 at Q'+q.number);
  if(i>=8){
   const lengths=q.options.map(o=>o.trim().length);
   const ratio=Math.max(...lengths)/Math.min(...lengths);
   longest=Math.max(longest,ratio);
   assert(ratio<=1.75,'Disproportionately long or short option Q'+q.number+' ratio '+ratio.toFixed(2));
   assert(!q.options.some(o=>/^[^.!?]{1,20}$/.test(o)),'Distractor lacks substantive meaning');
  }
 }
 console.log('Test03 v2 distinct French corpus and plausible-length options; largest option length ratio '+longest.toFixed(2));
});
test('Test03 v2 recorded MP3s are each complete and match the versioned paper manifest',async()=>{
 assert.equal(manifest.files.length,39);
 for(let i=0;i<39;i++){
  const q=v2.questions[i],file=join(media,'audio',q.audio),bytes=await readFile(file);
  assert(bytes.length>1000);
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest,manifest.files[i].sha256);
  let duration=q.audioSeconds;try{duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}));}catch(e){if(e.code!=='ENOENT')throw e;}
  assert(Math.abs(duration-q.audioSeconds)<0.25);
  if(i<4){
   const svg=await readFile(join(media,'images',q.image),'utf8');
   assert(svg.length>1400);
   assert(!svg.includes('data:image/'));
  }
 }
});
