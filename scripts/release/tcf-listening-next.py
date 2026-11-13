"""Publish forward-only listening navigation while preserving all saved work.
Uses the existing reviewed Management API helper and Actions credential only.
"""
import importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FILE='20261113185622_tcf_listening_next_final_submit.sql'
VERSION='20261113185622'
spec=importlib.util.spec_from_file_location('listening',Path(__file__).with_name('tcf-listening.py'))
listening=importlib.util.module_from_spec(spec);spec.loader.exec_module(listening);helper=listening.helper
SNAPSHOT=listening.SNAPSHOT.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_listening.attempts t),(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_listening.papers t)) state")
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text();snapshot=SNAPSHOT
 if not pending:snapshot=snapshot.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_listening.navigation t)) state")
 parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-listening-next'));",'create temp table next_before on commit drop as '+snapshot+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('"+VERSION+"','tcf_listening_next_final_submit',array["+helper.literal(source)+']);']
 parts += ['create temp table next_after on commit drop as '+snapshot+';',"""do $$begin
 if (select state from next_before) is distinct from (select state from next_after) then raise exception 'Existing academy work or settings changed';end if;
 if not exists(select 1 from pg_class where oid='academy_tcf_listening.navigation'::regclass and relrowsecurity) then raise exception 'Listening navigation RLS missing';end if;
 if has_schema_privilege('authenticated','academy_tcf_listening','usage') or has_table_privilege('authenticated','academy_tcf_listening.navigation','select') or has_table_privilege('anon','academy_tcf_listening.navigation','select') or has_table_privilege('service_role','academy_tcf_listening.navigation','select') then raise exception 'Private listening navigation exposed';end if;
 if has_function_privilege('anon','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') or has_function_privilege('service_role','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') or not has_function_privilege('authenticated','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') then raise exception 'Listening command privileges differ';end if;
 end;$$;""",'commit;' if commit else 'rollback;']
 return '\n'.join(parts)
def release():
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='"+VERSION+"'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded navigation migration differs')
 helper.query(transaction(not rows));print('Listening Next rollback rehearsal passed; all saved attempts, clocks, results, banks, access, progress, accounting and settings preserved.')
 helper.query(transaction(not rows,True))
 expected=json.loads((ROOT/'supabase/exams/tcf-listening-test01.json').read_text());actual=helper.query('select content from academy_tcf_listening.papers order by id,version')
 if [r['content'] for r in actual]!=[expected]:raise RuntimeError('Listening bank differs after navigation release')
 print('::notice title=Listening Next navigation live::Next is server-validated through39questions; only final submission is permitted. Original clocks, answers, results, content and all academy data/settings preserved.')
if __name__=='__main__':
 try:release()
 except Exception as error:print('::error title=Listening Next release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'));sys.exit(1)
