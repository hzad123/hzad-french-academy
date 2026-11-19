import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';

const VERSION = 'tcf-reading-2026-11-close-reading-v6';
const PREVIOUS_VERSION = 'tcf-reading-2026-11-advanced-v5';
const letters = 'ABCD';
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
const papers = await Promise.all(Array.from({length: 6}, (_, i) =>
  readJSON(`supabase/exams/tcf-reading-v6/test-${String(i + 1).padStart(2, '0')}.json`)));
const previousPapers = await Promise.all(Array.from({length: 6}, (_, i) =>
  readJSON(`supabase/exams/tcf-reading-v5/test-${String(i + 1).padStart(2, '0')}.json`)));
const review = await readJSON('tests/fixtures/tcf-reading-v6-independent-review.json');
const reviews = new Map(review.items.map(item => [`${item.test}:${item.number}`, item]));
const migrations = (await readdir('supabase/migrations')).filter(name =>
  name.endsWith('_tcf_reading_01_06_close_reading_v6.sql'));
assert.equal(migrations.length, 1, 'Exactly one pending v6 migration is permitted');
const migrationFile = migrations[0];
const migration = await readFile(`supabase/migrations/${migrationFile}`, 'utf8');
const migrationVersion = migrationFile.split('_')[0];
const migrationName = migrationFile.slice(migrationVersion.length + 1, -4);
const priorFiles = [
  '20261029_academy_learning.sql',
  '20261105001000_ai_learning.sql',
  '20261112204911_tcf_reading_test01.sql',
  '20261112212313_tcf_reading_twenty_tests.sql',
  '20261112222727_reading_reference_length.sql',
  '20261117225800_tcf_reading_two_editorial.sql',
  '20261118210000_tcf_reading_01_06_advanced_v5.sql',
];
const priorSQL = await Promise.all(priorFiles.map(file => readFile(`supabase/migrations/${file}`, 'utf8')));
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const unverified = '33333333-3333-4333-8333-333333333333';
const bankIDs = papers.map(paper => paper.id);

// These records are independent editorial decisions, not expectations generated
// from q.correct. Binding the entire record prevents a later passage, option or
// explanation change from silently retaining an obsolete editorial acceptance.
test('v6 migration contains exactly the six reviewed banks and ninety independent decisions', () => {
  assert.equal(review.version, VERSION);
  assert.equal(review.items.length, 90);
  assert.equal(reviews.size, 90, 'No duplicate or missing independent reviews');
  assert.deepEqual([...reviews.keys()].sort(), papers.flatMap((_, i) =>
    Array.from({length: 15}, (_, j) => `${i + 1}:${j + 25}`)).sort());
  assert.equal(new Set(papers.flatMap(paper => paper.questions.slice(24).map(q => q.passage))).size, 90);
  assert.deepEqual(migration.split('$paper$').filter((_, i) => i % 2).map(JSON.parse), papers);
  assert(migrationVersion > '20261118210000', 'Pending migration must follow v5');

  // Inspect SQL outside the embedded prose, so natural-language text cannot
  // accidentally satisfy or violate the write-scope assertions.
  const sql = migration.split('$paper$').filter((_, i) => !(i % 2)).join(' ')
    .replace(/--[^\n]*/g, '');
  assert.equal((sql.match(/\binsert\s+into\s+academy_tcf_reading\.papers\b/gi) || []).length, 1);
  assert.equal((sql.match(/\bupdate\s+academy_tcf_reading\.published_papers\b/gi) || []).length, 6);
  const targets = [...sql.matchAll(/\b(?:insert\s+into|update)\s+([a-z_][a-z0-9_.]*)/gi)].map(m => m[1]);
  assert.deepEqual(targets, ['academy_tcf_reading.papers', ...Array(6).fill('academy_tcf_reading.published_papers')]);
  assert.doesNotMatch(sql, /\b(delete\s+from|truncate|drop|alter|create|grant|revoke)\b/i);
  const pointerChanges = [...sql.matchAll(/update\s+academy_tcf_reading\.published_papers\s+set\s+version='([^']+)'\s+where\s+test_id='([^']+)'\s+and\s+version='([^']+)'/gi)]
    .map(([, next, id, prior]) => ({id, next, prior}));
  assert.deepEqual(pointerChanges, bankIDs.map(id => ({id, next: VERSION, prior: PREVIOUS_VERSION})));
  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;\s*$/i);
});

