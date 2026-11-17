import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/exams/tef-writing/ui.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261117230000_tef_writing_unlock_sections.sql',import.meta.url),'utf8');
test('TEF writing A and B allow entry within one overall 60-minute deadline',()=>{
 assert.match(ui,/const isOpen=!locked&&remaining\(\)>0;/);
 assert.match(ui,/Date\.parse\(attempt\.deadline\)/);
 assert.doesNotMatch(ui,/phaseNow|Section B opens automatically|Section A is closed after 25 minutes/);
 assert.doesNotMatch(ui,/submit\.dataset\.locked=String\([^;]*phaseNow/);
});
test('backend unlock changes only section-phase checks, not attempt access or 60-minute deadline',()=>{
 assert.match(migration,/position\(before_clause in fn\)=0/);
 assert.match(migration,/position\(before_clause_b in fn\)=0/);
 assert.match(migration,/position\(before_submit in fn\)=0/);
 assert.match(migration,/has_function_privilege\('anon'/);
 assert.doesNotMatch(migration,/drop table|delete from academy_tef_writing|update academy_tef_writing\.attempts/i);
});
