import {readFileSync} from 'node:fs';
const file=process.argv[2]||'curriculum/a0-batch-01.json';
const units=JSON.parse(readFileSync(file,'utf8'));
if(!Array.isArray(units)||!units.length)throw Error('Expected nonempty lesson array');
const ids=new Set(),positions=new Set();
for(const u of units){
 if(!/^(A0|A1|A2|B1|B2|C1|C2)$/.test(u.level))throw Error('Invalid level: '+u.id);
 if(!/^[a-c][0-2]-\d{2}$/.test(u.id)||u.id.slice(0,2).toUpperCase()!==u.level)throw Error('Invalid ID: '+u.id);
 if(ids.has(u.id)||positions.has(u.level+':'+u.position))throw Error('Duplicate ID or position: '+u.id);
 ids.add(u.id);positions.add(u.level+':'+u.position);
 if(!Number.isInteger(u.position)||u.position<1||!u.title||!Number.isInteger(u.minutes)||u.minutes<1||u.minutes>120)throw Error('Invalid metadata: '+u.id);
 if(!Array.isArray(u.content?.sections)||u.content.sections.length<2||!Array.isArray(u.content.vocabulary)||u.content.vocabulary.length<4)throw Error('Incomplete lesson: '+u.id);
 for(const s of u.content.sections){
  if(!s.heading)throw Error('Missing section heading: '+u.id);
  if(Array.isArray(s.items)){if(!s.items.length||s.items.some(x=>!x.french||!x.english||!x.usage))throw Error('Incomplete expression: '+u.id)}
  else if(Array.isArray(s.dialogue)){if(!s.dialogue.length||s.dialogue.some(x=>!x.french||!x.english))throw Error('Incomplete dialogue: '+u.id)}
  else throw Error('Unsupported section format: '+u.id);
 }
 if(u.content.vocabulary.some(x=>!Array.isArray(x)||x.length!==2||!x[0]||!x[1]))throw Error('Incomplete vocabulary: '+u.id);
 if(!Array.isArray(u.quiz)||u.quiz.length<5)throw Error('Need at least five quiz questions: '+u.id);
 const qids=new Set();
 for(const q of u.quiz){
  if(!q.id||qids.has(q.id)||q.type!=='choice'||!q.prompt||!Array.isArray(q.options)||q.options.length<3||q.options.some(x=>!x)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||!q.explanation)throw Error('Invalid quiz question: '+u.id+'/'+q.id);
  qids.add(q.id);
 }
 if(u.published!==false)throw Error('Batch lessons must start unpublished: '+u.id);
}
console.log('Validated '+units.length+' unpublished lessons: '+[...ids].join(', '));
