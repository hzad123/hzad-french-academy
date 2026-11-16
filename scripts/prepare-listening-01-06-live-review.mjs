// Explicit owner-requested review release. Never mislabels failed blind QA as
// accepted. Every item still requires an independently supported unique key.
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {POLICY_VERSION} from '../supabase/functions/academy-listening-qc/contracts.js';
import {hash,contentHash,policyHash,loadJson,saveJson,exists,createGatewayProvider,balancedPositions,applyAlternatives,
 blindProjection,stimulus,mode,groundingVerdict,blindVerdict,receiptValid,letters,attackStatistics,paperInput} from './lib/listening-answer-qc.mjs';
const args=process.argv.slice(2),get=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(get('--out','work/listening-owner-review-01-06'));
await mkdir(root,{recursive:true});
const oldLedger='work/listening-answer-qc/model-receipts/cost-ledger.json',newLedger=join(root,'model-receipts/cost-ledger.json');
if(!await exists(newLedger)&&await exists(oldLedger)){await mkdir(join(root,'model-receipts'),{recursive:true});await copyFile(oldLedger,newLedger);}
const provider=await createGatewayProvider({url:process.env.LISTENING_QC_URL,token:process.env.LISTENING_QC_TOKEN,adminToken:process.env.LISTENING_QC_ADMIN_TOKEN,
 directory:join(root,'model-receipts'),maxUsd:Number(get('--max-usd','35'))});
