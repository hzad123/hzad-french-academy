import {selectOriginalAddenda} from '../lib/select-tef-listening-additions.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const starts=[23,25,27,29], second=new Set(starts.map(n=>n+1));
const expectedKinds=n=>n<=4?'picture':n<=8?'announcement':n<=12?'voicemail':n<=20?'street':n<=22?'radio':n<=28?'interview':n<=30?'report':'document';
const previews=n=>n<=4?5:n<=12?10:n<=20?5:n<=22?10:n<=28?(second.has(n)?0:20):n<=30?(second.has(n)?0:10):10;
const responses=n=>n<=12?10:n>=23&&n<=28?30:15;
const pad=n=>String(n).padStart(2,'0');
const makeHash=s=>createHash('sha256').update(s).digest('hex');

function choicesOf(entry,position){
 const wrong=[...entry.wrong];assert.equal(wrong.length,3,'Three plausible incorrect choices required');
 const arr=[...wrong];arr.splice(position,0,entry.correct);
 assert.equal(new Set(arr.map(x=>x.toLocaleLowerCase('fr'))).size,4,'Duplicate choices');
 return arr;
}
function balancedKeys(testNumber){
 // Independent reproducible permutation; exact 10 of A/B/C/D.
 let a=Array.from({length:40},(_,i)=>i%4);
 let x=(testNumber*1664525+1013904223)>>>0;
 for(let i=a.length-1;i>0;i--){x=(Math.imul(1664525,x)+1013904223)>>>0;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]]}
 return a;
}
function escapeXml(str){return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function svgFor(q){
 const icons=q.illustrationIcons;
 assert.equal(icons?.length,4,'Four original illustrated scene icons required');
 const bg=['#e4f1f9','#fff0e4','#eaf5e8','#f0eafb'];
 const stroke=['#3f7896','#9d6b47','#54764a','#7756a1'];
 const cards=q.options.map((label,i)=>{
  const x=(i%2)*396+28,y=Math.floor(i/2)*240+24;
  const clean=escapeXml(label.length>74?label.slice(0,71)+'…':label);
  return '<rect x="'+x+'" y="'+y+'" width="375" height="220" rx="18" fill="'+bg[i]+'" stroke="'+stroke[i]+'" stroke-width="2"/>'+
  '<circle cx="'+(x+72)+'" cy="'+(y+83)+'" r="49" fill="#fff"/>'+
  '<text x="'+(x+72)+'" y="'+(y+99)+'" font-size="53" text-anchor="middle">'+escapeXml(icons[i])+'</text>'+
  '<text x="'+(x+150)+'" y="'+(y+68)+'" font-size="29" font-weight="bold" fill="'+stroke[i]+'">'+String.fromCharCode(65+i)+'</text>'+
  '<foreignObject x="'+(x+150)+'" y="'+(y+92)+'" width="204" height="111"><div xmlns="http://www.w3.org/1999/xhtml" style="font:17px Arial,sans-serif;color:#243448;overflow-wrap:break-word;line-height:1.35">'+clean+'</div></foreignObject>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-label="Quatre scènes originales A à D"><rect width="820" height="520" fill="#fff"/>'+cards+'</svg>\n';
}
const testNo=Number(process.argv[2]);
assert(Number.isInteger(testNo)&&testNo>=2&&testNo<=7,'Pass test number 02..07');
const {clips:authoredClips}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-02-07/test-'+pad(testNo)+'.mjs').href);
const {sourceOverrides}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-02-07/editorial-source-overrides.mjs').href);
const clips=authoredClips.map(clip=>({...clip,...(sourceOverrides[testNo]?.[clip.start]||{})}));
assert.equal(clips.length,36,'36 original recording sources per paper');
const {additions}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-02-07/test-'+pad(testNo)+'-additions.mjs').href);
const {wording}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-02-07/editorial-wording.mjs').href);
const {wording:followup}=await import(pathToFileURL(process.cwd()+'/curriculum/tef-listening-02-07/editorial-distractors-followup.mjs').href);
const referenceBank=JSON.parse(await readFile('supabase/exams/tef-listening-test01-v3.json','utf8'));
const actualAdditions={...additions};
for(const [number,override] of Object.entries(sourceOverrides[testNo]||{}))actualAdditions[number]=override.addendum||'';
const selection=selectOriginalAddenda(clips,actualAdditions,referenceBank);
const keyPositions=balancedKeys(testNo), keys={},seen=new Set(), questions=[];
for(const clip of clips){
 const n=clip.start,kind=expectedKinds(n),isPair=starts.includes(n);
 assert(clip.topic&&clip.topic.length>=8,'Original topic tag required Q'+n);
 assert(!seen.has(clip.topic.toLocaleLowerCase('fr')),'Repeated subject tag '+clip.topic);
 seen.add(clip.topic.toLocaleLowerCase('fr'));
 assert.equal(clip.questions.length,isPair?2:1,'Paired count mismatch Q'+n);
 assert(typeof clip.script==='string'&&clip.script.trim().length>145,'Substantial authored oral script required Q'+n);
 const fullScript=(clip.script.trim()+'\n'+(selection.picked.has(n)?(actualAdditions[n]||''):'')).trim();
 const pieces=fullScript.split(/(?=—\s)/u).map(t=>t.replace(/^—\s*/u,'').trim()).filter(Boolean);
 const segments=pieces.map((text,i)=>({voice:i%2?'male':'female',text}));
 for(let offset=0;offset<clip.questions.length;offset++){
  const number=n+offset, originalItem=clip.questions[offset], item={...originalItem,...(wording[testNo]?.[number]||{}),...(followup[testNo]?.[number]||{})},kindActual=expectedKinds(number);
  assert(kindActual===kind,'Kind mismatch '+number);
  assert(item.stem&&item.correct&&item.explanation&&item.wrong,'Full original question fields required '+number);
  assert(item.correct.length>=15,'Answer too short Q'+number);
  const index=keyPositions[number-1], options=choicesOf(item,index);
  let q={number,kind,question:item.stem,options,correct:String.fromCharCode(65+index),explanation:item.explanation,transcript:fullScript,segments,audio:'q-'+pad(n)+'.mp3',audioSeconds:0,slotSeconds:second.has(number)?0:1,previewSeconds:previews(number)};
  if(isPair){q.groupStart=n;q.groupEnd=n+1}
  if(n<=4){
   const originalIcons=item.illustrationIcons;
   assert.equal(originalIcons?.length,4,'Four subject-specific scene illustrations required');
   const shifted=[...originalIcons.slice(1)];shifted.splice(index,0,originalIcons[0]);
   q.image='q-'+pad(n)+'.svg';q.illustrationIcons=shifted;
  }
  questions.push(q);
  keys[q.correct]=(keys[q.correct]||0)+1;
 }
}
assert.equal(questions.length,40);
assert.deepEqual(Object.values(keys).sort((a,b)=>a-b),[10,10,10,10],'Balanced answer letters');
for(let n=1;n<=40;n++){const q=questions[n-1];assert.equal(q.number,n);assert.equal(q.kind,expectedKinds(n));if(second.has(n)){assert.equal(q.audio,questions[n-2].audio);assert.equal(q.transcript,questions[n-2].transcript)}}
const version='tef-listening-2026-11-test'+pad(testNo)+'-v1';
const base='assets/tef-listening/'+version;
const paper={id:'tef-listening-'+pad(testNo),version,title:'TEF Listening · Test '+pad(testNo),seconds:2400,questions};
await mkdir(base+'/audio',{recursive:true});await mkdir(base+'/images',{recursive:true});
for(let n=1;n<=4;n++){
 const q=questions[n-1];await writeFile(base+'/images/q-'+pad(n)+'.svg',svgFor(q));
 delete q.illustrationIcons;
}
const v3='assets/tef-listening/tef-listening-2026-11-test01-v3';
await cp(v3+'/audio/audio-check.mp3',base+'/audio/audio-check.mp3');
await cp(v3+'/AUDIO-LICENSES.md',base+'/AUDIO-LICENSES.md');
await writeFile('supabase/exams/tef-listening-test'+pad(testNo)+'-v1.json',JSON.stringify(paper,null,2)+'\n');
console.log(JSON.stringify({selection:{selected:selection.selected,totalWords:selection.totalWords,referenceWords:selection.referenceWords},testNo,version,questions:40,recordings:36,topics:seen.size,keys,sourceWords:clips.reduce((a,c)=>a+(c.script+' '+(additions[c.start]||'')).split(/\s+/).length,0)},null,2));
