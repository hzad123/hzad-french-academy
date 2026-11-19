import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sql=await readFile('supabase/migrations/20261119215858_tcf_reading_07_14_close_reading_v4_owner_approved.sql','utf8');
const version='tcf-reading-2026-11-close-reading-v4';
test('owner-approved TCF Reading 07-14 release contains exactly the eight immutable reviewed banks',async()=>{
  const source=[...sql.matchAll(/\\$bank_(\\d+)\\$([\\s\\S]*?)\\$bank_\\1\\$/g)];
  assert.equal(source.length,8);
  assert.deepEqual(source.map(m=>Number(m[1])),Array.from({length:8},(_,i)=>i+7));
  for(const [_,n,body] of source){
    const id=String(n).padStart(2,'0');
    const reviewed=JSON.parse(await readFile('supabase/exams/tcf-reading-v4/test-'+id+'.json','utf8'));
    const inserted=JSON.parse(body);
    assert.deepEqual(inserted,reviewed);
    assert.equal(reviewed.id,'tcf-reading-'+id);
    assert.equal(reviewed.version,version);
    assert.equal(reviewed.questions.length,39);
    assert.equal(reviewed.seconds,3600);
    assert.equal(reviewed.maxPoints,699);
    assert.equal(reviewed.questions.reduce((s,q)=>s+q.points,0),699);
  }
  assert.match(sql,/old_bank_count\\+8/);
  assert.match(sql,/updated_rows<>8/);
  assert.match(sql,/Other reading pointers modified/);
  assert.match(sql,/Student attempts altered/);
  assert.match(sql,/Early reading questions changed/);
});