const seedFile=join(root,'seed.json');const seed=await exists(seedFile)?(await loadJson(seedFile)).seed:randomBytes(32).toString('hex');
await saveJson(seedFile,{seed});
const overrides=await loadJson('curriculum/tcf-listening-owner-review-editorial-fixes.json');
const papers=[],evidence=[],errors=[];
for(let number=1;number<=6;number++){
 const label=String(number).padStart(2,'0'),source=`supabase/exams/tcf-listening-test${label}${number>=3?'-v3':''}.json`;
 const original=await loadJson(source),paper=structuredClone(original),folder=join(root,'test'+label);
 paper.version=`tcf-listening-2026-11-test${label}-v4`;await mkdir(join(folder,'images'),{recursive:true});
 const sourceRoot=join('assets/tcf-listening',number===1?'v1':original.version),images=new Map();
 for(const q of original.questions.slice(0,4)){
  const svg=join(sourceRoot,'images',q.image),png=join(folder,'images',`q-${String(q.number).padStart(2,'0')}.png`);
  await copyFile(svg,join(folder,'images',q.image));execFileSync('python3',['scripts/rasterize-listening-qc.py',svg,png]);
  images.set(q.number,{hash:hash(await readFile(svg)),data:'data:image/png;base64,'+(await readFile(png)).toString('base64')});
 }
 const positions=balancedPositions(39,seed+paper.id),records=Array(39).fill(null);let index=0;
 await Promise.all(Array.from({length:8},async()=>{while(index<39){const i=index++,originalQ=original.questions[i],image=images.get(i+1),file=join(folder,`q-${i+1}.json`),override=overrides[label+':'+(i+1)]??null,overrideHash=override?hash(override):null;
  try{
   if(await exists(file)){
    const saved=await loadJson(file);
    if(saved.policyHash===policyHash&&saved.sourceHash===contentHash(originalQ)&&(saved.overrideHash??null)===overrideHash&&saved.groundedPass&&saved.contentHash===contentHash(saved.question)){
     paper.questions[i]=saved.question;records[i]=saved;continue;
    }
   }
   let feedback={instruction:'The owner requests revised Tests01–06 live for review. Improve all four choices. A review exception never permits an ambiguous or unsupported key. Keep spoken choices concise so the historical audio slot fits.'},best=null,previous=originalQ;
   for(let round=0;round<6;round++){
    const authorInput={...blindProjection(previous),stimulus:stimulus(originalQ),mode:mode(originalQ),feedback,...(image?{imageData:image.data}:{})};
    const author=override&&round===0?{source:'editorial-fix',result:override}:await provider('author',authorInput,{nonce:`owner-review:${seed}:${paper.id}:${i+1}:author:${round}`});
    const authored=structuredClone(author.result);authored.question=authored.question.replace(/^\[Question\s+révisée\]\s*/iu,'');
    const q=applyAlternatives(originalQ,authored,positions[i],seed+paper.id+':'+i+':'+round);
    previous=q;
    const groundContext=q.number>=5&&q.number<=8?'spoken-recording':'stimulus';
    const evidenceSource=groundContext==='spoken-recording'?q.transcript:stimulus(q);
    const groundInput={...blindProjection(q),stimulus:evidenceSource,mode:mode(q),...(image?{imageData:image.data}:{})};
    const [grounded,blind]=await Promise.all([
     provider('ground',groundInput,{nonce:`owner-review:${seed}:${paper.id}:${i+1}:ground:${round}`}),
     provider('blind',blindProjection(q),{nonce:`owner-review:${seed}:${paper.id}:${i+1}:blind:${round}`})]);
    const verdict=groundingVerdict(q,grounded.result,{evidenceSource,normalizeEvidence:true}),blindAssessment=blindVerdict(blind.result);
    if(verdict.pass){
     const key=letters.indexOf(q.correct),details=grounded.result.options;
     q.explanation='Réponse '+q.correct+' : '+details.find(o=>o.index===key).reason+' '+details.filter(o=>o.index!==key).map(o=>letters[o.index]+' : '+o.reason).join(' ');
     best={number:i+1,policy:POLICY_VERSION,policyHash,sourceHash:contentHash(originalQ),imageHash:image?.hash??null,
      question:q,contentHash:contentHash(q),groundedPass:true,groundContext,overrideHash,grounded,blind,blindPass:blindAssessment.pass,author,rounds:round+1};
     await saveJson(file,best);
     if(blindAssessment.pass||round>=1)break;
    }
    feedback={round:round+1,grounding:verdict,groundedAssessment:verdict.pass?null:grounded.result,
     blind:{reason:blind.result.reason,cues:blind.result.cues},instruction:'Replace a common-sense question focus with an actual discriminating detail or competing interpretation. Do not add irrelevant justifications to options. Preserve the language level.'};
   }
   if(!best)throw Error('No uniquely supported candidate after bounded authoring');
   paper.questions[i]=best.question;records[i]=best;
   console.log(`Test${label} Q${i+1}: unique key verified; blind ${best.blindPass?'passed':'warning retained for owner review'}`,true);
  }catch(error){errors.push({test:paper.id,number:i+1,error:error.message});records[i]={number:i+1,error:error.message};console.log(`Test${label} Q${i+1}: BLOCKED ${error.message}`);}
 }}));
 let paperAssessment=null;
 if(records.every(r=>r?.groundedPass))try{paperAssessment=await provider('paper',paperInput(paper),{nonce:'owner-review:'+seed+':paper:'+paper.id});}catch(error){errors.push({test:paper.id,error:error.message});}
 const proof={policy:POLICY_VERSION,policyHash,source,sourceVersion:original.version,test:paper.id,version:paper.version,
  paperHash:hash(paper.questions.map(contentHash)),questions:records,paperAssessment};
 await saveJson(join(folder,'bank.json'),paper);await saveJson(join(folder,'evidence.json'),proof);
 papers.push(paper);evidence.push(proof);
 await saveJson(join(root,'progress.json'),{tests:evidence.map(p=>({test:p.test,grounded:p.questions.filter(r=>r?.groundedPass).length,blindWarnings:p.questions.filter(r=>r?.groundedPass&&!r.blindPass).length})),errors});
}
const count=evidence.reduce((n,e)=>n+e.questions.filter(r=>r?.groundedPass).length,0);
const summary={policy:POLICY_VERSION,policyHash,tests:[1,2,3,4,5,6],readyForMedia:false,readyForOwnerRequestedReview:count===234,
 reviewAuthorization:{message:'make the 1 to6 new ones live now',scope:'Tests01–06 only; owner requested activation after disclosure that blind quality checks failed'},
 totalItems:234,groundedItems:count,blindWarnings:evidence.reduce((n,e)=>n+e.questions.filter(r=>r?.groundedPass&&!r.blindPass).length,0),statistics:attackStatistics(papers),errors,
 note:'Owner-requested review publication. NOT a passing full blind/held-out quality result. All234 unique answer keys and matching media remain mandatory.'};
await saveJson(join(root,'summary.json'),summary);console.log(JSON.stringify(summary,null,2));if(count!==234)process.exitCode=1;
