import test from 'node:test';
import assert from 'node:assert/strict';
import {a0Syllabus} from '../src/curriculum/a0-syllabus.js';
test('A0 syllabus has 24 uniquely sequenced lesson slots',()=>{
 assert.equal(a0Syllabus.length,24);
 assert.equal(new Set(a0Syllabus.map(x=>x[0])).size,24);
 assert.equal(a0Syllabus[0][0],'a0-01');
 assert.equal(a0Syllabus[23][0],'a0-24');
});
