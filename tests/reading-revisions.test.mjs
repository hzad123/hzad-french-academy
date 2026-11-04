import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countFrenchWords} from '../src/learning/reading-workshop.js';

const drafts=JSON.parse(readFileSync(new URL('../curriculum/revisions/reading-batch-01.json',import.meta.url),'utf8'));
test('reading editorial batch has unique, correctly levelled IDs',()=>{
  assert.equal(new Set(drafts.map(x=>x.id)).size,drafts.length);
  for(const reading of drafts){
    assert.match(reading.id,/^(a[12]|b[12]|c[12])-\d{3}$/);
    assert.equal(reading.level,reading.id.slice(0,2).toUpperCase());
    assert.equal(reading.status,'editorial_draft_pending_review');
  }
});
test('A1 and C2 revised originals are longer and have translation and comprehension prompts',()=>{
  assert.ok(countFrenchWords(drafts.find(x=>x.id==='a1-001').french)>=120);
  assert.ok(countFrenchWords(drafts.find(x=>x.id==='c2-001').french)>=280);
  for(const item of drafts){
    assert.ok(item.english.length>400);
    assert.ok(item.comprehension_prompts.length>=3);
    assert.ok(item.editorial_focus.length>=3);
  }
});
