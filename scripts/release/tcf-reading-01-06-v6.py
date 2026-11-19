"""Publish six immutable close-reading papers after independent editorial review.

Rehearse the exact migration and production RPC flow, roll test attempts back,
compare preservation hashes, then commit only the six new paper versions and
publication pointers. Uses the established Academy Actions secret and helper.
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANK_VERSION = 'tcf-reading-2026-11-close-reading-v6'
PREVIOUS_VERSION = 'tcf-reading-2026-11-advanced-v5'
IDS = [f'tcf-reading-{i:02}' for i in range(1, 7)]
spec = importlib.util.spec_from_file_location('reading_v5', Path(__file__).with_name('tcf-reading-01-06-v5.py'))
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
helper = previous.helper
# Snapshot every old bank, every saved attempt, the other fourteen publication
# pointers, and existing account/access/progress/wallet/other-exam baseline tables.
SNAPSHOT = previous.SNAPSHOT.replace(PREVIOUS_VERSION, BANK_VERSION)
GUARDS = previous.GUARDS.replace(PREVIOUS_VERSION, BANK_VERSION).replace('reading_v5_', 'reading_v6_').replace('v5', 'v6')


def migration():
    paths = list((ROOT / 'supabase/migrations').glob('*_tcf_reading_01_06_close_reading_v6.sql'))
    if len(paths) != 1:
        raise RuntimeError('Exactly one CLI-created v6 migration required')
    path = paths[0]
    version, name = path.stem.split('_', 1)
    if version <= '20261118210000':
        raise RuntimeError('v6 migration must follow the recorded v5 migration')
    return path.read_text(), version, name


def sources():
    return [json.loads((ROOT / f'supabase/exams/tcf-reading-v6/test-{i:02}.json').read_text())
            for i in range(1, 7)]


def fingerprint(question):
    return hashlib.sha256(json.dumps(question, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def validate_files(source, papers):
    embedded = [json.loads(part) for i, part in enumerate(source.split('$paper$')) if i % 2]
    if embedded != papers:
        raise RuntimeError('Migration differs from reviewed source files')
    review = json.loads((ROOT / 'tests/fixtures/tcf-reading-v6-independent-review.json').read_text())
    checks = {(i['test'], i['number']): i for i in review['items']}
    if len(checks) != 90 or len(review['items']) != 90:
        raise RuntimeError('All ninety independent reviews required')
    for test, paper in enumerate(papers, 1):
        old = json.loads((ROOT / f'supabase/exams/tcf-reading-v5/test-{test:02}.json').read_text())
        if (paper['id'] != IDS[test-1] or paper['version'] != BANK_VERSION or
                len(paper['questions']) != 39 or paper['seconds'] != 3600 or
                paper['maxPoints'] != 699 or sum(q['points'] for q in paper['questions']) != 699 or
                paper['questions'][:24] != old['questions'][:24]):
            raise RuntimeError('Paper structure or protected early questions changed')
        for number, q in enumerate(paper['questions'], 1):
            if q['number'] != number or len(set(q['options'])) != 4 or q['correct'] not in 'ABCD':
                raise RuntimeError('Invalid question schema')
            if number < 25:
                continue
            check = checks[(test, number)]
            if (check['fingerprint'] != fingerprint(q) or check['independent_answer'] != q['correct'] or
                    check['correct_option_text'] != q['options']['ABCD'.index(q['correct'])] or
                    not check['blind_pass'] or not check['explanation_verified'] or
                    check.get('unresolved_issues')):
                raise RuntimeError(f'Independent editorial gate failed: Test {test} Question {number}')
            if len(check['rejected_options']) != 3:
                raise RuntimeError('Every distractor requires independent elimination evidence')
            if number >= 35 and (not check['difficulty_review']['needs_multiple_details'] or len(check['correct_evidence']) < 2):
                raise RuntimeError('Final questions require documented integration of multiple passage details')
            if sorted(x['option'] for x in check['rejected_options']) != sorted(x for x in 'ABCD' if x != q['correct']):
                raise RuntimeError('Independent distractor set differs from the three non-key options')
            for excerpt in check['correct_evidence']:
                if excerpt not in q['passage']:
                    raise RuntimeError('Independent correct-answer evidence is absent')
            for rejected in check['rejected_options']:
                if not rejected['passage_evidence'] or not rejected['why_tempting'] or not rejected['reason']:
                    raise RuntimeError('Independent distractor rationale is incomplete')
                if any(excerpt not in q['passage'] for excerpt in rejected['passage_evidence']):
                    raise RuntimeError('Independent distractor evidence is absent')
    return review


def smoke_sql(papers):
    """Exercise the live frontend RPC contract with existing entitled owner identity.

    Caller must enclose this in a savepoint or a rollback transaction. No new
    Auth identities, login tokens, access grants, provider calls or charges.
    """
    expected = helper.literal(json.dumps(papers, ensure_ascii=False, separators=(',', ':')))
    return f"""
