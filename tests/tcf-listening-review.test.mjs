import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {sha256,overlaps,choiceStats,imageFingerprint,keyPattern,sourceHash,reviewHash,reviewStatus,reviewCriteria} from '../scripts/lib/listening-quality.mjs';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const banks=await Promise.all([3,4,5,6].map(n=>read(`supabase/exams/tcf-listening-test0${n}-v3.json`)));
const originals=await Promise.all([3,4,5,6].map(n=>read(`supabase/exams/tcf-listening-test0${n}.json`)));
const old=await read('supabase/exams/tcf-listening-test03-v2.json');

test('quality audit finds duplicated passages at different positions and within one paper',()=>{
 const repeated='La livraison des livres attendue mardi sera reportée au jeudi matin en raison des travaux.';
 const found=overlaps([{id:'03/9',text:repeated},{id:'04/23',text:repeated},{id:'04/31',text:repeated}]);
 assert.equal(found.length,3);
 assert(found.some(m=>m.left==='04/23'&&m.right==='04/31'));
 assert.equal(overlaps([{id:'03/9',text:repeated},{id:'04/23',text:'La médiatrice explique pourquoi les peintres observent les ombres du paysage au crépuscule.'}]).length,0);
});

test('picture duplicate detection ignores labels, metadata and palette',()=>{
 const a='<svg aria-label="Clinic"><text x="4">CLINIC</text><rect x="20" y="40" width="60" height="50" fill="#fff" stroke="#000"/></svg>';
 const b='<svg aria-label="School"><!-- new name --><text x="8">SCHOOL</text><rect x="20" y="40" width="60" height="50" fill="orange" stroke="navy"/></svg>';
 assert.equal(imageFingerprint(a),imageFingerprint(b));
 assert.notEqual(imageFingerprint(a),imageFingerprint(b.replace('width="60"','width="90"')));
});

test('choice checks use actual lengths, distinguish ties and catch the greedy answer deck',()=>{
 const q={correct:'B',options:['Les trains partiront demain.','Les trains partiront ce soir.','Les trains partiront lundi.','Les trains partiront mardi.']};
 assert.equal(choiceStats(q).correctLongest,true);
 const tied=choiceStats({correct:'A',options:['La salle A','La salle B','La salle C','La salle D']});
 assert.equal(tied.longestCredit,0.25);assert.equal(tied.uniqueCorrectLongest,false);
 assert.equal(keyPattern([...'ABCDACBDDACBBCADABDCACDBBDACDABCBCDA'].map(correct=>({correct}))).suspiciousFourItemDeck,true);
 for(const paper of banks)assert.equal(keyPattern(paper.questions).suspiciousFourItemDeck,false);
});

test('Test03 Q24 key follows the actual survey evidence in a new immutable version',()=>{
 const prior=old.questions[23],q=banks[0].questions[23];
 assert.equal(prior.options['ABCD'.indexOf(prior.correct)],'Elle a exclu les rendez-vous pris plusieurs mois auparavant.');
 assert.equal(q.options['ABCD'.indexOf(q.correct)],"Elle n'a interrogé que les personnes inscrites sur l'application.");
 assert(q.transcript.includes("Nous n'avons interrogé que les personnes qui ont réussi à créer un compte et à réserver."));
 assert.deepEqual(q.segments,prior.segments,'Written choices do not require rerecording the unchanged interview');
 assert.notEqual(q.explanation,prior.explanation);
});

test('Test04 removes unsupported weekdays, preserves grade meaning and has one challenged proposition',()=>{
 const qs=banks[1].questions;
 assert(qs[8].options.every(text=>!/(lundi|mardi|mercredi|jeudi|vendredi)/i.test(text)));
 assert.equal(qs[8].options['ABCD'.indexOf(qs[8].correct)],'Au laboratoire trois, demain à neuf heures.');
 assert.equal(qs[12].options['ABCD'.indexOf(qs[12].correct)],'Les expériences des élèves de troisième en laboratoire.');
 assert.equal(qs[34].options['ABCD'.indexOf(qs[34].correct)],"L'ajustement du niveau suffit à faire progresser l'élève.");
 assert(qs[34].transcript.includes("une bonne adaptation automatique n'assure pas"));
 for(const i of [4,6,7])assert(!/(première|deuxième|troisième|dernière) (réponse|proposition)/i.test(qs[i].explanation));
});

