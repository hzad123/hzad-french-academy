"""Publish19 original reading papers with exact migration checks and preservation.
Reuses the existing reading/Management API release helper; no user/key creation.
"""
import importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FILE='20261112212313_tcf_reading_twenty_tests.sql'
spec=importlib.util.spec_from_file_location('reading',Path(__file__).with_name('tcf-reading.py'))
reading=importlib.util.module_from_spec(spec);spec.loader.exec_module(reading);helper=reading.helper
SNAPSHOT=reading.SNAPSHOT.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by t.id),'')) from academy_tcf_reading.attempts t),(select content from academy_tcf_reading.papers where id='tcf-reading-01' and version='tcf-reading-2026-11-pdf-v1')) state")
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text()
 parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-reading-twenty'));",'create temp table twenty_before on commit drop as '+SNAPSHOT+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('20261112212313','tcf_reading_twenty_tests',array["+helper.literal(source)+']);']
 parts += ['create temp table twenty_after on commit drop as '+SNAPSHOT+';',"""do $$begin
 if (select state from twenty_before) is distinct from (select state from twenty_after) then raise exception 'Preservation of existing academy data/settings failed';end if;
 if (select count(*) from academy_tcf_reading.papers)<>20 then raise exception 'Expected20reading papers';end if;
 if exists(select 1 from academy_tcf_reading.papers p where jsonb_array_length(content->'questions')<>39 or (content->>'seconds')::int<>3600 or (select sum((q->>'points')::int) from jsonb_array_elements(content->'questions') q)<>699) then raise exception 'Reading format differs';end if;
 if has_function_privilege('anon','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') or has_function_privilege('service_role','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then raise exception 'Unexpected reading privilege';end if;
 if not has_function_privilege('authenticated','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then raise exception 'Missing reading access';end if;
 if has_schema_privilege('authenticated','academy_tcf_reading','usage') or has_table_privilege('authenticated','academy_tcf_reading.papers','select') then raise exception 'Private reading bank exposed';end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='academy_tcf_reading' and c.relname='attempts' and c.relrowsecurity) then raise exception 'Missing reading RLS';end if;
 end;$$;""",'commit;' if commit else 'rollback;']
 return '\n'.join(parts)
def release():
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='20261112212313'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded20paper migration differs')
 expected=[json.loads((ROOT/'supabase/exams/tcf-reading-test01.json').read_text())]+[json.loads(p.read_text()) for p in sorted((ROOT/'supabase/exams/tcf-reading-v2').glob('test-*.json'))]
 seeds=[json.loads(s) for i,s in enumerate(source.split('$paper$')) if i%2==1]
 if seeds!=expected[1:] or len(expected)!=20:raise RuntimeError('Reading seed files differ from migration')
 helper.query(transaction(not rows));print('Twenty-paper rollback rehearsal passed; Test01, all attempts, auth/access, accounting, other modules and settings preserved.')
 helper.query(transaction(not rows,True))
 actual=helper.query('select content from academy_tcf_reading.papers order by id,version')
 if [r['content'] for r in actual]!=expected:raise RuntimeError('Deployed reading paper content differs')
 print('::notice title=20reading tests backend live::20exact papers/780questions verified; Test01 content/results and all student data/settings preserved; authenticated/RLS protections retained. No AI calls, wallet changes or synthetic users.')
if __name__=='__main__':
 try:release()
 except Exception as error:print('::error title=Reading20release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'));sys.exit(1)