do $smoke$
declare
 owner_id uuid; bank jsonb; item jsonb; cat jsonb; a jsonb; reopened jsonb;
 attempt_id uuid; original_deadline timestamptz; letter text; grade jsonb;
begin
 if (select count(*) from academy_exams.audio_operators)<>1 then
  raise exception 'Existing authorized owner identity must be unambiguous'; end if;
 select user_id into owner_id from academy_exams.audio_operators;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 -- All grading choices below are from sources already matched to the sealed
 -- independent answer review. Probe every advanced distractor as well.
 for bank in select value from jsonb_array_elements({expected}::jsonb) loop
  for item in select value from jsonb_array_elements(bank->'questions') where (value->>'number')::int>=25 loop
   foreach letter in array array['A','B','C','D'] loop
    grade:=academy_tcf_reading.grade(bank,jsonb_build_object(item->>'number',letter));
    if (grade->>'correct')::int<>(case when letter=item->>'correct' then 1 else 0 end) then
     raise exception 'Advanced-option server grading mismatch'; end if;
   end loop;
  end loop;
 end loop;
 -- Use the actual authenticated role and the same public command as the browser.
 execute 'set local role authenticated';
 cat:=public.academy_tcf_reading_command('catalog',null,'{{}}'::jsonb);
 if jsonb_array_length(cat->'tests')<>20 then raise exception 'Live RPC catalog count differs'; end if;
 for bank in select value from jsonb_array_elements({expected}::jsonb) loop
  if not exists(select 1 from jsonb_array_elements(cat->'tests') t
    where t->>'id'=bank->>'id' and t->>'version'=bank->>'version') then
   raise exception 'Live frontend catalog does not select v6'; end if;
  attempt_id:=gen_random_uuid();
  a:=public.academy_tcf_reading_command('start',attempt_id,
       jsonb_build_object('testId',bank->>'id','version',bank->>'version'));
  if a->>'id'<>attempt_id::text then raise exception 'Refuse to exercise an existing active attempt'; end if;
  if a->>'version'<>bank->>'version' or jsonb_array_length(a->'paper'->'questions')<>39 then
   raise exception 'Live start returned wrong version or question count'; end if;
  if a->'paper'->'questions'<>(select jsonb_agg(q-'correct'-'explanation' order by (q->>'number')::int)
     from jsonb_array_elements(bank->'questions') q) then
   raise exception 'Live frontend question payload differs from reviewed content'; end if;
  if exists(select 1 from jsonb_array_elements(a->'paper'->'questions') q
     where q ? 'correct' or q ? 'explanation') then raise exception 'Pre-submit key exposure'; end if;
  original_deadline:=(a->>'deadline')::timestamptz;
  if original_deadline-(a->>'startedAt')::timestamptz<>interval '60 minutes' then
   raise exception 'Live reading duration changed'; end if;
  for item in select value from jsonb_array_elements(bank->'questions') loop
   a:=public.academy_tcf_reading_command('answer',attempt_id,
        jsonb_build_object('revision',a->'revision','number',item->'number','choice',item->>'correct'));
  end loop;
  reopened:=public.academy_tcf_reading_command('read',attempt_id,'{{}}'::jsonb);
  if reopened->'answers'<>a->'answers' or (reopened->>'deadline')::timestamptz<>original_deadline then
   raise exception 'Live autosave/reopen changed answers or deadline'; end if;
  a:=public.academy_tcf_reading_command('submit',attempt_id,jsonb_build_object('revision',a->'revision'));
  if a->>'status'<>'completed' or (a->'result'->>'correct')::int<>39 or
     (a->'result'->>'points')::int<>699 or (a->'result'->>'unanswered')::int<>0 then
   raise exception 'Live scoring must be 39 correct and 699 points'; end if;
  for item in select value from jsonb_array_elements(bank->'questions') loop
   if not exists(select 1 from jsonb_array_elements(a->'result'->'rows') r
     where r->'number'=item->'number' and r->>'correct'=item->>'correct'
       and r->>'explanation'=item->>'explanation' and (r->>'isCorrect')::boolean) then
    raise exception 'Live result key or explanation mismatch'; end if;
  end loop;
  reopened:=public.academy_tcf_reading_command('read',attempt_id,'{{}}'::jsonb);
  if reopened->'result'<>a->'result' then raise exception 'Completed result reopening differs'; end if;
 end loop;
 execute 'reset role';