test('new candidates keep the historical per-question slots and only rerecord changed spoken items',async()=>{
 for(const [index,paper] of banks.entries()) {
  assert.equal(paper.questions.length,39);assert.equal(paper.seconds,2100);
  assert.deepEqual(paper.questions.map(q=>q.slotSeconds),originals[index].questions.map(q=>q.slotSeconds));
  assert.equal(paper.questions.reduce((s,q)=>s+q.slotSeconds,0),2100);
  const root=`assets/tcf-listening/${paper.version}`;
  const manifest=await read(root+'/manifest.json');
  for(const [i,q] of paper.questions.entries()) {
   const entry=manifest.files[i];
   assert.equal(q.audio,entry.file);
   assert.equal(sha256(await readFile(root+'/audio/'+q.audio)),entry.sha256);
   assert.equal(sourceHash(q.segments),entry.sourceHash,'The exact French script must match recording provenance');
   assert.equal(q.transcript,q.segments.map(s=>s.text).join('\n'));
   assert(q.audioSeconds>0&&q.audioSeconds+12<=q.slotSeconds);
   if([23,29,34].includes(q.number)||(index===0&&[7,9].includes(q.number))||(index===3&&q.number===19))assert(!entry.retainedFrom);
   else assert(entry.retainedFrom?.endsWith('-v2'));
  }
 }
 const preserved={
  'supabase/exams/tcf-listening-test01.json':'1106a48f706432bfc62358634443f8695ad5d1075c14b8d4415d42e451b15ed6',
  'supabase/exams/tcf-listening-test02.json':'7d8351e1cc79c7e3bbe064887789d39ed5bc515303db364cdc2d919033ae9e74',
  'supabase/exams/tcf-listening-test03-v2.json':'f9a28ea298c2955f506cf89485faead6dfc0fc454147ebc074ed1cadd02cdcd1',
  'supabase/exams/tcf-listening-test04-v2.json':'c98b8daecb5f1e47bad81eddb7cfcadfca028188e314c871f5d7000b8a07da58'
 };
 for(const [file,hash] of Object.entries(preserved))assert.equal(sha256(await readFile(file)),hash);
});

test('panel and debate speaker profiles are explicit and stable across turns',()=>{
 for(const paper of banks)for(const number of [23,29,34]) {
  const q=paper.questions[number-1];
  assert(q.segments.every(s=>['female','male','female_alt','male_alt'].includes(s.speaker)));
  assert(q.segments.every(s=>s.speaker.split('_')[0]===s.voice));
  assert.equal(q.segments[0].speaker,'female');
  assert.equal(q.segments.at(-1).speaker,'female');
 }
 const debate=banks[0].questions[28].segments;
 assert.equal(debate[1].speaker,debate[3].speaker,'Host introduction keeps the host voice');
 assert.notEqual(debate[3].speaker,debate[4].speaker,'Leclerc has her own voice');
 assert.equal(debate[2].speaker,debate[5].speaker,'Duval keeps the same voice');
 const panel=banks[3].questions[22].segments;
 assert.notEqual(panel[2].speaker,panel[4].speaker,'Producer and parent have distinct male profiles');
 assert.equal(panel[2].speaker,panel[6].speaker,'Producer voice persists after another speaker');
});

test('Tests05–06 replace all 248 written choices without introducing a shortest-answer cue',()=>{
 for(const paper of banks.slice(2)) {
  let longest=0,shortest=0;
  for(const q of paper.questions.slice(8)) {
   const stats=choiceStats(q),sizes=stats.lengths;
   assert(stats.valid);assert(stats.ratio<1.25,'Natural, closely matched French choice lengths');
   longest+=Number(stats.correctLongest);
   shortest+=Number(sizes['ABCD'.indexOf(q.correct)]===Math.min(...sizes));
  }
  assert(longest>=5&&longest<=11,'Correct answers should sometimes, but not usually, be longest');
  assert(shortest<=12,'Do not move the guessing cue to the shortest answer');
 }
 const q=banks[3].questions[18];
 assert.equal(q.question,'Pourquoi les visites de la ferme se font-elles en petits groupes ?');
 assert.equal(q.segments.at(-1).text,q.question);
});

