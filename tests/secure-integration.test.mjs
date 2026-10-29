import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('dashboard exposes secure A0 entry and wires it to the authenticated client',async()=>{
 const [template,main,controller]=await Promise.all([
  readFile('src/ui/template.js','utf8'),
  readFile('src/main.js','utf8'),
  readFile('src/learning/dashboard-integration.js','utf8')
 ]);
 assert.match(template,/id="hz-open-a0"/);
 assert.match(template,/id="hz-a0-learning"/);
 assert.match(main,/wireA0\(root,client\)/);
 assert.match(controller,/checkAcademyAccess\(client\)/);
 assert.match(controller,/mountSecureA0\(area,client\)/);
});

test('client reads sanitized questions through RPC and grades on server',async()=>{
 const store=await readFile('src/learning/supabase-store.js','utf8');
 const migration=await readFile('supabase/migrations/20261029_secure_quiz_delivery.sql','utf8');
 assert.match(store,/rpc\('academy_list_units'/);
 assert.match(store,/rpc\('academy_submit_quiz'/);
 assert.doesNotMatch(store,/from\('academy_units'\)/);
 assert.match(migration,/revoke select on public\.academy_units from authenticated/i);
 assert.match(migration,/grant execute on function public\.academy_list_units\(text\) to authenticated/i);
});
