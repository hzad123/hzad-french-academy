import {items,typeAt} from '../../curriculum/tef-listening-test01-authored.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='assets/tef-listening/tef-listening-2026-11-test01-v1';
const target='supabase/exams/tef-listening-test01.json';
const slots=Array.from({length:40},(_,i)=>i<4?40:i<12?45:i<20?50:i<30?65:83);
assert.equal(items.length,40,'Exactly 40 original questions required');
assert.equal(slots.reduce((a,b)=>a+b,0),2400);
const checksum=x=>createHash('sha256').update(x).digest('hex');
const keys=["C","A","D","B","A","C","B","D","B","D","C","A","D","B","A","C","C","B","A","D","A","D","B","C","B","A","D","C","D","C","B","A","A","B","C","D","C","D","A","B"];
const keyCounts={A:0,B:0,C:0,D:0};
const questions=items.map((record,i)=>{
 const [kind,spoken,question,correct,...rest]=record;
 const n=i+1;
 assert.equal(kind,typeAt(n));assert.equal(rest.length,4);
 const [d1,d2,d3,explanation]=rest;
 const correctLetter=keys[i],at='ABCD'.indexOf(correctLetter);
 const wrong=[d1,d2,d3],options=Array.from({length:4},(_,j)=>j===at?correct:wrong[(j-at+3)%4]);
 assert.equal(new Set(options).size,4);
 const conversational=spoken.startsWith('— ');
 const segments=conversational?spoken.split(/(?=— )/u).map(x=>x.replace(/^—\s*/u,'').trim()).filter(Boolean).map((text,j)=>({voice:j%2?'male':'female',text})):[{voice:'female',text:spoken}];
 assert(segments.length>0);
 keyCounts[correctLetter]++;
 return {number:n,kind,question,options,correct:correctLetter,explanation,transcript:spoken,
  segments,audio:'q-'+String(n).padStart(2,'0')+'.mp3',audioSeconds:0,
  slotSeconds:slots[i],previewSeconds:n<=4?5:n<=20?8:10,
  ...(n<=4?{image:'q-'+String(n).padStart(2,'0')+'.svg'}:{})};
});
assert.deepEqual(keyCounts,{A:10,B:10,C:10,D:10});
const paper={id:'tef-listening-01',version:'tef-listening-2026-11-test01-v1',title:'TEF Listening · Test 01',seconds:2400,questions};
const themes=[['#4c7a97','#e6f3f7'],['#95635c','#fff0e3'],['#5f7c56','#e5f3e6'],['#78649b','#f2ebff']];
const pictograms=[
 ['📚','📖','🧳','🎟️'],['💊','🧺','🩺','📦'],['🚆','🚌','✈️','🚇'],['🍽️','🛎️','🛍️','🎭']
];
function esc(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function image(q){
 const cells=q.options.map((option,i)=>{const x=28+(i%2)*396,y=24+Math.floor(i/2)*239,colors=themes[i];
 const title=option.replace(/^Une? /,'').split(/[,;.]/)[0].slice(0,36);
 return '<rect x="'+x+'" y="'+y+'" width="375" height="220" rx="22" fill="'+colors[1]+'" stroke="'+colors[0]+'" stroke-width="2"/>'+
 '<circle cx="'+(x+70)+'" cy="'+(y+75)+'" r="49" fill="#fff" />'+
 '<text x="'+(x+70)+'" y="'+(y+92)+'" text-anchor="middle" font-size="56">'+pictograms[q.number-1][i]+'</text>'+
 '<text x="'+(x+150)+'" y="'+(y+74)+'" font-size="30" font-weight="bold" fill="'+colors[0]+'">'+String.fromCharCode(65+i)+'</text>'+
 '<foreignObject x="'+(x+149)+'" y="'+(y+96)+'" width="205" height="105"><div xmlns="http://www.w3.org/1999/xhtml" style="font:18px Arial,sans-serif;color:#29394c;line-height:1.3;overflow-wrap:break-word">'+esc(title)+'</div></foreignObject>'}).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-label="Quatre scènes illustrées A à D"><rect width="820" height="520" fill="#fff"/>'+cells+'</svg>\n';
}
await mkdir(base+'/images',{recursive:true});await mkdir(base+'/audio',{recursive:true});
for(const q of questions.slice(0,4))await writeFile(base+'/images/'+q.image,image(q));
await writeFile(target,JSON.stringify(paper,null,2)+'\n');
await mkdir('work/tef-listening-test01',{recursive:true});
await writeFile('work/tef-listening-test01/authored.json',JSON.stringify({state:'AUDIO_PENDING',questions:40,seconds:2400,types:questions.reduce((a,q)=>(a[q.kind]=(a[q.kind]||0)+1,a),{}),answerDistribution:keyCounts,sourceSha:checksum(JSON.stringify(items))},null,2)+'\n');
console.log(JSON.stringify({questions:40,seconds:2400,types:questions.reduce((a,q)=>(a[q.kind]=(a[q.kind]||0)+1,a),{}),keyCounts},null,2));