test('a bare editorial checklist cannot authorize release and altered content/media invalidate review',()=>{
 const q=banks[0].questions[23],version=banks[0].version;
 const review={version,number:24,contentHash:reviewHash(q),audioHash:'audio',imageHash:null,
  checks:Object.fromEntries(reviewCriteria.map(c=>[c,'pass']))};
 assert(reviewStatus(q,version,'audio',null,[review]).pending.includes('evidence'));
 const checked={...review,evidence:["Nous n'avons interrogé que les personnes qui ont réussi à créer un compte et à réserver."],
  scenario:'Survey excludes failed registration attempts',correctText:q.options['ABCD'.indexOf(q.correct)],
  distractors:[...'ABCD'].filter(letter=>letter!==q.correct).map(letter=>({letter,reason:'This interpretation is unsupported by the recorded survey method.'})),
  listeningNotes:'Test fixture only; this is not a completed real audio review.'};
 assert.equal(reviewStatus(q,version,'audio',null,[checked]).pending.length,0);
 assert.equal(reviewStatus({...q,correct:q.correct==='A'?'B':'A'},version,'audio',null,[checked]).pending.length,14);
 assert.equal(reviewStatus(q,version,'changed-audio',null,[checked]).pending.length,14);
 const staleQuote={...checked,evidence:['An invented sentence absent from the recording.']};
 assert(reviewStatus(q,version,'audio',null,[staleQuote]).pending.includes('evidence'));
});

test('server grading uses the corrected version while old banks/results and publication stay intact',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);`);
  for(const migration of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql','20261113171848_tcf_listening_test01.sql','20261113185622_tcf_listening_next_final_submit.sql','20261113194000_tcf_listening_fresh_start.sql','20261113223000_tcf_listening_twenty_registry.sql'])
   await db.exec(await readFile('supabase/migrations/'+migration,'utf8'));
  for(const paper of [old,...banks])await db.query('insert into academy_tcf_listening.papers(id,version,content) values($1,$2,$3)',[paper.id,paper.version,paper]);
  // These four v2 migrations were confirmed unapplied in production. Archival
  // insertion must never reactivate the defective withdrawn examinations.
  for(const suffix of ['20261113235900_tcf_listening_test03_v2_editorial.sql',
    '20261113235904_tcf_listening_test04_v2_editorial.sql',
    '20261113235905_tcf_listening_test05_v2_editorial.sql',
    '20261113235906_tcf_listening_test06_v2_editorial.sql']) {
    const sql=await readFile('supabase/migrations/'+suffix,'utf8');
    assert(!/insert into academy_tcf_listening\.published/.test(sql));
    await db.exec(sql);
  }
  const before=(await db.query('select content from academy_tcf_listening.papers where id=$1 and version=$2',[old.id,old.version])).rows[0].content;
  const grade=async(paper,answers)=>(await db.query('select academy_tcf_listening.grade($1,$2) result',[paper,answers])).rows[0].result;
  const priorResult=await grade(old,{'24':old.questions[23].correct});
  for(const paper of banks) {
   const answers=Object.fromEntries(paper.questions.map(q=>[q.number,q.correct]));
   const result=await grade(paper,answers);
   assert.equal(result.correct,39);assert.equal(result.total,39);assert.equal(result.unanswered,0);
   assert(result.rows.every(row=>row.isCorrect));
  }
  const corrected=banks[0],q=corrected.questions[23];
  assert.equal((await grade(corrected,{'24':q.correct})).rows[23].isCorrect,true);
  assert.deepEqual(await grade(old,{'24':old.questions[23].correct}),priorResult);
  assert.deepEqual((await db.query('select content from academy_tcf_listening.papers where id=$1 and version=$2',[old.id,old.version])).rows[0].content,before);
  assert.equal((await db.query('select count(*) count from academy_tcf_listening.published')).rows[0].count,1,'Inserting candidates must not publish them');
  await assert.rejects(()=>db.query('update academy_tcf_listening.papers set content=$1 where id=$2 and version=$3',[corrected,old.id,old.version]),/immutable/i);
 } finally {await db.close();}
});
