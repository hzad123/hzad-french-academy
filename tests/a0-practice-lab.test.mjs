import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('audio-only French questions hide transcript until grading',async()=>{
 const [lab,lesson,store]=await Promise.all([
   readFile('src/learning/practice-lab.js','utf8'),
   readFile('src/learning/secure-a0.js','utf8'),
   readFile('src/learning/supabase-store.js','utf8')
 ]);
 assert.match(lab,/transcript\.hidden=true/);
 assert.match(lab,/transcript\.hidden=false/);
 assert.match(lab,/speakFrench\(check\.french,play,status,/);
 assert.match(lab,/speakFrench\(check\.french,slow,status,/);
 assert.match(lesson,/renderListeningCheck\(field,audioByQuestion\.get\(q\.id\)\)/);
 const verified=lesson.indexOf('const result=await store.checkAnswer');
 const reveal=lesson.indexOf('revealTranscript()',verified);
 assert.ok(reveal>verified,'transcript is revealed only after server confirms the answer');
 assert.match(store,/listeningChecks:row\.content\?\.listening_checks/);
 assert.doesNotMatch(lab,/client\.rpc|service_role|fetch\(/);
});

test('speaking and writing practice remains local and cleans up microphone streams',async()=>{
 const [lab,lesson,store]=await Promise.all([
   readFile('src/learning/practice-lab.js','utf8'),
   readFile('src/learning/secure-a0.js','utf8'),
   readFile('src/learning/supabase-store.js','utf8')
 ]);
 assert.match(lab,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(lab,/new MediaRecorder/);
 assert.match(lab,/URL\.createObjectURL/);
 assert.match(lab,/URL\.revokeObjectURL/);
 assert.match(lab,/track\.stop\(\)/);
 assert.match(lab,/saved only in this browser tab/);
 assert.match(lab,/textarea/);
 assert.match(lesson,/disposePractice\?\.\(\)/);
 assert.match(lesson,/renderPracticeLab\(content,unit\)/);
 assert.match(store,/practiceTasks:row\.content\?\.practice_tasks/);
});
