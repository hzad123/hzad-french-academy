import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../curriculum/explanations/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,base),'utf8'));
const source=read('source-phrases.json');
const levels=['a1','a2','b1','b2','c1','c2'];
const mappings=levels.flatMap(level=>read(level+'-specific.json').map(x=>({...x,level:level.toUpperCase()})));
test('every affected transfer phrase has exactly one explanatory mapping',()=>{
 assert.equal(source.length,441);
 assert.equal(source.reduce((sum,row)=>sum+Number(row.occurrences),0),1810);
 assert.equal(mappings.length,source.length);
 const byKey=new Map();
 for(const row of mappings){
  const key=row.level+'|'+row.french;
  assert.ok(!byKey.has(key),'Duplicate explanation: '+key);
  byKey.set(key,row);
 }
 for(const original of source){
  const note=byKey.get(original.level+'|'+original.french);
  assert.ok(note,'Missing explanation: '+original.french);
  assert.equal(note.english,original.english);
 }
});
test('every usage explanation is non-placeholder and contains a specific grammar or meaning discussion',()=>{
 const unique=new Set();
 for(const row of mappings){
  assert.ok(row.usage.length>=60,'Too short: '+row.french);
  assert.doesNotMatch(row.usage,/Related transfer phrase|Compare its grammatical function|Transfer phrase from the/i);
  assert.ok(!unique.has(row.usage),'Duplicated explanation: '+row.french);
  unique.add(row.usage);
 }
});
test('examples highlighted in A1/B1 screenshot explain actual grammar',()=>{
 const a1=mappings.find(x=>x.french==='Est-ce que vous parlez français ?');
 const b1=mappings.find(x=>x.french==="J'avais oublié le message que mon responsable m'avait envoyé.");
 assert.match(a1.usage,/yes\/no question/i);
 assert.match(b1.usage,/plus-que-parfait/i);
 assert.match(b1.usage,/masculine singular message/i);
});