for (const [index, paper] of papers.entries()) {
  test(`v6 Test ${String(index + 1).padStart(2, '0')}: all fifteen answers, distractors and explanations match source-first review`, () => {
    const previous = previousPapers[index];
    assert.equal(paper.id, `tcf-reading-${String(index + 1).padStart(2, '0')}`);
    assert.equal(paper.id, previous.id);
    assert.equal(paper.title, previous.title);
    assert.equal(paper.version, VERSION);
    assert.equal(paper.seconds, 3600);
    assert.equal(paper.maxPoints, 699);
    assert.equal(paper.questions.length, 39);
    assert.equal(paper.questions.reduce((sum, q) => sum + q.points, 0), 699);
    assert.deepEqual(paper.questions.slice(0, 24), previous.questions.slice(0, 24));
    const positions = Object.fromEntries([...letters].map(letter => [letter, 0]));
    for (const [position, q] of paper.questions.entries()) {
      const label = `${paper.id}/Q${position + 1}`;
      assert.equal(q.number, position + 1, label);
      assert.equal(q.points, previous.questions[position].points, `${label}: unchanged scoring weight`);
      assert.equal(q.options.length, 4, label);
      for (const value of [q.passage, q.question, q.explanation, ...q.options]) {
        assert.equal(typeof value, 'string', label);
        assert(value.trim().length > 0, `${label}: nonempty text`);
      }
      assert.equal(new Set(q.options.map(option => option.normalize('NFC').trim().toLowerCase())).size, 4, label);
      assert.match(q.correct, /^[ABCD]$/, label);
      positions[q.correct]++;
      if (q.number < 25) continue;

      const decision = reviews.get(`${index + 1}:${q.number}`);
      assert(decision, `${label}: independent decision missing`);
      assert.equal(decision.fingerprint, createHash('sha256').update(JSON.stringify(q)).digest('hex'), `${label}: review is stale`);
      assert.equal(decision.independent_answer, q.correct, `${label}: key differs from independent passage interpretation`);
      assert.equal(decision.correct_option_text, q.options[letters.indexOf(q.correct)], `${label}: letter changed meaning`);
      assert.equal(decision.blind_pass, true, `${label}: answer-only cue review`);
      assert(decision.blind_review.trim().length > 25, `${label}: meaningful blind-review rationale`);
      assert.equal(decision.explanation_verified, true, `${label}: explanation compared after independent selection`);
      assert.deepEqual(decision.unresolved_issues, [], `${label}: unresolved editorial issue`);
      assert(decision.correct_evidence.length >= 1, `${label}: source evidence required`);
      for (const quote of decision.correct_evidence) {
        assert(quote.trim().length > 0 && q.passage.includes(quote), `${label}: exact correct-answer evidence absent: ${quote}`);
      }
      assert.deepEqual(decision.rejected_options.map(item => item.option).sort(),
        [...letters].filter(letter => letter !== decision.independent_answer), `${label}: all three alternatives need evidence`);
      for (const rejected of decision.rejected_options) {
        assert(rejected.why_tempting.trim().length > 0, `${label}/${rejected.option}: plausibility rationale required`);
        assert(rejected.reason.trim().length > (q.number >= 35 ? 25 : 15), `${label}/${rejected.option}: substantive rejection rationale required`);
        assert(rejected.passage_evidence.length > 0, `${label}/${rejected.option}: source evidence required`);
        for (const quote of rejected.passage_evidence) {
          assert(quote.trim().length > 0 && q.passage.includes(quote), `${label}/${rejected.option}: exact rejection evidence absent: ${quote}`);
        }
      }
      assert(decision.difficulty_review.why_not_sentence_match.trim().length > 25, `${label}: difficulty reasoning required`);
      if (q.number >= 35) {
        assert.equal(decision.difficulty_review.needs_multiple_details, true, `${label}: final tier requires integration`);
        assert(new Set(decision.correct_evidence).size >= 2, `${label}: two distinct actual source excerpts required`);
      }
    }
    for (const letter of letters) assert(positions[letter] >= 9 && positions[letter] <= 10,
      `${paper.id}: ${letter} has ${positions[letter]} positions`);
    assert.doesNotMatch(paper.questions.map(q => q.correct).join(''), /([ABCD])\1{3}/, 'No four-answer runs');
    if (index === 0) {
      assert.equal(paper.questions[29].correct, 'B', 'Oceans: local acidity falls while atmospheric carbon rises at both sites');
      assert.equal(reviews.get('1:30').independent_answer, 'B');
    }
  });
}

