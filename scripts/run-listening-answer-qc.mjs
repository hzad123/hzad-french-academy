// Offline, resumable author -> isolated blind adversary -> independent grounding.
// Never called from a student request. No live publication or scoring changes.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {POLICY_VERSION} from '../supabase/functions/academy-listening-qc/contracts.js';
import {hash,exists,loadJson,saveJson,loadJson as read,contentHash,balancedPositions,repairQuestion,measureHeldout,policyHash,blindVerdict,binomialUpperTail,
 createGatewayProvider,paperInput,attackStatistics,blindProjection,stimulus,mode,applyAlternatives} from './lib/listening-answer-qc.mjs';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const directory=resolve(value('--out','work/listening-answer-qc'));
const selection=value('--tests','1-20');
const numbers=selection.includes('-')?(()=>{const [a,b]=selection.split('-').map(Number);return Array.from({length:b-a+1},(_,i)=>a+i)})():selection.split(',').map(Number);
if(numbers.some(n=>!Number.isInteger(n)||n<1||n>20)||new Set(numbers).size!==numbers.length)throw Error('Select distinct listening tests01–20');
await mkdir(directory,{recursive:true});
const seedFile=join(directory,'seed.json');
const seed=await exists(seedFile)?(await read(seedFile)).seed:randomBytes(32).toString('hex');
await saveJson(seedFile,{seed});
const provider=await createGatewayProvider({url:process.env.LISTENING_QC_URL,token:process.env.LISTENING_QC_TOKEN,adminToken:process.env.LISTENING_QC_ADMIN_TOKEN,
 directory:join(directory,'model-receipts'),maxUsd:Number(value('--max-usd','20'))});
