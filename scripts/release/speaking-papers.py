"""Add paper identity and deploy the twenty-paper bank through the existing release API."""
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(name,file):
 spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
usage=load('usage','ai-total-credits.py');helper=usage.helper
FILE='20261112203619_speaking_twenty_papers.sql'
# The only added student-row field is a default Test01 identity.
SNAPSHOT=usage.SNAPSHOT
SNAPSHOT=SNAPSHOT.replace("to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from academy_tcf_speaking.attempts t)","(to_jsonb(t)-'test_id')::text,'|' order by (to_jsonb(t)-'test_id')::text),'')) from academy_tcf_speaking.attempts t)")
# Include authentication and entitlement records in the same preservation check.
SNAPSHOT=SNAPSHOT.replace(') state',",(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from auth.users t),(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from public.purchase_entitlements t)) state")
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text();parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-speaking-papers'));",'create temp table papers_before on commit drop as '+SNAPSHOT+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('20261112203619','speaking_twenty_papers',array["+helper.literal(source)+']);']
 parts += ['create temp table papers_after on commit drop as '+SNAPSHOT+';',"""do $$begin
 if (select state from papers_before) is distinct from (select state from papers_after) then raise exception 'Student data or settings preservation failed';end if;
 if exists(select 1 from academy_tcf_speaking.attempts where test_id is null) then raise exception 'Missing paper identity';end if;
 if not exists(select 1 from academy_ai.policy where id and student_cap_microcad=10000000 and global_cap_microcad is null) then raise exception 'Student budget differs';end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-speaking-turn' and enabled and credits=10 and ceiling_microcad=200000 and model='gpt-audio-mini' and max_output_tokens=2000) then raise exception 'Speaking settings differ';end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-speaking-feedback' and enabled and credits=1 and ceiling_microcad=20000) then raise exception 'Feedback price differs';end if;
 if (select count(*) from academy_ai.testing_grants g join academy_exams.audio_operators o using(user_id) join academy_ai.wallets w using(user_id) where g.reference='owner-testing-cap100-20261111' and w.cap_microcad=100000000)<>1 then raise exception 'Owner budget differs';end if;
 if has_function_privilege('authenticated','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') or has_function_privilege('anon','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Unexpected public permission';end if;
 if not has_function_privilege('service_role','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Missing server permission';end if;
 end;$$;""",'commit;' if commit else 'rollback;'];return '\n'.join(parts)
def release(bundle,deploy):
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='20261112203619'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded paper migration differs')
 if 'OPENAI_API_KEYfrench' not in {r['name'] for r in helper.api('/secrets')}:raise RuntimeError('Existing OpenAI secret binding missing')
 helper.query(transaction(not rows));print('Twenty-paper rehearsal: all history, auth, entitlements, wallets and settings preserved.')
 helper.query(transaction(not rows,True));deploy(bundle)
 functions=helper.api('/functions');function=next((f for f in functions if f.get('slug')=='academy-tcf-speaking'),{})
 if function.get('status')!='ACTIVE' or function.get('verify_jwt') is not True:raise RuntimeError('Deployed function verification failed')
 print('::notice title=Twenty speaking papers backend deployed::Versioned identity migration verified; JWT protected; existing Test01 data and all budgets preserved. No native inference or synthetic users.')
