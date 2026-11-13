// Editorial release gate for high-quality, genuinely distinct TCF listening papers.
// This intentionally FAILS the old template-generated Test 03-20 banks. It is
// not a rewriting tool; tests require human-authored original passages and
// semantically close, balanced multiple-choice answers.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const strip = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[’']/g," ").replace(/\bquestion\s+\d+\b/g,' ')
  .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const grams=(s,n=5)=>{const t=strip(s).split(' ').filter(Boolean);let out=new Set;for(let i=0;i+n<=t.length;i++)out.add(t.slice(i,i+n).join(' '));return out};
const containment=(a,b)=>{const x=grams(a),y=grams(b);if(!x.size||!y.size)return 0;let count=0;for(const v of x)if(y.has(v))count++;return count/Math.min(x.size,y.size)};
const words=s=>strip(s).split(' ').filter(w=>w.length>3&&!['pour','dans','avec','sans','comme','cette','celui','leurs','elles','vous','nous','elle','mais','plus','leur','sont','quelle','quel','elles','tout','tous','etre','avoir','avant','apres','meme','ainsi','dont','alors','encore','aussi','parce','entre','peut','peuvent','aucun','aucune','faire','celles','ceux'].includes(w));
const shared=(a,b)=>{const x=new Set(words(a)),y=new Set(words(b));let n=0;for(const w of x)if(y.has(w))n++;return n};
const median=arr=>[...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];
const fingerprint=s=>String(s).replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi,'').replace(/fill="#?[a-z0-9]+"/gi,'fill="X"').replace(/stroke="#?[a-z0-9]+"/gi,'stroke="X"').replace(/\s+/g,'').replace(/<!--.*?-->/g,'');
const files=[];
for(let n=3;n<=20;n++){
 const label=String(n).padStart(2,'0');
 const file='supabase/exams/tcf-listening-test'+label+'.json';
 try {files.push(JSON.parse(await readFile(file,'utf8')))} catch(e){if(e.code==='ENOENT')continue;throw e}
}
if(!files.length)throw Error('No listening banks to review');
const prev=new Map, imageFingerprints=new Map;
const results=[];
for(const paper of files){
 const violations=[];let checks={};
 const add=(kind,message)=>{violations.push({kind,message})};
 if(paper.questions.length!==39||paper.seconds!==2100)add('structure','39 questions and 35 minutes required');
 let longCorrect=0, offBalance=0, weakDistractors=0, repeated=0, repeatedVisual=0, imageMiss=0;
 for(const q of paper.questions){
  const isVisual=q.number<=4;
  const speaking=q.segments?.map(s=>s.text).join('\n')||'';
  // Intro labels are not useful evidence of original writing; compare the
  // actual body of the recorded passage across every bank at same Q number.
  const audioPassage=q.segments?.filter(s=>!/^Question \d+\.$/.test(s.text)&&s.text!==q.question).map(s=>s.text).join(' ')||q.transcript;
  const hashKey=q.number+':'+q.kind;
  const existing=prev.get(hashKey)||[];
  for(const other of existing){
   const score=containment(audioPassage,other.text);
   if(score>=0.62){repeated++;if(repeated<=5)add('reused-transcript','Q'+q.number+' resembles Test '+other.test+' ('+(score*100).toFixed(0)+'% shared five-word sequences)');}
  }
  existing.push({test:paper.id.slice(-2),text:audioPassage});
  prev.set(hashKey,existing);
  if(isVisual){
   const art='assets/tcf-listening/'+paper.version+'/images/'+q.image;
   try{
    const svg=await readFile(art,'utf8');
    const fp=fingerprint(svg);
    if(imageFingerprints.has(fp)){repeatedVisual++;add('reused-picture','Q'+q.number+' repeats illustration layout from Test '+imageFingerprints.get(fp));}
    else imageFingerprints.set(fp,paper.id.slice(-2));
   }catch{imageMiss++;add('missing-picture',art);}
  }else if(q.number>=9){
   const options=q.options||[];
   if(options.length!==4||new Set(options.map(strip)).size!==4||!/[ABCD]/.test(q.correct)){add('invalid-options','Q'+q.number);continue;}
   const correct=options['ABCD'.indexOf(q.correct)];
   const lengths=options.map(x=>words(x).length+3);
   const wrong=lengths.filter((_,i)=>i!=='ABCD'.indexOf(q.correct));
   const typical=median(wrong);
   const ratio=lengths['ABCD'.indexOf(q.correct)]/Math.max(1,typical);
   if(ratio>1.35){longCorrect++; if(longCorrect<=5)add('answer-length-cue','Q'+q.number+' correct option '+Math.round(ratio*100)+'% of median distractor length');}
   if(Math.max(...lengths)/Math.max(1,Math.min(...lengths))>1.8){offBalance++; if(offBalance<=5)add('unequal-options','Q'+q.number+' length imbalance '+lengths.join('/'));}
   const similar=options.filter((t,i)=>i!=='ABCD'.indexOf(q.correct)&&shared(t,correct)>=2).length;
   if(similar<2){weakDistractors++;if(weakDistractors<=5)add('implausible-distractors','Q'+q.number+' only '+similar+' distractors share two content words with answer');}
  }
  if(q.number>8&&q.options?.length===4&&q.options.some(o=>/(toujours|jamais|tous|aucun|definitiv|completement|exclusiv)/i.test(o))){
   // Extreme answers are often giveaways. Warn for substantive editorial review.
   checks.absoluteWordChoices=(checks.absoluteWordChoices||0)+1;
  }
  if(!isVisual&&!q.segments?.length)add('no-recorded-script','Q'+q.number);
 }
 checks={...checks,transcriptOverlapFlags:repeated,reusedVisualLayouts:repeatedVisual,missingImages:imageMiss,correctAnswerTooLong:longCorrect,optionLengthImbalances:offBalance,weakSemanticDistractors:weakDistractors};
 if(repeated>0)add('reject','Any substantial repeated transcript invalidates paper release');
 if(repeatedVisual>0)add('reject','Picture stimuli must have genuinely different visual scenes, not same shapes with new labels');
 if(longCorrect>2)add('reject','Correct answer length is too predictable');
 if(offBalance>4)add('reject','Options should be comparable in length');
 if(weakDistractors>5)add('reject','Wrong choices must be close, plausible interpretations');
 results.push({test:paper.id,pass:violations.length===0,checks,violations});
}
await mkdir('reports',{recursive:true});
await writeFile('reports/tcf-listening-editorial-qa.json',JSON.stringify({generatedBy:'scripts/audit-tcf-listening-quality.mjs',scope:'draft Test03-20',criteria:{minFiveGramOverlapToFail:0.62,maxCorrectAnswerMedianRatio:1.35,maxLengthRatio:1.8},results},null,2)+'\n');
const rejected=results.filter(r=>!r.pass);
console.log('TCF listening editorial audit: '+results.length+' banks examined; '+rejected.length+' REJECTED');
for(const r of results)console.log(r.test, r.pass?'PASS':'FAIL',JSON.stringify(r.checks));
if(rejected.length)process.exitCode=1;