// Editorial-only one-time answer-position randomizer. Does not touch sources,
// questions, media, graphics, difficulty order, explanations, or scoring logic.
import {randomInt} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const paths=['tef-reading-test01-v3.json','tef-reading-test02-v3.json',...[3,4,5,6].map(i=>'tef-reading-test0'+i+'-v2.json')];
const ABCD='ABCD';
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function longestRun(x){let longest=1,count=1;for(let i=1;i<x.length;i++){count=x[i]===x[i-1]?count+1:1;longest=Math.max(longest,count)}return longest;}
function periodic(x){let count=0;for(let i=0;i+11<x.length;i++){if(x.slice(i,i+4)===x.slice(i+4,i+8)&&x.slice(i,i+4)===x.slice(i+8,i+12))count++;}return count;}
function keySequence(){for(let attempt=0;attempt<10000;attempt++){const keys=shuffle(ABCD.split('').flatMap(x=>Array(10).fill(x))).join('');if(longestRun(keys)<=2&&periodic(keys)===0)return keys;}throw Error('Cannot find nonperiodic balanced sequence');}
for(const filename of paths){
 const path=join('supabase/exams',filename);
 const paper=JSON.parse(await readFile(path,'utf8'));const keys=keySequence();
 for(let i=0;i<40;i++){
  const q=paper.questions[i],before=q.options[ABCD.indexOf(q.correct)];
  if(q.options.length!==4||!ABCD.includes(q.correct))throw Error(paper.id+' Q'+(i+1)+' invalid');
  const other=shuffle(q.options.filter((_,j)=>ABCD[j]!==q.correct));
  other.splice(ABCD.indexOf(keys[i]),0,before);q.options=other;q.correct=keys[i];
  if(q.options[ABCD.indexOf(q.correct)]!==before)throw Error('Scoring key moved to different text');
 }
 await writeFile(path,JSON.stringify(paper,null,2)+'\n');
 console.log(paper.id+' balanced answer positions; longest run '+longestRun(keys)+'; 12-item periodic sequences '+periodic(keys));
}
