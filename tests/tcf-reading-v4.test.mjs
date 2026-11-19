import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const VERSION='tcf-reading-2026-11-close-reading-v4';
const PRIOR='tcf-reading-2026-11-reference-v3';
const letters='ABCD';
const ids=Array.from({length:14},(_,i)=>'tcf-reading-'+String(i+7).padStart(2,'0'));
const papers=await Promise.all(ids.map(id=>readFile('tests/fixtures/tcf-reading-v4/'+id+'.json','utf8').then(JSON.parse)));
const originSQL=await readFile('supabase/migrations/20261112222727_reading_reference_length.sql','utf8');
const priorBanks=new Map(originSQL.split('$paper$').filter((_,i)=>i%2===1).map(s=>{let b=JSON.parse(s);return [b.id,b]}));
const sql=await readFile('supabase/migrations/20261119180000_tcf_reading_07_20_close_reading_v4.sql','utf8');
const values=[...sql.matchAll(/\$paper_(\d+)\$([\s\S]*?)\$paper_\1\$/g)].map(([,n,body])=>({n:Number(n),paper:JSON.parse(body)}));
const existingSix=await Promise.all(Array.from({length:6},(_,i)=>readFile('supabase/exams/tcf-reading-v6/test-'+String(i+1).padStart(2,'0')+'.json','utf8').then(JSON.parse)));
const max=new Set();
const review=JSON.parse(await readFile('docs/editorial/tcf-reading-07-20/continuation-answer-record.json','utf8'));
const reviewed=new Map(review.items.map(item=>[`${item.test}:${item.question}`,item]));


