import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {sourceHash,choiceStats} from './lib/listening-quality.mjs';
const paper=JSON.parse(await readFile('supabase/exams/tef-listening-test01.json','utf8'));
const base='assets/tef-listening/tef-listening-2026-11-test01-v1';
const manifest=JSON.parse(await readFile(base+'/manifest.json','utf8'));
const kinds={picture:4,announcement:4,voicemail:4,street:8,radio:2,interview:6,report:2,document:10};
const names=new Set(),transcripts=new Set(),keyCounts={A:0,B:0,C:0,D:0};
let longest=0,shortest=0;
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(paper.id,'tef-listening-01');assert.equal(paper.version,'tef-listening-2026-11-test01-v1');
assert.equal(paper.questions.length,40);assert.equal(paper.seconds,2400);
assert.equal(manifest.files.length,40);
assert.equal(paper.questions.reduce((t,q)=>t+q.slotSeconds,0),2400);
assert.deepEqual(paper.questions.reduce((c,q)=>(c[q.kind]=(c[q.kind]||0)+1,c),{}),kinds);
for(const [i,q] of paper.questions.entries()){
 assert.equal(q.number,i+1);assert.equal(q.options.length,4);
 assert.equal(new Set(q.options.map(x=>x.toLocaleLowerCase('fr'))).size,4);
 assert.equal(q.previewSeconds,i<4?5:i<20?8:10);
 assert(q.audioSeconds>0&&q.previewSeconds+q.audioSeconds+10<=q.slotSeconds);
 assert(q.question.trim().endsWith('?'));assert(q.explanation.length>35);
 assert(q.transcript.length>=60);
 assert(!transcripts.has(q.transcript),'Repeated recording script '+q.number);transcripts.add(q.transcript);
 assert(!names.has(q.audio));names.add(q.audio);
 const media=await readFile(base+'/audio/'+q.audio);
 assert.equal(hash(media),manifest.files[i].sha256,'Audio mismatch Q'+q.number);
 assert.equal(sourceHash(q.segments),manifest.files[i].sourceHash,'Source mismatch Q'+q.number);
 keyCounts[q.correct]++;
 if(i<4){const im=(await readFile(base+'/images/'+q.image,'utf8'));assert(im.includes('<svg'));assert(im.includes('A</text>')&&im.includes('D</text>'));}
 const stats=choiceStats(q);assert(stats.valid);if(stats.correctLongest)longest++;if(stats.correctShortest)shortest++;
}
assert.deepEqual(keyCounts,{A:10,B:10,C:10,D:10});
assert(longest<=18,'Longest-answer shortcut remains exploitable: '+longest+'/40');
assert(shortest<=16,'Shortest-answer shortcut remains exploitable: '+shortest+'/40');
const check=await readFile(base+'/audio/audio-check.mp3');assert(check.length>1000);
console.log(JSON.stringify({status:'TECHNICAL_PASS_EDITORIAL_LISTENING_STILL_REQUIRED',questions:40,seconds:2400,kindCounts:kinds,mediaShaChecks:40,illustratedPanels:4,correctLongest:longest,correctShortest:shortest,keys:keyCounts},null,2));
