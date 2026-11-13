"""Rehearse/publish the additive listening pilot; preserve all existing academy work.
Uses the reviewed Supabase Management API helper and existing Actions secret.
No provider calls, wallet changes, server-key extraction or account creation.
"""
import importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FILE='20261113171848_tcf_listening_test01.sql'
VERSION='20261113171848'
spec=importlib.util.spec_from_file_location('reading',Path(__file__).with_name('tcf-reading.py'))
reading=importlib.util.module_from_spec(spec);spec.loader.exec_module(reading);helper=reading.helper
READING_TABLES=['academy_tcf_reading.papers','academy_tcf_reading.published_papers','academy_tcf_reading.attempts']
SNAPSHOT=reading.SNAPSHOT.replace(') state',','+','.join("(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from "+table+' t)' for table in READING_TABLES)+') state')
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text();snapshot=SNAPSHOT
 if not pending:snapshot=snapshot.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_listening.attempts t),(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_listening.papers t)) state")
 parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-listening-pilot'));",'create temp table listening_before on commit drop as '+snapshot+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('"+VERSION+"','tcf_listening_test01',array["+helper.literal(source)+']);']
 paper=json.loads((ROOT/'supabase/exams/tcf-listening-test01.json').read_text())
 parts += ['create temp table listening_after on commit drop as '+snapshot+';',"""do $$begin
 if (select state from listening_before) is distinct from (select state from listening_after) then raise exception 'Existing academy data/settings changed';end if;
 if (select count(*) from academy_tcf_listening.papers)<>1 then raise exception 'Expected one listening pilot';end if;
 if exists(select 1 from academy_tcf_listening.papers p where jsonb_array_length(content->'questions')<>39 or (content->>'seconds')::int<>2100 or (select sum((q->>'slotSeconds')::numeric) from jsonb_array_elements(content->'questions') q)<>2100 or exists(select 1 from jsonb_array_elements(content->'questions') q where (q->>'audioSeconds')::numeric<=0 or (q->>'audioSeconds')::numeric>=(q->>'slotSeconds')::numeric)) then raise exception 'Listening format/timing differs';end if;
 if has_function_privilege('anon','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') or has_function_privilege('service_role','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') then raise exception 'Unexpected listening command privilege';end if;
 if not has_function_privilege('authenticated','public.academy_tcf_listening_command(text,uuid,jsonb)','execute') then raise exception 'Missing listening permission';end if;
 if has_schema_privilege('authenticated','academy_tcf_listening','usage') or has_table_privilege('authenticated','academy_tcf_listening.papers','select') then raise exception 'Listening private bank exposed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='academy_tcf_listening' and c.relkind='r' and not c.relrowsecurity) then raise exception 'Listening RLS missing';end if;
 end;$$;""",
 "do $$begin if not exists(select 1 from academy_tcf_listening.papers where id='tcf-listening-01' and version='tcf-listening-2026-11-v1' and content="+helper.literal(json.dumps(paper,ensure_ascii=False))+"::jsonb) then raise exception 'Listening paper content differs';end if;end;$$;",
 'commit;' if commit else 'rollback;']
 return '\n'.join(parts)
def release():
 source=(ROOT/'supabase/migrations'/FILE).read_text();paper=json.loads((ROOT/'supabase/exams/tcf-listening-test01.json').read_text())
 if json.loads(source.split('$paper$')[1])!=paper:raise RuntimeError('Listening seed differs from reviewed source')
 rows=helper.query("select statements from supabase_migrations.schema_migrations where version='"+VERSION+"'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded listening migration differs; stop for review')
 helper.query(transaction(not rows));print('Listening rollback rehearsal passed; all reading banks/attempts, auth/access, course progress, other exams, accounting and settings preserved.')
 helper.query(transaction(not rows,True))
 actual=helper.query('select content from academy_tcf_listening.papers order by id,version')
 if [r['content'] for r in actual]!=[paper]:raise RuntimeError('Deployed listening paper differs')
 print('::notice title=Listening Test01 backend live::Exact39question/35minute paper verified; all existing academy data/settings preserved; authenticated/ownership/RLS controls retained. No AI calls, wallet changes or synthetic users.')
if __name__=='__main__':
 try:release()
 except Exception as error:print('::error title=Listening release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'));sys.exit(1)
