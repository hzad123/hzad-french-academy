import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const version='tcf-reading-2026-11-close-reading-v4';
const oldVersion='tcf-reading-2026-11-reference-v3';
const path='scripts/release/tcf-reading-15-20-v4.sql';
const sql=await readFile(path,'utf8');
const numbers=[15,16,17,18,19,20];
const updated=await Promise.all(numbers.map(n=>readFile('supabase/exams/tcf-reading-v4/test-'+n+'.json','utf8').then(JSON.parse)));
const source=await readFile('supabase/migrations/20261112222727_reading_reference_length.sql','utf8');
const originals=new Map(source.split('$paper$').filter((_,i)=>i%2===1).map(s=>{const p=JSON.parse(s);return [p.id,p]}));
const qLengths=q=>q.options.map(s=>s.trim().split(/\s+/).length);
const sqlBodies=[...sql.matchAll(/\$bank_(\d+)\$([\s\S]*?)\$bank_\1\$/g)];

test('six Reading v4 papers are source-preserving with consistent keys and answer lengths',()=>{
  assert.equal(sqlBodies.length,6);
  assert.deepEqual(sqlBodies.map(m=>Number(m[1])),numbers);
  let advanced=0;
  for(let i=0;i<6;i++){
    const p=updated[i],old=originals.get(p.id);
    assert(old,'Prior v3 paper exists for '+p.id);
    assert.equal(p.id,'tcf-reading-'+numbers[i]);
    assert.equal(p.version,version);
    assert.equal(p.questions.length,39);
    assert.equal(p.seconds,3600);
    assert.equal(p.maxPoints,699);
    assert.equal(p.questions.reduce((s,q)=>s+q.points,0),699);
    assert.deepEqual(p.questions.slice(0,24),old.questions.slice(0,24),'Early items preserved');
    assert.deepEqual(JSON.parse(sqlBodies[i][2]),p,'SQL matches editorial paper exactly');
    const totals=Object.fromEntries('ABCD'.split('').map(c=>[c,p.questions.filter(q=>q.correct===c).length]));
    for(const count of Object.values(totals))assert(count>=9&&count<=10,'Balanced answer letters');
    for(const q of p.questions.slice(24)){
      assert.equal(q.options.length,4);
      assert.equal(new Set(q.options.map(s=>s.trim().toLowerCase())).size,4);
      assert(q.explanation.length>40);
      assert('ABCD'.includes(q.correct));
      const lengths=qLengths(q),k=lengths['ABCD'.indexOf(q.correct)];
      assert(!(k===Math.max(...lengths)&&lengths.filter(v=>v===k).length===1),'Not uniquely longest '+p.id+' '+q.number);
      assert(!(k===Math.min(...lengths)&&lengths.filter(v=>v===k).length===1),'Not uniquely shortest '+p.id+' '+q.number);
      advanced++;
    }
  }
  assert.equal(advanced,90);
  assert.equal((sql.match(/\binsert into academy_tcf_reading\.papers\b/ig)||[]).length,1);
  assert.equal((sql.match(/\bupdate academy_tcf_reading\.published_papers\b/ig)||[]).length,1);
  assert.match(sql,/Expected six original v3 reading pointers/);
  assert.match(sql,/Unrelated publication pointers changed/);
  assert.match(sql,/Historical immutable papers changed/);
  assert.match(sql,/Student attempt contents changed/);
});

test('local production-shape release is atomic, versioned and preserves all earlier papers and attempts',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema academy_tcf_reading; create table academy_tcf_reading.papers(id text,version text,content jsonb,primary key(id,version)); create table academy_tcf_reading.published_papers(test_id text primary key,version text not null,foreign key(test_id,version) references academy_tcf_reading.papers(id,version)); create table academy_tcf_reading.attempts(id text primary key,test_id text,version text,payload jsonb);');
    const p6=await Promise.all(Array.from({length:6},(_,i)=>readFile('supabase/exams/tcf-reading-v6/test-'+String(i+1).padStart(2,'0')+'.json','utf8').then(JSON.parse)));
    const p8=await Promise.all(Array.from({length:8},(_,i)=>readFile('supabase/exams/tcf-reading-v4/test-'+String(i+7).padStart(2,'0')+'.json','utf8').then(JSON.parse)));
    const p0=numbers.map(n=>originals.get('tcf-reading-'+n));
    for(const p of [...p6,...p8,...p0]){
      await db.query('insert into academy_tcf_reading.papers(id,version,content) values($1,$2,$3)',[p.id,p.version,p]);
      await db.query('insert into academy_tcf_reading.published_papers(test_id,version) values($1,$2)',[p.id,p.version]);
    }
    await db.query('insert into academy_tcf_reading.attempts values($1,$2,$3,$4)',['old-student-attempt','tcf-reading-19',oldVersion,{score:24,answers:['A','B'],status:'completed'}]);
    const snapshot=async()=>({
      refs:(await db.query('select * from academy_tcf_reading.published_papers order by test_id')).rows,
      banks:(await db.query('select id,version,content from academy_tcf_reading.papers order by id,version')).rows,
      attempts:(await db.query('select * from academy_tcf_reading.attempts order by id')).rows,
    });
    const before=await snapshot();
    await db.exec(sql.replace(/commit;\s*$/,'rollback;'));
    assert.deepEqual(await snapshot(),before,'Dry-run rollback must be clean');
    await db.exec(sql);
    const after=await snapshot();
    assert.equal(after.banks.length,before.banks.length+6);
    assert.deepEqual(after.attempts,before.attempts);
    assert.deepEqual(after.banks.filter(x=>x.version!==version || x.id<'tcf-reading-15'),before.banks);
    for(let i=0;i<20;i++){
      const ref=after.refs[i];
      assert.equal(ref.test_id,'tcf-reading-'+String(i+1).padStart(2,'0'));
      assert.equal(ref.version,i<6?p6[i].version:version);
    }
    await assert.rejects(()=>db.exec(sql),/Expected six original v3|already exist/i,'Cannot apply twice');
    await db.exec('rollback;');
    assert.deepEqual(await snapshot(),after,'Aborted retry preserves live state');
  }finally{await db.close()}
});
