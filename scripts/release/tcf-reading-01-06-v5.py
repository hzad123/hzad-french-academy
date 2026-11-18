"""Publish only approved immutable TCF Reading v5 papers 01-06, preserve all history.
Uses existing protected Academy Supabase Management API Actions token and
Academy project binding in scripts/release/tcf-marking.py.
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILE = '20261118210000_tcf_reading_01_06_advanced_v5.sql'
VERSION = '20261118210000'
BANK_VERSION = 'tcf-reading-2026-11-advanced-v5'
IDS = [f'tcf-reading-{i:02}' for i in range(1, 7)]
BASE_VERSION = {f'tcf-reading-{i:02}': ('tcf-reading-2026-11-editorial-v4' if i in (1, 5)
                                        else 'tcf-reading-2026-11-reference-v3')
                for i in range(1, 7)}
spec = importlib.util.spec_from_file_location('reading', Path(__file__).with_name('tcf-reading.py'))
reading = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reading)
helper = reading.helper

# Include ALL saved attempts and every previously published historical paper,
# along with wallets, access, auth and learning progress included in baseline.
SNAPSHOT = reading.SNAPSHOT.replace(
 ') state',
 """,(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by t.id),'')) from academy_tcf_reading.attempts t),
 (select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.id,p.version),'')) from academy_tcf_reading.papers p
   where p.version<>'tcf-reading-2026-11-advanced-v5'),
 (select md5(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.test_id),'')) from academy_tcf_reading.published_papers c
   where c.test_id not in ('tcf-reading-01','tcf-reading-02','tcf-reading-03','tcf-reading-04','tcf-reading-05','tcf-reading-06'))) state""")

GUARDS = """do $guards$ begin
 if (select state from reading_v5_before) is distinct from
    (select state from reading_v5_after) then
   raise exception 'Student state, other reading papers, or other test publication changed'; end if;
 if (select count(*) from academy_tcf_reading.published_papers)<>20 then
   raise exception 'Published catalog must have 20 papers'; end if;
 if (select count(*) from academy_tcf_reading.published_papers
     where test_id in ('tcf-reading-01','tcf-reading-02','tcf-reading-03',
                       'tcf-reading-04','tcf-reading-05','tcf-reading-06')
       and version='tcf-reading-2026-11-advanced-v5')<>6 then
   raise exception 'Six publication pointers must be v5'; end if;
 if exists(select 1 from academy_tcf_reading.published_papers
     where test_id not in ('tcf-reading-01','tcf-reading-02','tcf-reading-03',
                           'tcf-reading-04','tcf-reading-05','tcf-reading-06')
       and version<>'tcf-reading-2026-11-reference-v3') then
   raise exception 'An unrelated test was changed'; end if;
 if (select count(*) from academy_tcf_reading.papers
     where id in ('tcf-reading-01','tcf-reading-02','tcf-reading-03',
                  'tcf-reading-04','tcf-reading-05','tcf-reading-06')
       and version='tcf-reading-2026-11-advanced-v5')<>6 then
   raise exception 'Missing v5 immutable paper'; end if;
 if exists(select 1 from academy_tcf_reading.papers
   where version='tcf-reading-2026-11-advanced-v5'
     and id in ('tcf-reading-01','tcf-reading-02','tcf-reading-03',
                'tcf-reading-04','tcf-reading-05','tcf-reading-06')
     and (jsonb_array_length(content->'questions')<>39
          or (content->>'seconds')::integer<>3600
          or (content->>'maxPoints')::integer<>699)) then
   raise exception 'v5 structure mismatch'; end if;
 if has_function_privilege('anon',
     'public.academy_tcf_reading_command(text,uuid,jsonb)','execute')
    or has_function_privilege('service_role',
     'public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then
    raise exception 'Unexpected reading RPC access'; end if;
 if not has_function_privilege('authenticated',
     'public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then
    raise exception 'Authenticated reading RPC unavailable'; end if;
 if has_schema_privilege('authenticated','academy_tcf_reading','usage')
    or has_table_privilege('authenticated','academy_tcf_reading.papers','select')
    or has_table_privilege('authenticated',
      'academy_tcf_reading.published_papers','select') then
    raise exception 'Private reading schema access exposed'; end if;
 if not exists(select 1 from pg_class where
   oid='academy_tcf_reading.attempts'::regclass and relrowsecurity) then
    raise exception 'Reading attempt RLS disabled'; end if;
end $guards$;"""

def sources():
    return [json.loads((ROOT / 'supabase/exams/tcf-reading-v5' /
                        f'test-{i:02}.json').read_text()) for i in range(1, 7)]

def validate_files(source, papers):
    embedded = [json.loads(part) for i, part in
                enumerate(source.split('$paper$')) if i % 2 == 1]
    if embedded != papers:
        raise RuntimeError('Release migration and six reviewed sources differ')
    for i, paper in enumerate(papers, start=1):
        if (paper['id'] != f'tcf-reading-{i:02}' or
            paper['version'] != BANK_VERSION or
            len(paper['questions']) != 39 or
            paper['seconds'] != 3600 or
            paper['maxPoints'] != 699 or
            sum(q['points'] for q in paper['questions']) != 699):
            raise RuntimeError('Invalid versioned reading bank structure')
        if any(q['number'] != j or len(q['options']) != 4 or
               q['correct'] not in 'ABCD' for j, q in
               enumerate(paper['questions'], start=1)):
            raise RuntimeError('Invalid question schema or key')
    if papers[0]['questions'][29]['correct'] != 'B':
        raise RuntimeError('Test 01 Q30 must be B according to passage')

def transaction(source, pending, commit):
    parts = ['begin isolation level repeatable read;',
             "select pg_advisory_xact_lock(hashtext('hzad-reading-01-06-v5-release'));",
             'create temp table reading_v5_before on commit drop as ' + SNAPSHOT + ';']
    if pending:
        parts += [helper.migration_body(source),
                  "insert into supabase_migrations.schema_migrations(version,name,statements) values('" +
                  VERSION + "','tcf_reading_01_06_advanced_v5',array[" +
                  helper.literal(source) + "]);"]
    parts += ['create temp table reading_v5_after on commit drop as ' + SNAPSHOT + ';',
              GUARDS, 'commit;' if commit else 'rollback;']
    return '\n'.join(parts)

def release():
    source = (ROOT / 'supabase/migrations' / FILE).read_text()
    papers = sources()
    validate_files(source, papers)
    # The helper binds to the Academy project, not the unrelated Talk project.
    if not helper.BASE.endswith('/projects/ogntvgvzmjrnppcullsj'):
        raise RuntimeError('Academy project binding unexpected; stop')
    recorded = helper.query(
        "select statements from supabase_migrations.schema_migrations where version='" +
        VERSION + "'")
    if recorded and recorded[0]['statements'] != [source]:
        raise RuntimeError('Recorded schema migration differs')
    pending = not recorded
    helper.query(transaction(source, pending, False))
    print('::notice title=Six-reading-paper rollback rehearsal passed::Student history, wallets, settings, current attempts and all 14 other tests preserved')
    helper.query(transaction(source, pending, True))
    live = helper.query("""select id,content from academy_tcf_reading.papers
      where id in ('tcf-reading-01','tcf-reading-02','tcf-reading-03',
                   'tcf-reading-04','tcf-reading-05','tcf-reading-06')
        and version='tcf-reading-2026-11-advanced-v5' order by id""")
    if [row['content'] for row in live] != papers:
        raise RuntimeError('Live v5 JSON differs from reviewed source')
    catalog = helper.query(
        'select test_id,version from academy_tcf_reading.published_papers order by test_id')
    if (len(catalog) != 20 or any(row['version'] != BANK_VERSION
          for row in catalog if row['test_id'] in IDS) or
          any(row['version'] != 'tcf-reading-2026-11-reference-v3'
          for row in catalog if row['test_id'] not in IDS)):
        raise RuntimeError('Post-release reading catalog failed verification')
    print('::notice title=Six TCF Reading v5 papers published in Academy backend::Test 01-06 v5 verified; other 14 tests and all existing attempts preserved')

if __name__ == '__main__':
    try:
        release()
    except Exception as error:
        print('::error title=Six-paper Reading release stopped::' +
              (str(error) if isinstance(error, RuntimeError)
               else type(error).__name__ + '; private details withheld'))
        sys.exit(1)