end $smoke$;
"""


def transaction(source, pending, commit, papers, version, name):
    parts = ['begin isolation level repeatable read;',
             "select pg_advisory_xact_lock(hashtext('hzad-reading-01-06-v6-release'));",
             'create temp table reading_v6_before on commit drop as ' + SNAPSHOT + ';']
    if pending:
        parts += [helper.migration_body(source),
                  'insert into supabase_migrations.schema_migrations(version,name,statements) values(' +
                  helper.literal(version) + ',' + helper.literal(name) + ',array[' + helper.literal(source) + ']);']
    parts += ['savepoint reading_v6_smoke;', smoke_sql(papers),
              'rollback to savepoint reading_v6_smoke;', 'release savepoint reading_v6_smoke;',
              'create temp table reading_v6_after on commit drop as ' + SNAPSHOT + ';',
              GUARDS, 'commit;' if commit else 'rollback;']
    return '\n'.join(parts)


def release():
    source, version, name = migration()
    papers = sources()
    validate_files(source, papers)
    if not helper.BASE.endswith('/projects/ogntvgvzmjrnppcullsj'):
        raise RuntimeError('Academy project binding changed; stop')
    recorded = helper.query('select statements from supabase_migrations.schema_migrations where version=' + helper.literal(version))
    if recorded and recorded[0]['statements'] != [source]:
        raise RuntimeError('Recorded migration differs from reviewed SQL')
    pending = not recorded
    helper.query(transaction(source, pending, False, papers, version, name))
    print('::notice title=v6 rehearsal passed::Six authenticated RPC start-answer-submit-reopen flows and all 270 advanced distractors verified; all smoke writes rolled back; preservation hashes match')
    helper.query(transaction(source, pending, True, papers, version, name))
    live = helper.query("select id,content from academy_tcf_reading.papers where version=" +
                        helper.literal(BANK_VERSION) + ' order by id')
    if [row['content'] for row in live] != papers:
        raise RuntimeError('Committed live papers differ from independently reviewed sources')
    catalog = helper.query('select test_id,version from academy_tcf_reading.published_papers order by test_id')
    if len(catalog) != 20 or any(row['version'] != BANK_VERSION for row in catalog if row['test_id'] in IDS):
        raise RuntimeError('Post-commit catalog mismatch')
    print(json.dumps({'version': BANK_VERSION, 'verified_live_papers': [
        {'id': p['id'], 'sha256': hashlib.sha256(json.dumps(p, ensure_ascii=False,
          separators=(',', ':')).encode()).hexdigest(), 'questions': len(p['questions'])}
        for p in papers], 'rpc_flows_passed': 6, 'advanced_alternatives_checked': 360,
        'smoke_writes_persisted': 0, 'preexisting_state_preserved': True}, separators=(',', ':')))
    print('::notice title=Reading Tests 01-06 v6 live::Exact six source banks verified after commit; Test04 Q25/Q29/Q36/Q39 and Test01 Q30 included in full verification; previous attempts, scores, banks, accounts and other14tests preserved')


if __name__ == '__main__':
    try:
        release()
    except Exception as error:
        print('::error title=Reading v6 release stopped::' +
              (str(error) if isinstance(error, RuntimeError)
               else type(error).__name__ + '; private details withheld'))
        sys.exit(1)
