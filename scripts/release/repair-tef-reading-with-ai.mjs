import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {githubOidcFetch} from '../lib/tef-reading-github-oidc.mjs';
import {generateQualityChecked,contentDigest} from '../lib/tef-reading-ai-quality.mjs';
const repoFiles=['tef-reading-test01-v3.json','tef-reading-test02-v3.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'-v2.json')];
const docs=await Promise.all(repoFiles.map(async f=>JSON.parse(await readFile('supabase/exams/'+f,'utf8'))));
const work='work/tef-reading-author-qc',fetcher=githubOidcFetch(),url=process.env.TEF_READING_QC_URL;
const maxUsd=Number(process.env.TEF_READING_QC_MAX_USD||'18'),workers=Number(process.env.TEF_READING_QC_WORKERS||'3');
let expense=0,requests=0,orderCounter=0;
const results=[],errors=[],ids=new Set();
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const labels='ABCD';
async function invoke(stage,input){
 for(let tryNo=0;tryNo<4;tryNo++){
  try{
   if(expense>maxUsd)throw Error('AUTHOR_COST_CAP_REACHED');
   const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,input}),signal:AbortSignal.timeout(125000)});
   const data=await response.json();
   if(!response.ok)throw Error('HTTP '+response.status+' '+JSON.stringify(data).slice(0,230));
   if(typeof data.id!=='string'||ids.has(data.id))throw Error('Missing or duplicate provider receipt');
   ids.add(data.id);requests++;
   const costs=stage==='blind'?[.25,2]:[1.25,10],usage=data.usage||{};
   expense+=((usage.prompt_tokens||0)*costs[0]+(usage.completion_tokens||0)*costs[1])/1e6;
   return {stage,id:data.id,model:data.model,usage:data.usage,result:data.result};
  }catch(e){
   if(tryNo>=3||/AUTHOR_COST_CAP|REQUIRED|UNAVAILABLE|INVALID_AUTHOR_INPUT/.test(String(e)))throw e;
   await wait((tryNo+1)*3200);
  }
 }
}
function orderFor(arr){
 const order=[...arr],seed=hash('tef-autorepair:'+process.env.GITHUB_SHA+':'+(++orderCounter));
 for(let i=3;i>0;i--){const j=parseInt(seed.slice((3-i)*8,(4-i)*8),16)%(i+1);[order[i],order[j]]=[order[j],order[i]]}
 return order;
}
async function reviewItem([pi,qn]){
 const paper=docs[pi],original=paper.questions[qn-1],correct=labels.indexOf(original.correct);
 const existing=docs.filter((_,i)=>i!==pi).flatMap(x=>x.questions);
 const edits=[];
 const regenerated=async({candidate,feedback,attempt})=>{
  const f=JSON.stringify({round:attempt+1,blindCues:feedback.blindCues,groundIssues:feedback.groundIssues,duplicateFindings:feedback.duplicates}).slice(0,2450);
  const author=await invoke('author',{source:original.passage,question:candidate.question,choices:candidate.options,correctIndex:correct,number:qn,feedback:f,semantic:candidate.semantic});
  const result=author.result;
  if(!Array.isArray(result.choices)||result.choices.length!==4||!Number.isInteger(result.correctIndex)||result.correctIndex<0||result.correctIndex>3)throw Error('AUTHOR_INVALID_CHOICES');
  const answer=result.choices[result.correctIndex];const wrong=result.choices.filter((_,i)=>i!==result.correctIndex);
  const options=[...wrong];options.splice(correct,0,answer);
  const newer={...candidate,question:result.question,options,explanation:result.explanation,semantic:result.semantic};
  edits.push({round:attempt+1,authorReceipt:author.id,question:newer.question,correct:newer.correct,options:newer.options,semantic:newer.semantic});
  return newer;
 };
 try{
  const approved=await generateQualityChecked({generate:async()=>original,regenerate:regenerated,existing,
   blindReviewer:async inp=>invoke('blind',inp),groundReviewer:async inp=>invoke('ground',inp),shuffle:orderFor,maxAttempts:5});
  const updated=approved.question;
  paper.questions[qn-1]=updated;
  const entry={test:pi+1,number:qn,pass:true,attempts:approved.attempts,question:updated.question,options:updated.options,correct:updated.correct,explanation:updated.explanation,semantic:updated.semantic,digest:contentDigest(updated),blindReceipt:approved.review.blind.id,groundReceipt:approved.review.ground.id,model:approved.review.ground.model,edits};
  results.push(entry);console.log('TEF_AUTHOR_ACCEPTED '+JSON.stringify(entry));
 }catch(e){const entry={test:pi+1,number:qn,pass:false,error:String(e).slice(0,450),edits};errors.push(entry);console.log('TEF_AUTHOR_BLOCKED '+JSON.stringify(entry));}
}
const pilot=process.argv.includes('--pilot');
const selected=pilot?[28,39]:Array.from({length:18},(_,i)=>i+23);
const pairs=docs.flatMap((p,pi)=>selected.map(n=>[pi,n]));
let cursor=0;
await mkdir(work,{recursive:true});
await Promise.all(Array.from({length:workers},async()=>{while(cursor<pairs.length)await reviewItem(pairs[cursor++]);}));
for(let i=0;i<docs.length;i++)await writeFile(work+'/'+repoFiles[i],JSON.stringify(docs[i],null,2)+'\n');
const summary={mode:pilot?'pilot':'full',accepted:results.length,attempted:pairs.length,blocked:errors.length,
 requests,estimatedUsd:Math.round(expense*100)/100,
 perTest:Array.from({length:6},(_,i)=>({test:i+1,accepted:results.filter(x=>x.test===i+1).length,blocked:errors.filter(x=>x.test===i+1).length})),
 errors};
await writeFile(work+'/summary.json',JSON.stringify(summary,null,2)+'\n');
await writeFile(work+'/evidence.json',JSON.stringify(results,null,2)+'\n');
console.log('TEF_AUTHOR_SUMMARY '+JSON.stringify(summary));
if(errors.length)process.exitCode=1;