test('v4 editorial and bank invariants: 210 advanced items, 14 separate reviewed immutable versions',()=>{
  assert.equal(papers.length,14);
  assert.equal(review.items.length,210,'Every advanced item has an answer review record');
  assert.equal(reviewed.size,210,'Review records are unique');
  assert.equal(values.length,14);
  assert.deepEqual(values.map(x=>x.n),Array.from({length:14},(_,i)=>i+7));
  assert.deepEqual(values.map(x=>x.paper),papers,'migration content exactly matches final reviewed fixtures');
  for(const [i,p]of papers.entries()){
    const old=priorBanks.get(p.id);
    assert(old,p.id+' old bank exists');
    assert.equal(p.id,ids[i]);assert.equal(p.version,VERSION);
    assert.equal(p.seconds,3600);assert.equal(p.maxPoints,699);
    assert.equal(p.questions.length,39);
    assert.equal(p.questions.reduce((a,q)=>a+q.points,0),699);
    assert.deepEqual(p.questions.slice(0,24),old.questions.slice(0,24),p.id+' Q1-24 retained byte-for-byte');
    const counts=Object.fromEntries([...letters].map(k=>[k,p.questions.filter(q=>q.correct===k).length]));
    for(const c of Object.values(counts))assert(c>=9&&c<=10,p.id+' balanced letters');
    for(let j=0;j<39;j++){
      const q=p.questions[j],oldq=old.questions[j],tag=p.id+' Q'+(j+1);
      assert.equal(q.number,j+1,tag);
      assert.equal(q.points,oldq.points,tag+' point weight');
      assert.equal(q.options.length,4,tag);
      assert.equal(new Set(q.options.map(x=>x.trim().toLowerCase())).size,4,tag);
      assert(letters.includes(q.correct),tag);
      for(const text of [q.passage,q.question,q.explanation,...q.options])assert.equal(typeof text,'string',tag);
      assert(q.explanation.length>25,tag+' explanation required');
      if(j<24)continue;
      assert.equal(q.passage.startsWith(oldq.passage+' '),true,tag+' source retained + new evidence');
      assert.notEqual(q.question,oldq.question,tag+' rewritten question');
      assert.notDeepEqual(q.options,oldq.options,tag+' rewritten choices');
      assert.notEqual(q.explanation,oldq.explanation,tag+' rewritten explanation');
      const lengths=q.options.map(x=>x.trim().split(/\s+/).length);
      const correctLength=lengths[letters.indexOf(q.correct)];
      assert(!(correctLength===Math.max(...lengths)&&lengths.filter(x=>x===correctLength).length===1),tag+' correct option must not be uniquely longest');
      assert(!max.has(q.passage),tag+' passage reused across papers');
      max.add(q.passage);
      const reviewedItem=reviewed.get(`${String(i+7).padStart(2,'0')}:${j+1}`);
      assert(reviewedItem,tag+' review record must exist');
      assert.equal(q.correct,reviewedItem.selected_answer,tag+' reviewed answer letter');
      assert.equal(q.options[letters.indexOf(q.correct)],reviewedItem.correct_option_text,tag+' reviewed answer meaning');
      assert.deepEqual(lengths,reviewedItem.option_lengths,tag+' recorded distractor lengths');
      assert.equal(reviewedItem.unique_longest_correct,false,tag+' correct cannot be uniquely longest');
      for(const guess of letters){
        const score=(guess===reviewedItem.selected_answer)?q.points:0;
        assert.equal(score,guess===q.correct?q.points:0,tag+' alternative '+guess+' against recorded answer');
        assert.equal(q.options[letters.indexOf(guess)]===reviewedItem.correct_option_text,guess===q.correct,tag+' option meaning '+guess);
      }
    }
  }
  assert.equal(max.size,210);
});
test('migration touches only immutable reading banks and fourteen guarded publication pointers',()=>{
  const outside=sql.replace(/\$paper_\d+\$[\s\S]*?\$paper_\d+\$/g,"'JSON'").replace(/--[^\n]*/g,'');
  assert.equal((outside.match(/\binsert\s+into\s+academy_tcf_reading\.papers\b/gi)||[]).length,1);
  assert.equal((outside.match(/\bupdate\s+academy_tcf_reading\.published_papers\b/gi)||[]).length,14);
  const targets=[...outside.matchAll(/\b(?:insert\s+into|update)\s+([a-z_][a-z0-9_.]*)/gi)].map(m=>m[1]);
  assert.deepEqual(targets,['academy_tcf_reading.papers',...Array(14).fill('academy_tcf_reading.published_papers')]);
  assert.doesNotMatch(outside,/\b(delete\s+from|truncate|drop|alter|create|grant|revoke)\b/i);
  const matches=[...outside.matchAll(/update\s+academy_tcf_reading\.published_papers\s+set\s+version='([^']+)'\s+where\s+test_id='([^']+)'\s+and\s+version='([^']+)'/gi)]
   .map(([,next,id,prev])=>({next,id,prev}));
  assert.deepEqual(matches,ids.map(id=>({next:VERSION,id,prev:PRIOR})));
  assert.match(outside,/\bbegin\s*;/i);assert.match(outside,/\bcommit\s*;\s*$/i);
});
test('v4 local SQL rollback/commit preserves historical versions and existing student attempts',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema academy_tcf_reading; create table academy_tcf_reading.papers(id text,version text,content jsonb,primary key(id,version)); create table academy_tcf_reading.published_papers(test_id text primary key,version text not null,foreign key(test_id,version) references academy_tcf_reading.papers(id,version)); create table academy_tcf_reading.attempts(id text primary key,test_id text,version text,payload jsonb); create table public.academy_learning_progress(id int primary key,payload jsonb); insert into public.academy_learning_progress values(1,\'{"completed":true}\'::jsonb);');
    for(const p of [...existingSix,...ids.map(id=>priorBanks.get(id))]){
      await db.query('insert into academy_tcf_reading.papers(id,version,content) values($1,$2,$3)',[p.id,p.version,p]);
      await db.query('insert into academy_tcf_reading.published_papers(test_id,version) values($1,$2)',[p.id,p.version]);
    }
    await db.query('insert into academy_tcf_reading.attempts values($1,$2,$3,$4)',['past-attempt','tcf-reading-07',PRIOR,{answers:['C','A'],score:11,status:'completed'}]);
    const state=async()=>({
      prior:(await db.query('select id,version,content from academy_tcf_reading.papers where version<>$1 order by id,version',[VERSION])).rows,
      attempts:(await db.query('select * from academy_tcf_reading.attempts order by id')).rows,
      learning:(await db.query('select * from public.academy_learning_progress')).rows,
      refs:(await db.query('select * from academy_tcf_reading.published_papers order by test_id')).rows,
    });
    const before=await state();
    await db.exec(sql.replace(/commit;\s*$/,'rollback;'));
    assert.deepEqual(await state(),before,'rollback preserves everything');
    await db.exec(sql);
    const after=await state();
    assert.deepEqual(after.prior,before.prior,'historical immutable papers preserved');
    assert.deepEqual(after.attempts,before.attempts,'saved attempts preserved');
    assert.deepEqual(after.learning,before.learning,'learning progress preserved');
    for(let i=0;i<20;i++){
      const p=after.refs[i];
      assert.equal(p.test_id,'tcf-reading-'+String(i+1).padStart(2,'0'));
      assert.equal(p.version,i<6?existingSix[i].version:VERSION);
    }
    assert.deepEqual((await db.query('select content from academy_tcf_reading.papers where version=$1 order by id',[VERSION])).rows.map(x=>x.content),papers);
    await assert.rejects(()=>db.exec(sql),/prior pointers|immutable/i);
    await db.exec('rollback;'); // Failed guarded transaction must be explicitly cleared before reads.
    const still=await state();assert.deepEqual(still,after,'repeat blocked without any writes');
  }finally{await db.close()}
});