const protectedTables = [
  'auth.users', 'public.purchase_entitlements', 'public.academy_units',
  'public.academy_learning_progress', 'academy_ai.wallets', 'academy_ai.requests',
  'academy_ai.ledger', 'academy_ai.policy', 'academy_ai.activities',
  'academy_ai.conversations', 'academy_ai.paid_topups', 'academy_ai.testing_grants',
  'academy_tcf_writing.attempts', 'academy_tcf_speaking.attempts',
  'academy_tcf_speaking.calls', 'academy_exams.attempts', 'academy_exams.audio_operators',
];

async function fixture() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,
        access_starts_at timestamptz,access_ends_at timestamptz,product_code text);
      insert into auth.users values('${alice}',now()),('${bob}',now()),('${unverified}',null);
      insert into public.purchase_entitlements
        select id,'active',now(),now()-interval '1 day',null,'HZAD_FULL_ACADEMY' from auth.users;
    `);
    for (const source of priorSQL) await db.exec(source);
    // Nonempty unrelated-module sentinels make preservation checks meaningful.
    // Only these tables are minimal stand-ins; reading/auth/learning/wallet
    // behavior is loaded from the actual preceding migrations above.
    await db.exec(`
      insert into public.academy_units(id,level,position,title) values('a0-01','A0',1,'Local preservation fixture');
      insert into public.academy_learning_progress(user_id,unit_id,attempts,best_percent,completed)
        values('${alice}','a0-01',3,80,true),('${bob}','a0-01',1,60,false);
      insert into academy_ai.wallets(user_id,initial_credits,available,cap_microcad,starts_at,expires_at)
        values('${alice}',100,73,10000000,now()-interval '1 day',now()+interval '30 days'),
              ('${bob}',100,52,10000000,now()-interval '1 day',now()+interval '30 days');
      insert into academy_ai.requests(id,user_id,kind,level,input_hash,status,credits,ceiling_microcad,model,max_output_tokens)
        values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${alice}','writing','B2',repeat('a',64),'failed',2,1000,'local-fixture',100);
      insert into academy_ai.ledger(user_id,request_id,event,credits_delta,microcad)
        values('${alice}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','refund',2,0);
      create table academy_ai.testing_grants(id text primary key,payload jsonb);
      create schema academy_tcf_writing;
      create table academy_tcf_writing.attempts(id text primary key,payload jsonb);
      create schema academy_tcf_speaking;
      create table academy_tcf_speaking.attempts(id text primary key,payload jsonb);
      create table academy_tcf_speaking.calls(id text primary key,payload jsonb);
      create schema academy_exams;
      create table academy_exams.attempts(id text primary key,payload jsonb);
      create table academy_exams.audio_operators(user_id uuid primary key references auth.users(id));
      insert into academy_exams.audio_operators values('${alice}');
      create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
    `);
    const q = async (sql, params = []) => (await db.query(sql, params)).rows;
    for (const table of ['academy_ai.testing_grants', 'academy_tcf_writing.attempts',
      'academy_tcf_speaking.attempts', 'academy_tcf_speaking.calls', 'academy_exams.attempts']) {
      await q(`insert into ${table}(id,payload) values($1,$2)`,
        [`preserve-${table}`, {status: 'completed', score: 17, answers: ['B', 'D']}]);
    }
    for (const [i, file] of priorFiles.entries()) {
      const separator = file.indexOf('_');
      await q('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)',
        [file.slice(0, separator), file.slice(separator + 1, -4), [priorSQL[i]]]);
    }
    const cmd = async (user, action, id = null, payload = {}) => {
      await q("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
      await db.exec('set role authenticated');
      try {
        return (await q('select public.academy_tcf_reading_command($1,$2,$3) v', [action, id, payload]))[0].v;
      } finally {
        await db.exec('reset role');
      }
    };
    const start = (paper, user = alice, id = randomUUID()) =>
      cmd(user, 'start', id, {testId: paper.id, version: paper.version});
    // Compare PostgreSQL's serialized complete rows, including timestamps,
    // stored answers, scores, revisions and all future-added row fields.
    const rows = (table, condition = '', params = []) => q(
      `select to_jsonb(t)::text row from ${table} t ${condition} order by to_jsonb(t)::text`, params);
    const protectedState = async () => {
      const state = {};
      for (const table of protectedTables) state[table] = await rows(table);
      state.attempts = await rows('academy_tcf_reading.attempts');
      state.historicalPapers = await rows('academy_tcf_reading.papers', 'where version<>$1', [VERSION]);
      state.unrelatedPointers = await rows('academy_tcf_reading.published_papers', 'where not(test_id=any($1::text[]))', [bankIDs]);
      return state;
    };
    const allState = async () => ({
      ...await protectedState(),
      papers: await rows('academy_tcf_reading.papers'),
      pointers: await rows('academy_tcf_reading.published_papers'),
      migrations: await rows('supabase_migrations.schema_migrations'),
    });
    return {db, q, cmd, start, rows, protectedState, allState};
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function savedAttempts({cmd, start}) {
  let completed = await start(previousPapers[0]);
  completed = await cmd(alice, 'answer', completed.id, {
    revision: completed.revision, number: 1, choice: previousPapers[0].questions[0].correct,
  });
  completed = await cmd(alice, 'answer', completed.id, {
    revision: completed.revision, number: 30,
    choice: [...letters].find(letter => letter !== previousPapers[0].questions[29].correct),
  });
  completed = await cmd(alice, 'submit', completed.id, {revision: completed.revision});
  let active = await start(previousPapers[1], bob);
  active = await cmd(bob, 'answer', active.id, {
    revision: active.revision, number: 25, choice: previousPapers[1].questions[24].correct,
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.result.correct, 1);
  assert.equal(active.status, 'active');
  assert.equal(active.revision, 1);
  return {completed, active};
}

test('v6 SQL rollback and local commit preserve old work, old versions and all fourteen other tests', async () => {
  const f = await fixture();
  const {db, q, cmd, start, rows, protectedState, allState} = f;
  try {
    const {completed, active} = await savedAttempts(f);
    const before = await allState();
    const preserved = await protectedState();
    const priorCatalog = await cmd(alice, 'catalog');
    await db.exec(migration.replace(/commit;\s*$/, 'rollback;'));
    assert.deepEqual(await allState(), before, 'Rollback leaves every serialized baseline row unchanged');
    await db.exec(migration);
    assert.deepEqual(await protectedState(), preserved, 'Local commit only adds new papers and moves six pointers');
    assert.deepEqual(await rows('supabase_migrations.schema_migrations'), before.migrations);
    assert.equal((await q('select count(*)::int n from academy_tcf_reading.papers'))[0].n, before.papers.length + 6);
    assert.deepEqual((await q('select content from academy_tcf_reading.papers where version=$1 order by id', [VERSION])).map(row => row.content), papers);

    const readCompleted = await cmd(alice, 'read', completed.id);
    assert.deepEqual(readCompleted.result, completed.result);
    assert.deepEqual(readCompleted.paper, completed.paper);
    const readActive = await cmd(bob, 'read', active.id);
    assert.deepEqual(readActive.paper, active.paper);
    assert.deepEqual(readActive.answers, active.answers);
    assert.equal(readActive.deadline, active.deadline);
    assert.equal(readActive.revision, active.revision);
    const resumed = await start(previousPapers[1], bob, active.id);
    assert.equal(resumed.id, active.id);
    assert.equal(resumed.deadline, active.deadline);
    await assert.rejects(() => start(previousPapers[1], bob), /changed/i);
    await assert.rejects(() => start(previousPapers[1], alice, active.id), /not found/i);
    await assert.rejects(() => start(papers[1], bob, active.id), /already used/i);
    const next = await start(papers[1], bob);
    assert.notEqual(next.id, active.id);
    assert.equal(next.version, VERSION);
    assert.equal((await start(papers[1], bob)).id, next.id);
    assert.deepEqual(await rows('academy_tcf_reading.attempts', 'where id=any($1::uuid[])', [[completed.id, active.id]]), preserved.attempts);

    const catalog = await cmd(alice, 'catalog');
    assert.equal(catalog.tests.length, 20);
    assert.deepEqual(catalog.tests.map(({id, version}) => [id, version]),
      priorCatalog.tests.map(({id, version}) => [id, bankIDs.includes(id) ? VERSION : version]));
    for (const role of ['anon', 'authenticated', 'service_role']) {
      assert.equal((await q('select has_table_privilege($1,$2,$3) v', [role, 'academy_tcf_reading.published_papers', 'select']))[0].v, false);
      assert.equal((await q('select has_table_privilege($1,$2,$3) v', [role, 'academy_tcf_reading.papers', 'select']))[0].v, false);
    }
    assert.equal((await q("select relrowsecurity v from pg_class where oid='academy_tcf_reading.attempts'::regclass"))[0].v, true);
    await assert.rejects(() => q("update academy_tcf_reading.papers set content='{}' where id=$1 and version=$2", [papers[0].id, VERSION]), /immutable/i);
    await assert.rejects(() => start(papers[0], unverified), /verified|confirm/i);

    // Exercise actual authenticated frontend payloads for all six new banks.
    // The independent fixture above, not this scoring loop, establishes truth.
    for (const paper of papers) {
      let attempt = await start(paper);
      assert.deepEqual(attempt.paper.questions, paper.questions.map(({correct, explanation, ...item}) => item));
      assert.equal(attempt.result, null);
      assert.equal(Date.parse(attempt.deadline) - Date.parse(attempt.startedAt), 3600000);
      for (const item of paper.questions) {
        attempt = await cmd(alice, 'answer', attempt.id, {revision: attempt.revision, number: item.number, choice: item.correct});
      }
      const reopened = await cmd(alice, 'read', attempt.id);
      assert.deepEqual(reopened.answers, attempt.answers);
      assert.equal(reopened.deadline, attempt.deadline);
      attempt = await cmd(alice, 'submit', attempt.id, {revision: attempt.revision});
      assert.equal(attempt.result.correct, 39);
      assert.equal(attempt.result.points, 699);
      assert.equal(attempt.result.unanswered, 0);
      assert.equal(attempt.result.rows.length, 39);
      for (const item of paper.questions) {
        const result = attempt.result.rows.find(row => row.number === item.number);
        assert.equal(result.correct, item.correct);
        assert.equal(result.explanation, item.explanation);
        assert.equal(result.isCorrect, true);
      }
      assert.deepEqual((await cmd(alice, 'read', attempt.id)).result, attempt.result);
    }
    assert.deepEqual(await rows('academy_tcf_reading.attempts', 'where id=any($1::uuid[])', [[completed.id, active.id]]), preserved.attempts);
    const after = await protectedState();
    // Only the new attempts deliberately made by this test may now differ.
    delete after.attempts;
    const {attempts: ignored, ...nonAttemptBaseline} = preserved;
    assert.deepEqual(after, nonAttemptBaseline);
  } finally {
    await db.close();
  }
});

function transaction(pending, commit) {
  return execFileSync('python3', ['-c', `
