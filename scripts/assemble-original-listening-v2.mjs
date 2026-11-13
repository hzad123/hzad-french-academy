// Individually authored French examinations, never filled using a generic
// script/topic substitution. Each of 17 tests must contain 39 original items.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const n=Number(process.argv[2]);
if(!Number.isInteger(n)||n<4||n>20)throw Error('Specify a single Test04..20 paper');
const label=String(n).padStart(2,'0');
const parts=await Promise.all([1,2].map(k=>readFile('curriculum/tcf-listening-rewrites/test'+label+'-v2-part'+k+'.json','utf8').then(JSON.parse)));
if(parts.some(p=>p.paper!==n||p.version!==`tcf-listening-2026-11-test${label}-v2`))throw Error('Wrong paper/version');
const all=parts.flatMap(p=>p.questions);
if(all.length!==39)throw Error('Each independently authored paper must contain 39 questions');
const voices=t=>{const [gender,...pieces]=t.split('|');if(!['M','F'].includes(gender)||!pieces.length)throw Error('Invalid spoken dialogue');return {voice:gender==='M'?'male':'female',text:pieces.join('|')}};
const originals=new Set(),slots=baseline.questions.map(q=>q.slotSeconds);
const paper=all.map((item,index)=>{
 const question=index+1,kind=item.kind;
 if(item.number!==question||kind!==baseline.questions[index].kind)throw Error('Format mismatch Test'+label+' Q'+question);
 if(item.options?.length!==4||new Set(item.options).size!==4||!Number.isInteger(item.answer)||item.answer<0||item.answer>3)throw Error('Invalid answers Q'+question);
 if(item.why?.length<45)throw Error('Missing correction rationale Q'+question);
 const seed=createHash('sha256').update(item.question+'|'+item.speech+'|'+item.options.join('|')).digest();
 const order=[0,1,2,3].sort((a,b)=>seed[a]-seed[b]||a-b);
 const options=order.map(i=>item.options[i]);
 const key='ABCD'[order.indexOf(item.answer)];
 const segments=[{voice:'female',text:'Question '+question+'.'}];
 if(question<=4){
  if(!item.scene)throw Error('No original illustration scene Q'+question);
  segments.push({voice:'female',text:'Regardez l’image et écoutez les propositions.'});
  segments.push({voice:'female',text:options.map((t,j)=>'ABCD'[j]+'. '+t).join(' ')});
 }else if(question<=8){
  const prompt=item.speech.split('\n').map(voices);
  if(prompt.length!==1)throw Error('Basic-response speech must contain one utterance '+question);
  segments.push(...prompt);
  segments.push({voice:prompt[0].voice==='male'?'female':'male',text:options.map((t,j)=>'ABCD'[j]+'. '+t).join(' ')});
 }else{
  const utterances=item.speech.split('\n').filter(Boolean).map(voices);
  if(!utterances.length||utterances.some(s=>s.text.length<18))throw Error('Missing speakable content at Q'+question);
  if(['dialogue','telephone','debate','panel-discussion','roundtable','interview'].includes(kind)&&utterances.length<2)throw Error('Missing voice conversation at Q'+question);
  segments.push(...utterances,{voice:'female',text:item.question});
 }
 const transcript=segments.map(s=>s.text).join('\n');
 if(originals.has(transcript))throw Error('Repeated passage within Test'+label+' Q'+question);originals.add(transcript);
 if(question>8){
  const lengths=options.map(t=>t.length);
  if(Math.max(...lengths)/Math.max(1,Math.min(...lengths))>1.8)throw Error('Conspicuous answer length mismatch at Test'+label+' Q'+question+': '+lengths);
 }
 return {number:question,kind,question:item.question,options:question<=8?['Proposition A','Proposition B','Proposition C','Proposition D']:options,correct:key,explanation:item.why,transcript,segments,audio:'q-'+String(question).padStart(2,'0')+'.mp3',audioSeconds:null,slotSeconds:slots[index],...(question<=4?{image:'q-'+String(question).padStart(2,'0')+'.svg'}:{})};
});
if(paper.reduce((s,q)=>s+q.slotSeconds,0)!==2100)throw Error('35-minute timer changed');
await mkdir('curriculum/tcf-listening-build',{recursive:true});
await writeFile('curriculum/tcf-listening-build/test'+label+'-v2-audio-pending.json',JSON.stringify({id:'tcf-listening-'+label,version:'tcf-listening-2026-11-test'+label+'-v2',title:'TCF Listening · Test '+label,seconds:2100,questions:paper},null,2)+'\n');
console.log('Authored Test'+label+': 39 independent scripts and four balanced choices each; awaiting recording and editorial verification');
