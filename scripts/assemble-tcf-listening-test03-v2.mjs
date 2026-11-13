// Build a wholly reauthored TCF Listening Test03 v2 from 39 editorial items.
// Existing Test03 v1 and all student attempts remain immutable.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ref=JSON.parse(await readFile('supabase/exams/tcf-listening-test02.json','utf8'));
const parts=await Promise.all([1,2].map(n=>readFile('curriculum/tcf-listening-rewrites/test03-v2-part'+n+'.json','utf8').then(JSON.parse)));
if(parts.some(p=>p.paper!==3||p.version!=='tcf-listening-2026-11-test03-v2'))throw Error('Wrong authored paper version');
const items=parts.flatMap(p=>p.questions);
if(items.length!==39)throw Error('Test03 must have 39 distinct authored questions');
const voice=t=>({voice:t[0]==='M'?'male':'female',text:t.slice(2)});
const real=new Set,slots=ref.questions.map(q=>q.slotSeconds);
const assembled=items.map((item,i)=>{
 const n=i+1,expected=ref.questions[i].kind,kind=item.kind;
 if(item.number!==n||kind!==expected)throw Error('TCF format changed at question '+n);
 if(!Array.isArray(item.options)||item.options.length!==4||new Set(item.options).size!==4)throw Error('Options missing/duplicate '+n);
 if(item.answer<0||item.answer>3||!Number.isInteger(item.answer))throw Error('Answer key '+n);
 // Randomize the answer position from the actual question, not the question number.
 // This avoids the visible A-B-C-D pattern in the first editorial draft.
 const digest=createHash('sha256').update(item.speech+'|'+item.question+'|'+item.options.join('|')).digest();
 const order=[0,1,2,3].sort((a,b)=>digest[a]-digest[b]||a-b);
 const options=order.map(i=>item.options[i]);
 const answerIndex=order.indexOf(item.answer);
 const explanation=item.why;
 if(!explanation||explanation.length<45)throw Error('Explanation incomplete '+n);
 const segments=[{voice:'female',text:'Question '+n+'.'}];
 if(n<=4){
  if(!item.scene)throw Error('Unique image stimulus missing '+n);
  segments.push({voice:'female',text:'Regardez l’image et écoutez les propositions.'});
  segments.push({voice:'female',text:options.map((s,k)=>'ABCD'[k]+'. '+s).join(' ')});
 }else if(n<=8){
  const spoken=item.speech.split('\n').filter(Boolean).map(voice);
  if(spoken.length!==1)throw Error('Response question must have one request '+n);
  segments.push(...spoken);
  segments.push({voice:spoken[0].voice==='male'?'female':'male',text:options.map((s,k)=>'ABCD'[k]+'. '+s).join(' ')});
 }else{
  const turns=item.speech.split('\n').filter(Boolean).map(voice);
  if(turns.length<1||turns.some(s=>s.text.length<18))throw Error('Recorded transcript segments missing '+n);
  if(['dialogue','telephone','debate','panel-discussion','roundtable','interview'].includes(kind)&&turns.length<2)throw Error('Missing conversations '+n);
  segments.push(...turns);
  segments.push({voice:'female',text:item.question});
 }
 const transcript=segments.map(s=>s.text).join('\n');
 if(real.has(transcript))throw Error('Copied script at '+n);real.add(transcript);
 const optionList=n<=8?['Proposition A','Proposition B','Proposition C','Proposition D']:options;
 return {number:n,kind,question:item.question,options:optionList,correct:'ABCD'[answerIndex],explanation,transcript,segments,audio:'q-'+String(n).padStart(2,'0')+'.mp3',audioSeconds:null,slotSeconds:slots[i],...(n<=4?{image:'q-'+String(n).padStart(2,'0')+'.svg'}:{})};
});
if(assembled.reduce((n,q)=>n+q.slotSeconds,0)!==2100)throw Error('Original 35-minute exam rules modified');
await mkdir('curriculum/tcf-listening-build',{recursive:true});
await writeFile('curriculum/tcf-listening-build/test03-v2-audio-pending.json',JSON.stringify({id:'tcf-listening-03',version:'tcf-listening-2026-11-test03-v2',title:'TCF Listening · Test 03',seconds:2100,questions:assembled},null,2)+'\n');
console.log('Original editorial Test03 v2: 39 independently authored situations, matching Test02 genres and 35-minute format. Not yet recorded.');
