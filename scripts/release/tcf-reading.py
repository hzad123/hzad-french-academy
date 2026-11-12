"""Rehearse/apply only the reading pilot, preserving all existing academy data.
Uses the existing reviewed Supabase Management API helper and Actions secret.
No OpenAI calls, server-key extraction, synthetic accounts or wallet operations.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
FILE='20261112204911_tcf_reading_test01.sql'
spec=importlib.util.spec_from_file_location('usage',Path(__file__).with_name('ai-total-credits.py'))
usage=importlib.util.module_from_spec(spec);spec.loader.exec_module(usage)
helper=usage.helper
SNAPSHOT=usage.SNAPSHOT.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from auth.users t),(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from public.purchase_entitlements t)) state")
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text()
 snapshot=SNAPSHOT
 if not pending:snapshot=snapshot.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_reading.attempts t)) state")
 parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-reading-pilot'));",'create temp table reading_before on commit drop as '+snapshot+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('20261112204911','tcf_reading_test01',array["+helper.literal(source)+']);']
 paper=json.loads((ROOT/'supabase/exams/tcf-reading-test01.json').read_text())
 parts += ['create temp table reading_after on commit drop as '+snapshot+';',"""do $$begin
 if (select state from reading_before) is distinct from (select state from reading_after) then raise exception 'Existing academy data or settings changed';end if;
 if has_function_privilege('anon','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') or has_function_privilege('service_role','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then raise exception 'Unexpected reading command privilege';end if;
 if not has_function_privilege('authenticated','public.academy_tcf_reading_command(text,uuid,jsonb)','execute') then raise exception 'Missing authenticated reading permission';end if;
 if has_schema_privilege('authenticated','academy_tcf_reading','usage') or has_table_privilege('authenticated','academy_tcf_reading.papers','select') then raise exception 'Private reading bank exposed';end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='academy_tcf_reading' and c.relname='attempts' and c.relrowsecurity) then raise exception 'Reading RLS missing';end if;
 end;$$;""",
 "do $$begin if not exists(select 1 from academy_tcf_reading.papers where id='tcf-reading-01' and version='tcf-reading-2026-11-pdf-v1' and content="+helper.literal(json.dumps(paper,ensure_ascii=False))+"::jsonb) then raise exception 'Reading paper content differs';end if;end;$$;",
 'commit;' if commit else 'rollback;']
 return '\n'.join(parts)
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true',required=True);parser.parse_args()
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='20261112204911'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded reading migration differs; stop for review')
 helper.query(transaction(not rows));print('Reading pilot rollback rehearsal passed; existing student/auth/access/history/wallet/settings hashes preserved.')
 helper.query(transaction(not rows,True));print('::notice title=Reading Test01 backend ready::Additive schema and exact39question paper verified; authenticated access/ownership/RLS retained; no existing data, prices, wallets or budgets changed. No provider call or new user.')
if __name__=='__main__':
 try:main()
 except Exception as error:
  print('::error title=Reading release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'));sys.exit(1)
