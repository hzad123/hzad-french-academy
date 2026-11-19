import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const newVersion='tcf-reading-2026-11-distractor-polish-v5';
const oldVersion='tcf-reading-2026-11-close-reading-v4';
const groups=[[7,8,9,10],[11,12,13,14],[15,16,17,18,19,20]];
const labels=['07_10','11_14','15_20'];
const load=async(p)=>JSON.parse(await readFile(p,'utf8'));
const fixture=(n,ver)=>'supabase/exams/tcf-reading-'+(ver==='new'?'distractor-polish-v5':'v4')+'/test-'+String(n).padStart(2,'0')+'.json';
const originals=new Map(),updated=new Map();
for(let n=7;n<=20;n++){originals.set(n,await load(fixture(n,'old')));updated.set(n,await load(fixture(n,'new')))}
const plans=groups.map((ids,i)=>({ids,source:'scripts/release/tcf-reading-distractor-polish-v5-'+labels[i]+'.sql'}));
const diff=await load('docs/editorial/tcf-reading-distractor-polish-v5-changes.json');

test('only 28 selected advanced distractors differ, all other content preserved',()=>{
 assert.equal(diff.length,28);
 for(let n=7;n<=20;n++){
  const old=originals.get(n),cur=updated.get(n),allowed=new Set(diff.filter(d=>d.test===n).map(d=>d.question));
  assert.equal(allowed.size,2);
  assert.equal(cur.id,old.id);
  assert.equal(old.version,oldVersion);
  assert.equal(cur.version,newVersion);
  assert.equal(cur.questions.length,39);
  assert.equal(cur.seconds,3600);
  assert.equal(cur.maxPoints,699);
  assert.equal(cur.questions.reduce((s,q)=>s+q.points,0),699);
  for(let idx=0;idx<39;idx++){
   const a=old.questions[idx],b=cur.questions[idx];
   if(!allowed.has(idx+1)){assert.deepEqual(b,a,'Untouched T'+n+' Q'+(idx+1));continue}
   assert(idx>=24);
   assert.deepEqual(Object.fromEntries(Object.entries(b).filter(([k])=>k!=='options'&&k!=='explanation')),Object.fromEntries(Object.entries(a).filter(([k])=>k!=='options'&&k!=='explanation')));
   const key='ABCD'.indexOf(a.correct);assert(key>=0);
   assert.equal(b.options[key],a.options[key]);
   assert.equal(b.options.length,4);
   assert.equal(new Set(b.options.map(o=>o.trim().toLowerCase())).size,4);
   assert(b.explanation.length>65);
   for(let c=0;c<4;c++)if(c!==key)assert.notEqual(b.options[c],a.options[c]);
   const ls=b.options.map(o=>o.trim().split(/\s+/).length),v=ls[key];
   assert(!((v===Math.min(...ls)&&ls.filter(w=>w===v).length===1)||(v===Math.max(...ls)&&ls.filter(w=>w===v).length===1)),'Length cue T'+n+' Q'+(idx+1));
  }
  assert.deepEqual(cur.questions.slice(0,24),old.questions.slice(0,24));
  assert.deepEqual(cur.questions.map(q=>q.correct),old.questions.map(q=>q.correct));
 }
});

test('all SQL release batches embed the exact reviewed papers and preserve unrelated state',async()=>{
 for(const p of plans){
  const sql=await readFile(p.source,'utf8');
  const embedded=[...sql.matchAll(/\$paper_(\d+)\$([\s\S]*?)\$paper_\1\$/g)];
  assert.deepEqual(embedded.map(m=>+m[1]),p.ids);
  for(const m of embedded)assert.deepEqual(JSON.parse(m[2]),updated.get(+m[1]));
  for(const marker of ['Student attempts changed','Historical bank data changed','Untargeted question changed','Correct answer changed','Target new versions already exist'])assert(sql.includes(marker),marker);
  assert.equal((sql.match(/insert into academy_tcf_reading\.papers\(/gi)||[]).length,1);
  assert.equal((sql.match(/update academy_tcf_reading\.published_papers/gi)||[]).length,1);
  assert.doesNotMatch(sql,/\bdelete from\b|\btruncate table\b|\bdrop table\b/i);
 }
});

test('PGlite dry-run and staged release preserve original papers and a saved student attempt',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create schema academy_tcf_reading; create table academy_tcf_reading.papers(id text,version text,content jsonb,primary key(id,version)); create table academy_tcf_reading.published_papers(test_id text primary key,version text,foreign key(test_id,version) references academy_tcf_reading.papers(id,version)); create table academy_tcf_reading.attempts(id text primary key,test_id text,version text,payload jsonb);");
  const v6=await Promise.all(Array.from({length:6},(_,i)=>load('supabase/exams/tcf-reading-v6/test-'+String(i+1).padStart(2,'0')+'.json')));
  for(const b of [...v6,...originals.values()]){
   await db.query('insert into academy_tcf_reading.papers(id,version,content) values($1,$2,$3::jsonb)',[b.id,b.version,JSON.stringify(b)]);
   await db.query('insert into academy_tcf_reading.published_papers(test_id,version) values($1,$2)',[b.id,b.version]);
  }
  await db.query('insert into academy_tcf_reading.attempts values($1,$2,$3,$4::jsonb)',['legacy','tcf-reading-07',oldVersion,JSON.stringify({score:17,answers:['A','B'],status:'saved'})]);
  const previous=(await db.query('select id,version,content from academy_tcf_reading.papers order by id,version')).rows;
  const attempts=(await db.query('select * from academy_tcf_reading.attempts')).rows;
  for(const p of plans){
   const sql=await readFile(p.source,'utf8');
   const hashes=(await db.query('select id,md5(content::text) as digest from academy_tcf_reading.papers where version=$1',[oldVersion])).rows;
   let local=sql;
   for(const m of sql.matchAll(/\('tcf-reading-(\d{2})','([0-9a-f]{32})'\)/g)){
    const digest=hashes.find(h=>h.id==='tcf-reading-'+m[1])?.digest;
    assert(digest);
    local=local.replace(m[2],digest);
   }
   const before=(await db.query('select id,version,content from academy_tcf_reading.papers order by id,version')).rows;
   await db.exec(local.replace(/commit;\s*$/i,'rollback;'));
   assert.deepEqual((await db.query('select id,version,content from academy_tcf_reading.papers order by id,version')).rows,before);
   await db.exec(local);
   assert.deepEqual((await db.query('select * from academy_tcf_reading.attempts')).rows,attempts);
  }
  const after=(await db.query('select id,version,content from academy_tcf_reading.papers order by id,version')).rows;
  assert.equal(after.length,previous.length+14);
  assert.deepEqual(after.filter(r=>r.version!==newVersion),previous);
  const pointers=(await db.query('select test_id,version from academy_tcf_reading.published_papers order by test_id')).rows;
  assert.equal(pointers.length,20);
  for(let i=0;i<20;i++)assert.equal(pointers[i].version,i<6?v6[i].version:newVersion);
  assert.deepEqual((await db.query('select * from academy_tcf_reading.attempts')).rows,attempts);
 }finally{await db.close()}
});
