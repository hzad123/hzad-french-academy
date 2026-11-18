"""Rehearse/publish ONLY Reading Tests 01 and 05 as immutable v4 papers.
Uses the existing protected Supabase Management API Actions credential.
"""
import importlib.util, json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
FILE='20261117225800_tcf_reading_two_editorial.sql'
VERSION='20261117225800'
BANK_VERSION='tcf-reading-2026-11-editorial-v4'
spec=importlib.util.spec_from_file_location('reading',Path(__file__).with_name('tcf-reading.py'))
reading=importlib.util.module_from_spec(spec)
spec.loader.exec_module(reading)
helper=reading.helper
SNAPSHOT=reading.SNAPSHOT.replace(
 ') state',
 """,(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by t.id),'')) from academy_tcf_reading.attempts t),
 (select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.id,p.version),'')) from academy_tcf_reading.papers p
   where (p.id,p.version) not in (('tcf-reading-01','tcf-reading-2026-11-editorial-v4'),
                                  ('tcf-reading-05','tcf-reading-2026-11-editorial-v4'))),
 (select md5(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.test_id),'')) from academy_tcf_reading.published_papers c
   where c.test_id not in ('tcf-reading-01','tcf-reading-05'))) state""")
CHECKS="""do $checks$ begin
 if (select state from editorial_before) is distinct from (select state from editorial_after)
 then raise exception 'Previous user state / unrelated paper content changed'; end if;
 if (select count(*) from academy_tcf_reading.published_papers)<>20
 then raise exception 'Reading catalog not 20 papers'; end if;
 if (select count(*) from academy_tcf_reading.published_papers
     where test_id in ('tcf-reading-01','tcf-reading-05')
     and version='tcf-reading-2026-11-editorial-v4')<>2
 then raise exception 'Expected v4 papers missing'; end if;
 if has_function_privilege('anon','public.academy_tcf_reading_command(text,uuid,jsonb)','execute')
    or has_function_privilege('service_role','public.academy_tcf_reading_command(text,uuid,jsonb)','execute')
 then raise exception 'Unexpected public reading RPC grant'; end if;
 if has_schema_privilege('authenticated','academy_tcf_reading','usage')
    or has_table_privilege('authenticated','academy_tcf_reading.papers','select')
    or has_table_privilege('authenticated','academy_tcf_reading.published_papers','select')
 then raise exception 'Private reading schema exposed'; end if;
 if not has_function_privilege('authenticated','public.academy_tcf_reading_command(text,uuid,jsonb)','execute')
 then raise exception 'Authenticated reading RPC unavailable'; end if;
 if not exists(select 1 from pg_class where oid='academy_tcf_reading.attempts'::regclass and relrowsecurity)
 then raise exception 'Reading attempts RLS disabled'; end if;
end $checks$;"""
def expected_banks():
 return [json.loads((ROOT/'supabase/exams/tcf-reading-v4'/f'test-{n:02}.json').read_text())
         for n in (1,5)]

def transaction(source, pending, commit):
 parts=['begin isolation level repeatable read;',
        "select pg_advisory_xact_lock(hashtext('hzad-reading-editorial-two'));",
        'create temp table editorial_before on commit drop as '+SNAPSHOT+';']
 if pending:
  parts += [helper.migration_body(source),
            "insert into supabase_migrations.schema_migrations(version,name,statements) values('"
            +VERSION+"','tcf_reading_two_editorial',array["+helper.literal(source)+"]);"]
 parts += ['create temp table editorial_after on commit drop as '+SNAPSHOT+';',
           CHECKS,'commit;' if commit else 'rollback;']
 return '\n'.join(parts)

def release():
 source=(ROOT/'supabase/migrations'/FILE).read_text()
 expected=expected_banks()
 seeds=[json.loads(s) for i,s in enumerate(source.split('$paper$')) if i%2==1]
 if seeds!=expected: raise RuntimeError('Release migration and editorial source differ')
 for p in expected:
  if p['version']!=BANK_VERSION or len(p['questions'])!=39 or p['seconds']!=3600 or sum(q['points'] for q in p['questions'])!=699:
   raise RuntimeError('Invalid editorial paper content')
 rows=helper.query("select statements from supabase_migrations.schema_migrations where version='"+VERSION+"'")
 if rows and rows[0]['statements']!=[source]:
  raise RuntimeError('Recorded release content differs')
 helper.query(transaction(source,not rows,False))
 print('::notice title=TCF Reading safety rehearsal passed::Existing results, active attempts, other tests and academic state preserved')
 helper.query(transaction(source,not rows,True))
 actual=helper.query("""select content from academy_tcf_reading.papers
    where version='tcf-reading-2026-11-editorial-v4' and id in ('tcf-reading-01','tcf-reading-05')
    order by id""")
 if [r['content'] for r in actual]!=expected:
  raise RuntimeError('Published content differs from approved source')
 catalog=helper.query("""select test_id,version from academy_tcf_reading.published_papers order by test_id""")
 assert len(catalog)==20 and all(r['version']==BANK_VERSION for r in catalog if r['test_id'] in ('tcf-reading-01','tcf-reading-05'))
 print('::notice title=TCF Reading 01 and 05 live in Academy backend::Both 39-question editorial v4 banks verified; other 18 published versions and historical attempts preserved')

if __name__=='__main__':
 try:release()
 except Exception as error:
  print('::error title=TCF Reading editorial release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'))
  sys.exit(1)
