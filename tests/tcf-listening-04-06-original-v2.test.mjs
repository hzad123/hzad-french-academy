import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const old=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const oldBanks=await Promise.all([4,5,6].map(n=>readFile('supabase/exams/tcf-listening-test'+String(n).padStart(2,'0')+'.json','utf8').then(JSON.parse)));
const banks=await Promise.all([4,5,6].map(n=>readFile('supabase/exams/tcf-listening-test'+String(n).padStart(2,'0')+'-v2.json','utf8').then(JSON.parse)));
const tokens=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
const similarity=(a,b)=>{const gram=s=>{const t=tokens(s),x=new Set;for(let i=0;i<t.length-5;i++)x.add(t.slice(i,i+5).join(' '));return x};const a1=gram(a),b1=gram(b);let n=0;for(const w of a1)if(b1.has(w))n++;return n/Math.max(1,Math.min(a1.size,b1.size))};
test('Tests04-06 have original French passages, close choice lengths and unchanged exam rules',()=>{
 const seen=new Map;
 let longCorrect=0,all=0;
 for(let k=0;k<3;k++){
  const p=banks[k],prior=oldBanks[k];
  assert.equal(p.id,'tcf-listening-'+String(k+4).padStart(2,'0'));
  assert.equal(p.version,'tcf-listening-2026-11-test'+String(k+4).padStart(2,'0')+'-v2');
  assert.equal(p.seconds,2100);
  assert.equal(p.questions.reduce((n,q)=>n+q.slotSeconds,0),2100);
  assert.equal(p.questions.length,39);
  assert.deepEqual(p.questions.map(q=>q.kind),old.questions.map(q=>q.kind));
  const counts={A:0,B:0,C:0,D:0};
  for(let i=0;i<39;i++){
   const q=p.questions[i],q0=prior.questions[i],q1=old.questions[i];
   assert.equal(q.number,i+1);
   assert.equal(q.options.length,4);
   assert.equal(new Set(q.options).size,4);
   counts[q.correct]++;
   assert(q.audioSeconds>0&&q.slotSeconds-q.audioSeconds>=12);
   assert.equal(q.transcript,q.segments.map(s=>s.text).join('\n'));
   const body=s=>s.segments.filter((_,j)=>j>0).filter(t=>t.text!==s.question).map(t=>t.text).join(' ');
   assert(similarity(body(q),body(q0))<0.6,'Old template reused '+p.id+' Q'+q.number);
   assert(similarity(body(q),body(q1))<0.6,'Test02 script reused '+p.id+' Q'+q.number);
   const key=q.number+':'+q.kind; const existing=seen.get(key)||[];
   for(const transcript of existing)assert(similarity(body(q),transcript)<0.6,'Cross-paper script reuse '+p.id+' Q'+q.number);
   existing.push(body(q));seen.set(key,existing);
   if(q.number>=9){
    const sizes=q.options.map(o=>o.length),correctSize=q.options['ABCD'.indexOf(q.correct)].length;
    if(correctSize===Math.max(...sizes))longCorrect++;
    all++;
    assert(Math.max(...sizes)/Math.min(...sizes)<1.8,'Obvious answer length clue '+p.id+' Q'+q.number);
   }
  }
  assert(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))<=1,'Predictable answer imbalance in '+p.id);
 }
 assert(longCorrect/all<0.5,'Correct options are conspicuously longest across the set');
});
test('Tests04-06 recorded MP3s and original pictures verify against each immutable manifest',async()=>{
 const visualFingerprints=new Set;
 for(const p of banks){
  const root=join('assets/tcf-listening',p.version);
  const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  assert.equal(manifest.files.length,39);
  for(const [i,q] of p.questions.entries()){
   const file=join(root,'audio',q.audio);
   const bytes=await readFile(file);
   assert(bytes.length>1000);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files[i].sha256);
   const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}));
   assert(Math.abs(q.audioSeconds-duration)<0.25);
   if(i<4){
    const svg=await readFile(join(root,'images',q.image),'utf8');
    assert(svg.length>900);
    const fingerprint=svg.replace(/<text[^>]*>[\s\S]*?<\/text>/g,'').replace(/#[A-Fa-f0-9]{6}/g,'').replace(/\s+/g,'');
    assert(!visualFingerprints.has(fingerprint),'Same illustration reused across tests');
    visualFingerprints.add(fingerprint);
   }
  }
 }
});
