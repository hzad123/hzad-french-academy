// Offline editorial review of ALL 240 authored TEF Listening questions.
// Independent model sees only question + 4 choices at BLIND stage; no source,
// key, explanation, reviewer notes or student data. Separate grounding model
// receives complete source without marked key. Preserve every actual verdict;
// never infer acceptance from successful API requests or automatically revise.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGatewayProvider,blindVerdict,groundingVerdict,policyHash,hash} from './lib/listening-answer-qc.mjs';
import {POLICY_VERSION} from '../supabase/functions/academy-listening-qc/contracts.js';
import {githubOidcFetch} from './lib/listening-github-oidc.mjs';
const pad=n=>String(n).padStart(2,'0');
const output='work/tef-listening-02-07/model-qc';
await mkdir(output,{recursive:true});
const provider=await createGatewayProvider({
 url:process.env.LISTENING_QC_URL,token:'github-signed-per-request',
 adminToken:'github-oidc-verified-by-private-proxy',
 fetcher:githubOidcFetch(),directory:output+'/receipts',
 maxUsd:Number(process.env.MAX_QC_USD||'100')
});
const banks=[],tasks=[];
for(let t=2;t<=7;t++){
 const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+pad(t)+'-v1.json','utf8'));
 if(bank.questions.length!==40)throw Error('Incomplete authored paper '+t);
 banks.push(bank);for(const q of bank.questions)tasks.push({test:t,q});
}
const results=new Array(tasks.length);
let index=0;
const workers=Math.min(Number(process.env.QC_WORKERS||8),tasks.length);
await Promise.all(Array.from({length:workers},async()=>{
 while(index<tasks.length){
  const i=index++,{test,q}=tasks[i];
  const visible={question:q.question,choices:q.options},source={...visible,stimulus:q.transcript,mode:'document'};
  const contentHash=createHash('sha256').update(JSON.stringify({test,number:q.number,visible,source,qkey:q.correct,explanation:q.explanation})).digest('hex');
  const file=output+'/test'+pad(test)+'-q'+pad(q.number)+'.json';
  let prior=null;
  try{prior=JSON.parse(await readFile(file,'utf8'))}catch{}
  if(prior?.contentHash===contentHash&&prior.blind&&prior.grounded){results[i]=prior;continue}
  const item={test,number:q.number,contentHash,blind:null,grounded:null,status:'FAILED_CLOSED'};
  try{
   const blind=await provider('blind',visible,{nonce:'tef-blind:'+contentHash});
   item.blind={result:blind.result,model:blind.model,responseId:blind.responseId,passed:blindVerdict(blind.result).pass,
     maximum:blindVerdict(blind.result).maximum,gap:blindVerdict(blind.result).gap,
     guessedCorrect:'ABCD'[blind.result.guess]===q.correct};
  }catch(e){item.blindError=String(e?.message||e)}
  try{
   const independent=await provider('ground',source,{nonce:'tef-ground:'+contentHash});
   const verdict=groundingVerdict(q,independent.result,{evidenceSource:q.transcript,normalizeEvidence:true});
   item.grounded={result:independent.result,model:independent.model,responseId:independent.responseId,
     passed:verdict.pass,errors:verdict.errors};
  }catch(e){item.groundError=String(e?.message||e)}
  item.status=item.blind?.passed&&item.grounded?.passed?'PASS':'REVIEW_REQUIRED';
  await writeFile(file,JSON.stringify(item,null,2)+'\n');
  results[i]=item;
  if((i+1)%16===0)console.log('Independent TEF QC processed '+(i+1)+' task indices; results saved as authoring evidence');
 }
}));
const failed=results.filter(x=>x.status!=='PASS'),blind=results.filter(x=>!x.blind?.passed),ground=results.filter(x=>!x.grounded?.passed);
const accuracy=results.filter(x=>x.blind?.guessedCorrect).length/results.filter(x=>x.blind).length;
const summary={policy:POLICY_VERSION,policyHash,status:failed.length?'EDITORIAL_REVIEW_REQUIRED':'MODEL_SCREEN_PASS_HUMAN_REVIEW_STILL_REQUIRED',
 evaluated:results.length,passed:results.length-failed.length,failed:failed.length,
 blindFailures:blind.length,groundFailures:ground.length,blindGuessAccuracy:Number.isFinite(accuracy)?accuracy:null,
 results:results.map(x=>({test:x.test,number:x.number,contentHash:x.contentHash,blindPass:x.blind?.passed||false,groundPass:x.grounded?.passed||false,errors:x.grounded?.errors||[x.groundError||x.blindError].filter(Boolean)}))
};
await writeFile(output+'/summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,evaluated:summary.evaluated,passed:summary.passed,blindFailures:summary.blindFailures,groundFailures:summary.groundFailures,blindGuessAccuracy:summary.blindGuessAccuracy},null,2));
if(failed.length)process.exitCode=1;
