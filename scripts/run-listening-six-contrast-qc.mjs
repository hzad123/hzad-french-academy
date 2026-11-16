import {mkdir,readFile,copyFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {POLICY_VERSION} from '../supabase/functions/academy-listening-qc/contracts.js';
import {loadJson,saveJson,exists,hash,policyHash,contentHash,createGatewayProvider,paperInput,blindVerdict} from './lib/listening-answer-qc.mjs';
import {protocol,positionsWithFrozenSpoken,sourceInvariant,repair,measure,summarize,ready,rewrite,contrastPlan} from './lib/listening-contrast-quality.mjs';
import {spokenChoices,stimulus,mode} from './lib/listening-answer-qc.mjs';
const args=process.argv.slice(2),get=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(get('--out','work/listening-six-contrast-v2'));await mkdir(root,{recursive:true});
const seedFile=join(root,'seed.json'),seed=await exists(seedFile)?(await loadJson(seedFile)).seed:randomBytes(32).toString('hex');await saveJson(seedFile,{seed});
await saveJson(join(root,'summary.json'),{protocol,policy:POLICY_VERSION,policyHash,readyForMedia:false,status:'running'});
const provider=await createGatewayProvider({url:process.env.LISTENING_QC_URL,token:process.env.LISTENING_QC_TOKEN,adminToken:process.env.LISTENING_QC_ADMIN_TOKEN,
 directory:join(root,'model-receipts'),maxUsd:Number(get('--max-usd','35'))});
const papers=[],originals=[],evidence=[],imageMaps=[],positions=[],errors=[],baseline=[],runNonce=randomBytes(12).toString('hex');
const workers=Number(get('--workers','8'));
const controls=[
 {question:'Dans quelle salle la réunion se tiendra-t-elle ?',choices:['Dans la salle deux.','Dans la salle trois.','Dans la salle quatre.','Dans la salle cinq.'],clear:false},
 {question:'À quelle heure commence la consultation ?',choices:['À huit heures quinze.','À neuf heures quinze.','À dix heures quinze.','À onze heures quinze.'],clear:false},
 {question:'Pourquoi le bus arrive-t-il en retard ?',choices:['Des travaux ralentissent son trajet.','Les trottoirs ont appris à voler.','Les voyageurs arrivent hier matin.','Le café a changé de couleur.'],clear:true}
];
const calibration=[];
for(const [i,{clear,...input}] of controls.entries()){
 const receipt=await provider('blind',input,{nonce:'v2-control:'+i});calibration.push({input,clear,receipt,pass:clear?!blindVerdict(receipt.result).pass:blindVerdict(receipt.result).pass});
}
await saveJson(join(root,'calibration.json'),calibration);
if(calibration.some(c=>!c.pass)){await saveJson(join(root,'summary.json'),{protocol,policyHash,readyForMedia:false,status:'calibration-blocked'});process.exit(1);}
async function parallel(items,fn){let index=0;await Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{while(index<items.length){const i=index++;await fn(items[i]);}}));}
const bankFiles=await readdir('supabase/exams');
for(let n=1;n<=6;n++){
 const label=String(n).padStart(2,'0'),available=bankFiles.filter(f=>new RegExp(`^tcf-listening-test${label}-v[0-9]+\\.json$`).test(f)).sort((a,b)=>Number(b.match(/-v(\d+)\.json$/)[1])-Number(a.match(/-v(\d+)\.json$/)[1]));
 const source='supabase/exams/'+available[0],original=await loadJson(source),paper=structuredClone(original);paper.version=original.version.replace(/-v(\d+)$/,(_,v)=>'-v'+(Number(v)+1));
 const folder=join(root,'test'+label);await mkdir(join(folder,'images'),{recursive:true});const images=new Map();
 for(const q of original.questions.slice(0,4)){
  const from=join('assets/tcf-listening',original.version,'images',q.image),png=join(folder,'images',`q-${String(q.number).padStart(2,'0')}.png`);
  await copyFile(from,join(folder,'images',q.image));execFileSync('python3',['scripts/rasterize-listening-qc.py',from,png]);
  images.set(q.number,{hash:hash(await readFile(from)),data:'data:image/png;base64,'+(await readFile(png)).toString('base64')});
 }
 const e={protocol,policy:POLICY_VERSION,policyHash,test:paper.id,version:paper.version,source,sourceVersion:original.version,questions:Array(39).fill(null),paperAssessment:null};
 papers.push(paper);originals.push(original);evidence.push(e);imageMaps.push(images);positions.push(positionsWithFrozenSpoken(original,seed+paper.id));
}
async function save(){
 for(let p=0;p<6;p++){
  const folder=join(root,'test'+String(p+1).padStart(2,'0'));evidence[p].paperHash=hash(papers[p].questions.map(contentHash));
  await saveJson(join(folder,'bank.json'),papers[p]);await saveJson(join(folder,'evidence.json'),evidence[p]);
 }
 await saveJson(join(root,'progress.json'),{protocol,policyHash,papers:evidence.map(e=>({test:e.test,accepted:e.questions.filter(q=>q?.pass&&!q.blocked).length,lateAccepted:e.questions.filter(q=>q?.pass&&!q.blocked&&q.question.number>=23).length})),errors});
 await saveJson(join(root,'baseline.json'),baseline);
}
async function processQuestion([p,index]){
 const original=originals[p].questions[index],image=imageMaps[p].get(original.number),file=join(root,'test'+String(p+1).padStart(2,'0'),`q-${original.number}.json`);
 let saved=null;
 if(await exists(file))saved=await loadJson(file);
 if(saved?.policyHash===policyHash&&saved.sourceHash===contentHash(original)&&saved.pass&&!saved.blocked&&saved.contentHash===contentHash(saved.question)){
  evidence[p].questions[index]=saved;papers[p].questions[index]=saved.question;return;
 }
 try{
  const result=await repair(original,provider,{target:positions[p][index],seed:`${seed}:${p}:${index}:${saved?runNonce:'initial'}`,starting:saved?.policyHash===policyHash?saved.question:null,imageData:image?.data,maxAttempts:6,
   onAttempt:r=>saveJson(join(root,'test'+String(p+1).padStart(2,'0'),`attempt-${original.number}.json`),r)});
  result.imageHash=image?.hash??null;await saveJson(file,result);evidence[p].questions[index]=result;papers[p].questions[index]=result.question;
  console.log(`Test${p+1} Q${index+1}: ${result.pass?'STRICT PASS':'BLOCKED'} (${result.rounds??0} rewrites)`);
 }catch(error){errors.push({test:p+1,number:index+1,error:error.message});evidence[p].questions[index]={pass:false,blocked:true,error:error.message};console.log(`Test${p+1} Q${index+1}: ERROR ${error.message}`);}
}
// A fresh baseline is descriptive only; no baseline guess is fed to authors.
const all=originals.flatMap((p,i)=>p.questions.map((q,index)=>[i,index]));
await parallel(all.filter(([,i])=>i>=8),async([p,i])=>{try{const r=await measure(originals[p].questions[i],provider,`baseline-v2:${seed}:${p}:${i}`);baseline.push({test:p+1,number:i+1,...r});}catch(error){errors.push({stage:'baseline',test:p+1,number:i+1,error:error.message});}});
await saveJson(join(root,'baseline.json'),baseline);
const pilot=all.filter(([,i])=>[29,37,38].includes(i));await parallel(pilot,processQuestion);await save();
if(pilot.some(([p,i])=>!evidence[p].questions[i]?.pass)){
 await saveJson(join(root,'summary.json'),{protocol,policy:POLICY_VERSION,policyHash,status:'pilot-blocked',readyForMedia:false,pilotSample:18,pilotPassed:pilot.filter(([p,i])=>evidence[p].questions[i]?.pass).length,errors});
 process.exit(1);
}
await parallel(all.filter(([,i])=>![29,37,38].includes(i)),processQuestion);await save();
for(let p=0;p<6;p++){
 sourceInvariant(originals[p],papers[p]);
 if(evidence[p].questions.every(r=>r?.pass&&!r.blocked))try{
  for(let round=0;round<3;round++){
   evidence[p].paperAssessment=await provider('paper',paperInput(papers[p]),{nonce:'paper-v2:'+hash(papers[p].questions.map(contentHash))});
   const audit=evidence[p].paperAssessment.result;if(audit.pass&&!audit.patterns.length)break;if(round===2)break;
   const flagged=[...new Set(audit.patterns.flatMap(pattern=>pattern.questions))].filter(n=>Number.isInteger(n)&&n>=1&&n<=39);
   for(const number of flagged){
    const index=number-1,q=papers[p].questions[index],original=originals[p].questions[index],image=imageMaps[p].get(number);
    const authored=await provider('author',{question:q.question,choices:spokenChoices(q),stimulus:stimulus(original),mode:mode(q),feedback:{number,advanced:number>=23,paperPatterns:audit.patterns},...(image?{imageData:image.data}:{})},{nonce:`pattern-v2:${seed}:${p}:${round}:${number}`});
    if(!contrastPlan(original,authored.result).pass)throw Error('Pattern repair lacks transcript anchors');
    const candidate=rewrite(original,authored.result,positions[p][index],`${seed}:pattern:${p}:${round}:${number}`);
    const result=await repair(original,provider,{target:positions[p][index],seed:`${seed}:pattern-screen:${p}:${round}:${number}`,starting:candidate,imageData:image?.data,maxAttempts:4});
    result.imageHash=image?.hash??null;result.paperPatternAuthor=authored;evidence[p].questions[index]=result;papers[p].questions[index]=result.question;
    await saveJson(join(root,'test'+String(p+1).padStart(2,'0'),`q-${number}.json`),result);
   }
   if(!evidence[p].questions.every(r=>r?.pass&&!r.blocked))break;
  }
 }catch(error){errors.push({test:p+1,stage:'paper',error:error.message});}
}
await save();
// Freeze ALL234 before any held-out call. Revisions change the cohort hash and
// draw a wholly new measurement nonce; successful guesses are never filtered.
if(evidence.every(e=>e.questions.every(r=>r?.pass&&!r.blocked)&&e.paperAssessment?.result.pass&&!e.paperAssessment.result.patterns.length)){
 const freezeHash=hash(papers.map(p=>p.questions.map(contentHash))),file=join(root,'freeze.json');let freeze=await exists(file)?await loadJson(file):null;
 if(freeze?.hash!==freezeHash)freeze={hash:freezeHash,nonce:randomBytes(32).toString('hex')};await saveJson(file,freeze);
 await parallel(all,async([p,i])=>{try{evidence[p].questions[i].heldout=await measure(papers[p].questions[i],provider,`frozen-v2:${freeze.nonce}:${p}:${i}`);}catch(error){errors.push({stage:'heldout',test:p+1,number:i+1,error:error.message});}});
}
const stats=summarize(papers,evidence),accepted=ready(papers,evidence,stats);
await save();await saveJson(join(root,'cohort.json'),{protocol,policy:POLICY_VERSION,policyHash,papers:papers.map((p,i)=>({paper:p,evidence:evidence[i],images:Object.fromEntries(imageMaps[i])})),statistics:stats});
const summary={protocol,policy:POLICY_VERSION,policyHash,tests:[1,2,3,4,5,6],readyForMedia:accepted,status:accepted?'accepted':'blocked',acceptedItems:evidence.reduce((n,e)=>n+e.questions.filter(r=>r?.pass&&!r.blocked).length,0),totalItems:234,
 statistics:stats,baseline:{written:summaryGroup(baseline),late:summaryGroup(baseline.filter(r=>r.number>=23))},errors};
function summaryGroup(rows){return {sample:rows.length,correct:rows.filter(r=>r.correct).length,accuracy:rows.length?rows.filter(r=>r.correct).length/rows.length:null};}
await saveJson(join(root,'summary.json'),summary);console.log(JSON.stringify(summary,null,2));if(!accepted)process.exitCode=1;
