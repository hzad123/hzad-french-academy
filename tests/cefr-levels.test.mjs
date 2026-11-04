import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('A0 through C2 use the same protected course viewer and data transport',async()=>{
 const [ui,secure,store,dashboard,cards]=await Promise.all([
   readFile('src/learning/a0-ui.js','utf8'),
   readFile('src/learning/secure-a0.js','utf8'),
   readFile('src/learning/supabase-store.js','utf8'),
   readFile('src/learning/dashboard-integration.js','utf8'),
   readFile('src/dashboard/courses.js','utf8')
 ]);
 assert.match(store,/makeLearningStore\(client,level='A0'\)/);
 assert.match(store,/p_level:level/);
 assert.match(store,/client\.rpc\('academy_list_units'/);
 assert.match(store,/client\.rpc\('academy_check_answer'/);
 assert.match(store,/client\.rpc\('academy_submit_quiz'/);
 assert.doesNotMatch(store,/from\('academy_units'\)/);
 assert.match(secure,/mountSecureA0\(host,client,level='A0'\)/);
 assert.match(secure,/const store=makeLearningStore\(client,level\)/);
 assert.match(dashboard,/checkAcademyAccess\(client\)/);
 assert.match(dashboard,/mountSecureA0\(area,client,level\)/);
 assert.match(dashboard,/data-course-level/);
 assert.match(cards,/A1:49,A2:54,B1:69,B2:69,C1:61,C2:60/);
 assert.match(cards,/Available now/);
 assert.doesNotMatch(cards,/Early-access drafts/);
 assert.match(ui,/level!=='A0'/);
 assert.match(ui,/AVAILABLE NOW/);
 assert.doesNotMatch(ui,/unreviewed study drafts|EARLY ACCESS/);
 assert.doesNotMatch(ui,/not official CEFR certification/);
});
