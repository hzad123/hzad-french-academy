import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contentHash,stimulus} from '../scripts/lib/listening-answer-qc.mjs';
import {contrastPlan} from '../scripts/lib/listening-contrast-quality.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const drafts=await readJson('../curriculum/tcf-listening-45-focused-drafts.json');
const seeds=await readJson('../curriculum/tcf-listening-contrast-design-seeds.json');
const banks=await Promise.all(Array.from({length:6},(_,i)=>readJson('../supabase/exams/tcf-listening-test'+String(i+1).padStart(2,'0')+'-v4.json')));

test('all 45 rejected listening items have versioned source-grounded editorial revisions',()=>{
  assert.equal(drafts.entries.length,45);
  const unique=new Set(drafts.entries.map(d=>d.key));
  assert.equal(unique.size,45);
  for(const {key,question,choices} of drafts.entries){
    const [testNumber,number]=key.split('-').map(Number);
    const original=banks[testNumber-1]?.questions[number-1];
    assert.ok(original&&original.number===number,'Source question missing: '+key);
    assert.ok(number>=9&&number<=39,'No speaking/visual alternative is rewritten without audio evidence: '+key);
    const candidate=seeds.find(x=>x.test===testNumber&&x.number===number);
    assert.ok(candidate,'Missing source-specific seed: '+key);
    assert.equal(candidate.sourceHash,contentHash(original),'Original source hash changed: '+key);
    assert.equal(candidate.requireSeedRevision,true,'Proposed revision not marked for re-screen: '+key);
    assert.deepEqual(candidate.authored.choices,choices,'Draft/source mismatch: '+key);
    assert.equal(candidate.authored.question,question,'Stem/source mismatch: '+key);
    assert.equal(candidate.authored.correctIndex,0,'Candidate key basis changed: '+key);
    assert.equal(new Set(choices.map(c=>c.trim().toLocaleLowerCase('fr'))).size,4,'Duplicate alternatives: '+key);
    assert.ok(choices.every(c=>c.trim().length>=6&&c.trim().length<=175),'Unusable choice: '+key);
    const proof=contrastPlan(original,candidate.authored);
    assert.deepEqual(proof.errors,[],'Invalid original French source anchors for '+key+': '+JSON.stringify(proof.errors));
    assert.ok(stimulus(original).length>45,'No recorded listening stimulus: '+key);
  }
});
