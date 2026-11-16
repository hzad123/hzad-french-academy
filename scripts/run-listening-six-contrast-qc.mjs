import {mkdir,readFile,copyFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {POLICY_VERSION,MODELS} from '../supabase/functions/academy-listening-qc/contracts.js';
import {loadJson,saveJson,exists,hash,policyHash,contentHash,createGatewayProvider,paperInput,blindVerdict,letters} from './lib/listening-answer-qc.mjs';
import {protocol,positionsWithFrozenSpoken,sourceInvariant,repair,measure,summarize,ready,rewrite,contrastPlan,authorInput} from './lib/listening-contrast-quality.mjs';
const args=process.argv.slice(2),get=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(get('--out','work/listening-six-contrast-v2'));await mkdir(root,{recursive:true});
const seedFile=join(root,'seed.json'),seed=await exists(seedFile)?(await loadJson(seedFile)).seed:randomBytes(32).toString('hex');await saveJson(seedFile,{seed});
await saveJson(join(root,'summary.json'),{protocol,policy:POLICY_VERSION,policyHash,readyForMedia:false,status:'running'});
const provider=await createGatewayProvider({url:process.env.LISTENING_QC_URL,token:process.env.LISTENING_QC_TOKEN,adminToken:process.env.LISTENING_QC_ADMIN_TOKEN,
 directory:join(root,'model-receipts'),maxUsd:Number(get('--max-usd','35'))});
const papers=[],originals=[],evidence=[],imageMaps=[],positions=[],errors=[],baseline=[],baselineMini=[],runNonce=randomBytes(12).toString('hex');
const workers=Number(get('--workers','8'));
const designSeeds=await loadJson('curriculum/tcf-listening-contrast-design-seeds.json');
const controls=[
 {question:'Dans quelle salle la réunion se tiendra-t-elle ?',choices:['Dans la salle deux.','Dans la salle trois.','Dans la salle quatre.','Dans la salle cinq.'],clear:false},
 {question:'À quelle heure commence la consultation ?',choices:['À huit heures quinze.','À neuf heures quinze.','À dix heures quinze.','À onze heures quinze.'],clear:false},
 {question:'Quelle raison explique la décision évoquée ?',choices:["Un changement d'horaire.","Un changement d'adresse.","Un changement d'équipe.",'Un changement de tarif.'],clear:false,classification:true},
 {question:'Pourquoi le bus arrive-t-il en retard ?',choices:['Des travaux ralentissent son trajet.','Les trottoirs ont appris à voler.','Les voyageurs arrivent hier matin.','Le café a changé de couleur.'],clear:true}
];
const calibration=[];
for(const [i,{clear,classification=false,...input}] of controls.entries()){
 const receipt=await provider('blind',input,{nonce:'v2-control:'+i});
 // This qualitative control has no known key or measured frequency prior:
 // test classification of a clear cue, not equality of its subjective odds.
 // Actual examination items retain the full probability/gap admission gate.
 const noCue=!receipt.result.standsOut&&!receipt.result.cues.some(c=>c.severity!=='weak');
 calibration.push({input,clear,classification,receipt,pass:classification?noCue:clear?!blindVerdict(receipt.result).pass:blindVerdict(receipt.result).pass});
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
 await saveJson(join(root,'baseline-mini.json'),baselineMini);
}
async function processQuestion([p,index]){
 const original=originals[p].questions[index],image=imageMaps[p].get(original.number),file=join(root,'test'+String(p+1).padStart(2,'0'),`q-${original.number}.json`);
 let saved=null;
 if(await exists(file))saved=await loadJson(file);
 const designSeed=designSeeds.find(s=>s.test===p+1&&s.number===index+1&&s.sourceHash===contentHash(original));
 const designSeedHash=designSeed?hash(designSeed.authored):null;
 if(saved?.policyHash===policyHash&&saved.sourceHash===contentHash(original)&&saved.pass&&!saved.blocked&&saved.contentHash===contentHash(saved.question)&&(!saved.designSeedHash||saved.designSeedHash===designSeedHash)){
  evidence[p].questions[index]=saved;papers[p].questions[index]=saved.question;return;
 }
 try{
  let starting=saved?.policyHash===policyHash?saved.question:null;
  if(designSeed&&(!starting||saved?.designSeedHash!==designSeedHash)){
   if(!contrastPlan(original,designSeed.authored).pass)throw Error('Design example lacks faithful anchors');
   starting=rewrite(original,designSeed.authored,positions[p][index],`${seed}:human-design:${p}:${index}`);
  }
  if(saved?.policyHash===policyHash&&saved.regenerateFrom){
   // Only the blind reviewer's observable cue is diagnostic. Whether its
   // mandatory guess happened to match the key is never sent to the author.
   const authored=await provider('author',authorInput(original,{imageData:image?.data,feedback:saved.regenerateFrom}),{nonce:`heldout-cue-repair:${runNonce}:${p}:${index}`});
   if(!contrastPlan(original,authored.result).pass)throw Error('Held-out cue repair lacks faithful anchors');
   starting=rewrite(original,authored.result,positions[p][index],`${seed}:heldout-cue:${runNonce}:${p}:${index}`);
  }
  const result=await repair(original,provider,{target:positions[p][index],seed:`${seed}:${p}:${index}:${saved?runNonce:'initial'}`,starting,imageData:image?.data,maxAttempts:6,
   onAttempt:r=>saveJson(join(root,'test'+String(p+1).padStart(2,'0'),`attempt-${original.number}.json`),r)});
  result.imageHash=image?.hash??null;result.designSeedHash=designSeedHash;await saveJson(file,result);evidence[p].questions[index]=result;papers[p].questions[index]=result.question;
  console.log(`Test${p+1} Q${index+1}: ${result.pass?'STRICT PASS':'BLOCKED'} (${result.rounds??0} rewrites)`);
 }catch(error){errors.push({test:p+1,number:index+1,error:error.message});evidence[p].questions[index]={pass:false,blocked:true,error:error.message};console.log(`Test${p+1} Q${index+1}: ERROR ${error.message}`);}
}
// A fresh baseline is descriptive only; no baseline guess is fed to authors.
const all=originals.flatMap((p,i)=>p.questions.map((q,index)=>[i,index]));
// Historical baseline receipts remain descriptive evidence if their exact
// displayed source is unchanged. They cannot approve any replacement content.
const previousBaseline=await exists(join(root,'baseline.json'))?await loadJson(join(root,'baseline.json')):[];
const previousMini=await exists(join(root,'baseline-mini.json'))?await loadJson(join(root,'baseline-mini.json')):[];
for(const r of [...previousBaseline,...previousMini]){
 const q=originals[r.test-1]?.questions[r.number-1];
 const bucket=r.receipt?.model?.startsWith(MODELS.blind)?baseline:r.receipt?.model?.startsWith(MODELS.challenge)?baselineMini:null;
 if(bucket&&q&&q.number>=9&&['blind','challenge'].includes(r.receipt?.stage)&&r.receipt.responseId?.startsWith('chatcmpl-')&&[...r.order].sort().join('')==='0123'&&r.receipt.inputHash===hash({question:q.question,choices:r.order.map(i=>q.options[i])})&&r.correct===(r.order[r.receipt.result.guess]===letters.indexOf(q.correct))&&!bucket.some(x=>x.test===r.test&&x.number===r.number))bucket.push(r);
}
// Stop a weak design after three different source situations, before paying
// for the18-item pilot or the complete cohort. Final coverage remains234.
const probe=[[0,29],[2,37],[5,38]];await parallel(probe,processQuestion);await save();
if(probe.some(([p,i])=>!evidence[p].questions[i]?.pass)){
 await saveJson(join(root,'summary.json'),{protocol,policyHash,status:'design-probe-blocked',readyForMedia:false,probeSample:3,probePassed:probe.filter(([p,i])=>evidence[p].questions[i]?.pass).length,errors});process.exit(1);
}
const pilot=all.filter(([,i])=>[29,37,38].includes(i));await parallel(pilot.filter(([p,i])=>!probe.some(([a,b])=>a===p&&b===i)),processQuestion);await save();
if(pilot.some(([p,i])=>!evidence[p].questions[i]?.pass)){
 await saveJson(join(root,'summary.json'),{protocol,policy:POLICY_VERSION,policyHash,status:'pilot-blocked',readyForMedia:false,pilotSample:18,pilotPassed:pilot.filter(([p,i])=>evidence[p].questions[i]?.pass).length,errors});
 process.exit(1);
}
for(const [stage,bucket] of [['blind',baseline],['challenge',baselineMini]]){
 await parallel(all.filter(([p,i])=>i>=8&&!bucket.some(r=>r.test===p+1&&r.number===i+1)),async([p,i])=>{try{
  const r=await measure(originals[p].questions[i],provider,`baseline-v2:${stage}:${seed}:${p}:${i}`,stage);bucket.push({test:p+1,number:i+1,...r});
 }catch(error){errors.push({stage:'baseline-'+stage,test:p+1,number:i+1,error:error.message});}});
}
await save();
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
    const authored=await provider('author',authorInput(original,{imageData:image?.data,feedback:{paperPatterns:audit.patterns}}),{nonce:`pattern-v2:${seed}:${p}:${round}:${number}`});
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
 await parallel(all,async([p,i])=>{try{
  const [heldout,challenge]=await Promise.all([measure(papers[p].questions[i],provider,`frozen-v2:${freeze.nonce}:${p}:${i}`),measure(papers[p].questions[i],provider,`frozen-challenge-v2:${freeze.nonce}:${p}:${i}`,'challenge')]);
  Object.assign(evidence[p].questions[i],{heldout,challenge});
 }catch(error){errors.push({stage:'heldout',test:p+1,number:i+1,error:error.message});}});
 // Retain the complete experiment, including every successful blind guess.
 // A clear cue rejects that item for the next authoring pass. Accuracy alone
 // never selects individual questions for rewriting or permits rerolling.
 await saveJson(join(root,'experiments',freeze.hash+'.json'),{freeze,papers,evidence,statistics:summarize(papers,evidence)});
 for(const [p,i] of all){
  const r=evidence[p].questions[i],result=r.heldout?.receipt.result;
  if(result&&!blindVerdict(result).pass){
   r.pass=false;r.blocked=true;r.regenerateFrom={stage:'blind',reason:result.reason,cues:result.cues,plausibility:result.plausibility};
   await saveJson(join(root,'test'+String(p+1).padStart(2,'0'),`q-${i+1}.json`),r);
  }
 }
}
const stats=summarize(papers,evidence),accepted=ready(papers,evidence,stats);
await save();await saveJson(join(root,'cohort.json'),{protocol,policy:POLICY_VERSION,policyHash,papers:papers.map((p,i)=>({paper:p,evidence:evidence[i],images:Object.fromEntries(imageMaps[i])})),statistics:stats});
const summary={protocol,policy:POLICY_VERSION,policyHash,tests:[1,2,3,4,5,6],readyForMedia:accepted,status:accepted?'accepted':'blocked',acceptedItems:evidence.reduce((n,e)=>n+e.questions.filter(r=>r?.pass&&!r.blocked).length,0),totalItems:234,
 statistics:stats,baseline:{written:summaryGroup(baseline),late:summaryGroup(baseline.filter(r=>r.number>=23))},baselineMini:{written:summaryGroup(baselineMini),late:summaryGroup(baselineMini.filter(r=>r.number>=23))},errors};
function summaryGroup(rows){return {sample:rows.length,correct:rows.filter(r=>r.correct).length,accuracy:rows.length?rows.filter(r=>r.correct).length/rows.length:null};}
await saveJson(join(root,'summary.json'),summary);console.log(JSON.stringify(summary,null,2));if(!accepted)process.exitCode=1;