const all=[],proofs=[],errors=[],baseline=[];
const workers=Number(value('--workers','6'));
async function parallel(items,fn){let index=0;return Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{while(index<items.length){const i=index++;await fn(items[i],i)}}));}
async function source(number) {
 const label=String(number).padStart(2,'0');
 const file=number>=3&&number<=6?`supabase/exams/tcf-listening-test${label}-v3.json`:`supabase/exams/tcf-listening-test${label}.json`;
 const paper=await read(file);return {paper,file,root:join('assets/tcf-listening',number===1?'v1':paper.version)};
}
for(const number of numbers) {
 const label=String(number).padStart(2,'0'),src=await source(number),original=src.paper;
 const folder=join(directory,'test'+label);await mkdir(folder,{recursive:true});
 const paper=structuredClone(original);paper.version=`tcf-listening-2026-11-test${label}-v4`;
 const positions=balancedPositions(39,seed+':positions:'+paper.id),records=Array(39),images=new Map();
 for(const q of original.questions.slice(0,4)) {
  const from=join(src.root,'images',q.image),to=join(folder,'images',q.image);
  await mkdir(join(folder,'images'),{recursive:true});await copyFile(from,to);
  const png=join(folder,'images','q-'+String(q.number).padStart(2,'0')+'.png');
  execFileSync('python3',['scripts/rasterize-listening-qc.py',from,png],{stdio:'pipe'});
  images.set(q.number,{data:'data:image/png;base64,'+(await readFile(png)).toString('base64'),sourceHash:hash(await readFile(from))});
 }
 console.log(`Test${label}: reviewing39 items, including all spoken-choice items.`);
 await parallel(original.questions,async(q,index)=>{
  const checkpoint=join(folder,`q-${String(q.number).padStart(2,'0')}.json`),image=images.get(q.number);
  try {
   if(q.number>=9) {
    const measured=await measureHeldout(q,provider,{seed:seed+':baseline:'+paper.id+':'+q.number});
    baseline.push({test:paper.id,number:q.number,correct:measured.correct,assessment:measured});
   }
   if(await exists(checkpoint)) {
    const saved=await read(checkpoint);
    if(saved.policyHash===policyHash&&saved.sourceHash===contentHash(q)&&saved.imageHash===(image?.sourceHash??null)&&saved.proof?.pass&&saved.proof.contentHash===contentHash(saved.question)) {
     paper.questions[index]=saved.question;records[index]=saved;return;
    }
   }
   const result=await repairQuestion(q,provider,{target:positions[index],seed:seed+':'+paper.id+':'+q.number,imageData:image?.data,maxAttempts:6,
    onAttempt:attempt=>saveJson(join(folder,`attempt-${q.number}.json`),attempt)});
   const record={number:q.number,policy:POLICY_VERSION,policyHash,sourceHash:contentHash(q),imageHash:image?.sourceHash??null,...result};
   records[index]=record;paper.questions[index]=result.question;await saveJson(checkpoint,record);
   console.log(`Test${label} Q${q.number}: ${result.blocked?'BLOCKED':'independently passed'} after${result.rounds} rewrite(s)`);
  }catch(error){errors.push({test:paper.id,number:q.number,error:error.message});records[index]={number:q.number,blocked:true,error:error.message};console.log(`Test${label} Q${q.number}: pending (${error.message})`);}
 });
 let paperAssessment=null;
 if(records.every(record=>record?.proof?.pass)) {
  for(let round=0;round<3;round++) {
   try{paperAssessment=await provider('paper',paperInput(paper));}
   catch(error){errors.push({test:paper.id,error:error.message});break;}
   if(paperAssessment.result.pass&&paperAssessment.result.patterns.length===0)break;
   if(round===2)break;
   const flagged=new Set(paperAssessment.result.patterns.flatMap(pattern=>pattern.questions));
   if(!flagged.size)break;
   for(const qNumber of flagged) {
    if(qNumber<1||qNumber>39)continue;
    const q=paper.questions[qNumber-1],image=images.get(qNumber);
    try {
     const authored=await provider('author',{...blindProjection(q),stimulus:stimulus(original.questions[qNumber-1]),mode:mode(q),
      feedback:{paperPatterns:paperAssessment.result.patterns,round},...(image?{imageData:image.data}:{})});
     const revised=applyAlternatives(original.questions[qNumber-1],authored.result,positions[qNumber-1],seed+':paper:'+round+':'+qNumber);
     const result=await repairQuestion(revised,provider,{target:positions[qNumber-1],seed:seed+':paper-recheck:'+round+':'+qNumber,imageData:image?.data,maxAttempts:4});
     records[qNumber-1]={number:qNumber,policy:POLICY_VERSION,policyHash,sourceHash:contentHash(original.questions[qNumber-1]),imageHash:image?.sourceHash??null,...result};
     paper.questions[qNumber-1]=result.question;
     await saveJson(join(folder,`q-${String(qNumber).padStart(2,'0')}.json`),records[qNumber-1]);
    }catch(error){errors.push({test:paper.id,number:qNumber,error:error.message});records[qNumber-1].blocked=true;break;}
   }
   if(records.some(record=>!record?.proof?.pass||record.blocked))break;
  }
 }
 const evidence={policy:POLICY_VERSION,policyHash,test:paper.id,version:paper.version,source:src.file,sourceVersion:original.version,
  paperHash:hash(paper.questions.map(contentHash)),questions:records,paperAssessment};
 await saveJson(join(folder,'bank.json'),paper);await saveJson(join(folder,'evidence.json'),evidence);
 all.push(paper);proofs.push(evidence);
}
// Freeze every candidate before touching held-out measurements. These guesses
// are NEVER fed to authors or used to retain only individually wrong guesses.
for(let i=0;i<all.length;i++) {
 const paper=all[i],evidence=proofs[i];
 if(evidence.questions.some(r=>!r.proof?.pass||r.blocked)||!evidence.paperAssessment?.result.pass)continue;
 await parallel(paper.questions,async q=>{
  try{evidence.questions[q.number-1].heldout=await measureHeldout(q,provider,{seed:seed+':heldout-frozen:'+policyHash+':'+paper.id+':'+q.number});}
  catch(error){errors.push({test:paper.id,number:q.number,error:error.message});}
 });
 await saveJson(join(directory,'test'+paper.id.slice(-2),'evidence.json'),evidence);
}
const statistics=attackStatistics(all,proofs);
const ready=proofs.every(e=>e.questions.length===39&&e.questions.every(r=>r.proof?.pass&&!r.blocked&&r.heldout&&blindVerdict(r.heldout.receipt.result).pass)&&e.paperAssessment?.result.pass&&e.paperAssessment.result.patterns.length===0)&&statistics.heldout.passes&&
 !statistics.positionPatterns.some(p=>p.suspiciousFourItemDeck)&&
 Object.values(statistics.heuristicAttacks).every(a=>a.sample<100||binomialUpperTail(a.sample,Math.ceil(a.credit))>=0.01);
const summary={policy:POLICY_VERSION,tests:numbers,readyForMedia:ready,acceptedItems:proofs.reduce((n,p)=>n+p.questions.filter(r=>r.proof?.pass&&!r.blocked).length,0),
 totalItems:39*numbers.length,errors,statistics,baseline:{sample:baseline.length,correct:baseline.filter(r=>r.correct).length,accuracy:baseline.length?baseline.filter(r=>r.correct).length/baseline.length:null},
 note:'25% is assessed on unseen frozen written-choice items. Spoken/image choice diagnostics are separate; no fabricated model results or hand-adjusted success rate.'};
await saveJson(join(directory,'baseline.json'),baseline);await saveJson(join(directory,'summary.json'),summary);
console.log(JSON.stringify(summary,null,2));
if(!ready)process.exitCode=1;
