// Independent, source-blind and passage-grounded review of TEF Reading vNext.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {githubOidcFetch} from '../lib/tef-reading-github-oidc.mjs';
const root='work/tef-reading-blind-qc',fetcher=githubOidcFetch();
const url=process.env.TEF_READING_QC_URL;
if(!url||!url.startsWith('https://'))throw Error('Private TEF Reading QC endpoint is required');
const originalFiles=['tef-reading-test01-v2.json','tef-reading-test02-v2.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'.json')];
const revisedFiles=['tef-reading-test01-v3.json','tef-reading-test02-v3.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'-v2.json')];
const original=await Promise.all(originalFiles.map(async f=>JSON.parse(await readFile('supabase/exams/'+f,'utf8'))));
const revised=await Promise.all(revisedFiles.map(async f=>JSON.parse(await readFile('supabase/exams/'+f,'utf8'))));
const letters='ABCD',pilot=process.argv.includes('--pilot');
const sampleNumbers=pilot?[28,39]:[23,25,28,29,32,34,38,39];
const targets=pilot?[28,39]:Array.from({length:18},(_,i)=>i+23);
let price=0,reqCount=0;const maxUsd=Number(process.env.TEF_READING_QC_MAX_USD||'20');
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>String(x||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\\s+/g,' ').trim().toLocaleLowerCase('fr');
const delay=t=>new Promise(resolve=>setTimeout(resolve,t));
function orderFor(test,number,mode){
 const order=[0,1,2,3],id=sha('tef-reading-blind-experiment-v1:'+test+':'+number+':'+mode);
 for(let i=3;i>0;i--){const j=parseInt(id.slice((3-i)*8,(4-i)*8),16)%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
function keepInvariants(){
 for(let i=0;i<6;i++){
  const a=original[i],b=revised[i];
  if(a.id!==b.id||a.questions.length!==40||b.questions.length!==40||a.seconds!==b.seconds||a.maxPoints!==b.maxPoints)throw Error('Exam metadata changed');
  for(let j=0;j<40;j++){
   const x=a.questions[j],y=b.questions[j],name=a.id+' Q'+(j+1);
   for(const field of ['passage','media','section','group','points','correct']){
    if(JSON.stringify(x[field]??null)!==JSON.stringify(y[field]??null))throw Error('Forbidden '+field+' change at '+name);
   }
   if(j<22&&JSON.stringify(x.options)!==JSON.stringify(y.options))throw Error('Forbidden early-option change at '+name);
   if(j>=22&&![28,39].includes(j+1)&&x.options['ABCD'.indexOf(x.correct)]!==y.options['ABCD'.indexOf(y.correct)])throw Error('Correct choice changed at '+name);
   if(j>=22&&! [28,39].includes(j+1)&&x.question!==y.question)throw Error('Unnecessary stem rewrite at '+name);
  }
 }
}
keepInvariants();
const rows=[],errors=[],seen=new Set();
async function call(stage,input,label){
 for(let attempt=0;attempt<4;attempt++){
  try {
   if(price>maxUsd)throw Error('COST_CAP_REACHED');
   const r=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({stage,input}),signal:AbortSignal.timeout(125000)});
   const data=await r.json();
   if(!r.ok)throw Error('QC HTTP '+r.status+': '+JSON.stringify(data).slice(0,280));
   if(!data.id||seen.has(data.id))throw Error('Missing/reused model receipt');
   seen.add(data.id);reqCount++;
   const usage=data.usage||{},inputCost=stage==='blind'?.25:1.25,outputCost=stage==='blind'?2:10;
   price+=((usage.prompt_tokens||0)*inputCost+(usage.completion_tokens||0)*outputCost)/1e6;
   return {stage,id:data.id,model:data.model,usage:data.usage,result:data.result};
  }catch(e){
   if(attempt===3||/COST_CAP|OIDC|REQUIRED|UNAVAILABLE|INVALID_QUESTION/.test(String(e)))throw e;
   await delay(Math.min(20000,(attempt+1)*2500));
  }
 }
}
async function review(test,number,version){
 const p=version==='before'?original[test-1]:revised[test-1],q=p.questions[number-1],key=letters.indexOf(q.correct);
 const order=orderFor(test,number,'blind'),choices=order.map(i=>q.options[i]),input={question:q.question,choices};
 const blind=await call('blind',input,'T'+test+'Q'+number+':'+version);
 const result=blind.result;if(result.guess<0||result.guess>3)throw Error('Invalid blind result');
 const prob=Array.isArray(result.probabilities)?result.probabilities:[],sorted=[...prob].sort((a,b)=>b-a);
 const guessedOriginal=order[result.guess],correct=guessedOriginal===key;
 const credible=Array.isArray(result.plausibility)&&result.plausibility.length===4&&result.plausibility.every(x=>x.credible===true);
 const cue=!!result.confident||!!result.cues?.length||!credible||(sorted[0]??1)>.47||((sorted[0]??1)-(sorted[1]??0))>.17;
 const row={test,number,version,key:q.correct,blind:{receipt:blind.id,model:blind.model,guessPosition:result.guess,guessOriginal:letters[guessedOriginal],correct,confident:!!result.confident,credibility:credible,probabilities:prob,cues:result.cues,reason:result.reason,pass:!cue},ground:null,pass:false};
 if(version==='after'){
  const safeSource=q.passage;
  const groundInput={source:safeSource,question:q.question,choices};
  const ground=await call('ground',groundInput,'T'+test+'Q'+number+':ground');
  const g=ground.result;
  const expected=order.indexOf(key);
  const indices=g.supportedIndices??[];
  const unique=g.ambiguous===false&&g.questionSupported===true&&indices.length===1&&indices[0]===expected;
  const optionsOk=Array.isArray(g.options)&&g.options.length===4&&g.options.every(x=>
   Number.isInteger(x.index)&&x.index>=0&&x.index<4&&x.supported===(x.index===expected)&&x.plausible===true&&typeof x.reason==='string'&&x.reason.length>=15);
  const quoteChecks=g.options?.flatMap(o=>(o.quotes||[]).map(t=>typeof t==='string'&&t.length>=5&&canonical(safeSource).includes(canonical(t))))||[];
  const quotesOk=quoteChecks.length>=1&&quoteChecks.every(Boolean);
  row.ground={receipt:ground.id,model:ground.model,supportedIndices:indices,expected,ambiguous:g.ambiguous,unique,optionsOk,quotesOk,summary:g.summary,diagnostics:g.options};
  row.pass=!cue&&unique&&optionsOk&&quotesOk;
 }else row.pass=!cue;
 return row;
}
const jobs=[];
for(let test=1;test<=6;test++){
 for(const number of sampleNumbers)jobs.push([test,number,'before']);
 for(const number of targets)jobs.push([test,number,'after']);
}
await mkdir(root,{recursive:true});
let cursor=0;
const workers=Number(process.env.TEF_READING_QC_WORKERS||'6');
await Promise.all(Array.from({length:workers},async()=>{
 while(cursor<jobs.length){
  const [test,number,version]=jobs[cursor++];
  try{const row=await review(test,number,version);rows.push(row);
   console.log('TEF_REVIEW '+JSON.stringify({test,number,version,blindCorrect:row.blind.correct,cue:!row.blind.pass,ground:row.ground?.unique,accepted:row.pass}));
  }catch(e){errors.push({test,number,version,error:String(e).slice(0,400)});
    console.log('TEF_REVIEW_ERROR '+JSON.stringify(errors.at(-1)));
  }
 }
}));
const before=rows.filter(r=>r.version==='before'),after=rows.filter(r=>r.version==='after');
const sampleAfter=after.filter(r=>sampleNumbers.includes(r.number));
const summarize=a=>({sample:a.length,correct:a.filter(x=>x.blind.correct).length,accuracy:a.length?a.filter(x=>x.blind.correct).length/a.length:null,
 exposed:a.filter(x=>!x.blind.pass).length,passed:a.filter(x=>x.pass).length});
const summary={mode:pilot?'pilot':'full',completed:rows.length,expected:jobs.length,missing:errors.length,
 blindBefore:summarize(before),blindAfterSameSample:summarize(sampleAfter),
 newAll:summarize(after),groundPassed:after.filter(x=>x.ground?.unique&&x.ground?.optionsOk&&x.ground?.quotesOk).length,
 estimatedUsd:Math.round(price*100)/100,requests:reqCount,errors,
 byTest:Array.from({length:6},(_,i)=>({test:i+1,before:summarize(before.filter(x=>x.test===i+1)),after:summarize(sampleAfter.filter(x=>x.test===i+1))})),
 weak:after.filter(x=>!x.pass).map(x=>({test:x.test,number:x.number,blind:x.blind,ground:x.ground}))};
await writeFile(root+'/summary.json',JSON.stringify(summary,null,2)+'\n');
await writeFile(root+'/receipts.json',JSON.stringify(rows,null,2)+'\n');
console.log('TEF_QC_SUMMARY '+JSON.stringify(summary));
if(errors.length||rows.length!==jobs.length)process.exitCode=2;
if(!pilot&&summary.newAll.passed!==summary.newAll.sample)process.exitCode=1;
