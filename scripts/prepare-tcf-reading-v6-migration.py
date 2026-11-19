"""Embed the reviewed six-paper bank into the migration created by Supabase CLI.

This prepares a local file only. Publication remains a separate reviewed workflow.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'tcf-reading-2026-11-close-reading-v6'
PREVIOUS = 'tcf-reading-2026-11-advanced-v5'
matches = list((ROOT / 'supabase/migrations').glob('*_tcf_reading_01_06_close_reading_v6.sql'))
if len(matches) != 1:
    raise SystemExit('Create exactly one v6 migration with supabase migration new first.')
target = matches[0]
if target.name.split('_', 1)[0] <= '20261118210000':
    raise SystemExit('Generate the migration after the preceding v5 migration timestamp.')
papers = [json.loads((ROOT / f'supabase/exams/tcf-reading-v6/test-{i:02}.json').read_text())
          for i in range(1, 7)]
for i, paper in enumerate(papers, 1):
    old = json.loads((ROOT / f'supabase/exams/tcf-reading-v5/test-{i:02}.json').read_text())
    assert paper['id'] == old['id'] and paper['version'] == VERSION
    assert paper['questions'][:24] == old['questions'][:24]
    assert len(paper['questions']) == 39 and paper['seconds'] == 3600
    assert paper['maxPoints'] == sum(q['points'] for q in paper['questions']) == 699
    assert '$paper$' not in json.dumps(paper)
ids = ','.join("'" + p['id'] + "'" for p in papers)
sql = f"""-- Six independently reviewed reading papers. Insert immutable versions only.
-- Historical banks, attempts, answers, scores, access and all other modules stay intact.
begin;
do $preflight$ begin
 if (select count(*) from academy_tcf_reading.published_papers)<>20 then
  raise exception 'Expected twenty published reading papers'; end if;
 if (select count(*) from academy_tcf_reading.published_papers
     where test_id in ({ids}) and version='{PREVIOUS}')<>6 then
  raise exception 'All six prior publication pointers must match reviewed v5'; end if;
 if exists(select 1 from academy_tcf_reading.papers
     where id in ({ids}) and version='{VERSION}') then
  raise exception 'Never overwrite an existing immutable reading version'; end if;
end $preflight$;

insert into academy_tcf_reading.papers(id,version,content) values
"""
sql += ',\n'.join("('" + p['id'] + "','" + VERSION + "',$paper$" +
                   json.dumps(p, ensure_ascii=False, separators=(',', ':')) + '$paper$::jsonb)'
                   for p in papers) + ';\n\n'
for p in papers:
    sql += ("update academy_tcf_reading.published_papers set version='" + VERSION + "'\n"
            " where test_id='" + p['id'] + "' and version='" + PREVIOUS + "';\n")
sql += f"""
do $verify$ begin
 if (select count(*) from academy_tcf_reading.published_papers)<>20 or
    (select count(*) from academy_tcf_reading.published_papers
      where test_id in ({ids}) and version='{VERSION}')<>6 then
  raise exception 'Reading publication pointer verification failed'; end if;
 if (select count(*) from academy_tcf_reading.papers
      where id in ({ids}) and version='{VERSION}')<>6 then
  raise exception 'Six immutable v6 papers must exist'; end if;
end $verify$;
commit;
"""
target.write_text(sql)
(ROOT / 'tests/fixtures/tcf-reading-v6-migrations.json').write_text(json.dumps([
    '20261117225800_tcf_reading_two_editorial.sql',
    '20261118210000_tcf_reading_01_06_advanced_v5.sql', target.name], indent=2) + '\n')
print(f'Prepared {target.relative_to(ROOT)}: six immutable papers and six guarded pointer updates.')