import importlib.util, sys, urllib.request
def no_network(*args, **kwargs):
    raise RuntimeError('This regression test must remain completely local')
urllib.request.urlopen = no_network
spec = importlib.util.spec_from_file_location('reading_v6', 'scripts/release/tcf-reading-01-06-v6.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source, version, name = module.migration()
papers = module.sources()
module.validate_files(source, papers)
print(module.transaction(source, sys.argv[1] == 'true', sys.argv[2] == 'true', papers, version, name))
`, String(pending), String(commit)], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
}

test('v6 helper rehearses all 360 advanced alternatives and six RPC flows locally without retaining smoke attempts', async () => {
  const f = await fixture();
  const {db, q, protectedState, allState} = f;
  try {
    await savedAttempts(f);
    const before = await allState();
    const preserved = await protectedState();
    await db.exec(transaction(true, false));
    assert.deepEqual(await allState(), before, 'Rehearsal rolls back papers, pointers, migration history and smoke attempts');
    await db.exec(transaction(true, true));
    assert.deepEqual(await protectedState(), preserved, 'Committed helper retains every preexisting row and no smoke attempts');
    assert.deepEqual((await q('select content from academy_tcf_reading.papers where version=$1 order by id', [VERSION])).map(row => row.content), papers);
    assert.deepEqual(await q('select version,name,statements from supabase_migrations.schema_migrations where version=$1', [migrationVersion]),
      [{version: migrationVersion, name: migrationName, statements: [migration]}]);
    assert.equal((await q('select count(*)::int n from supabase_migrations.schema_migrations'))[0].n, before.migrations.length + 1);
    const committed = await allState();
    await db.exec(transaction(false, false));
    assert.deepEqual(await allState(), committed, 'Already-recorded rollback rehearsal leaves exact state intact');
    await db.exec(transaction(false, true));
    assert.deepEqual(await allState(), committed, 'Already-recorded local commit is idempotent and retains no smoke writes');
  } finally {
    await db.close();
  }
});
