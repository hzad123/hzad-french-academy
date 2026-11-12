"""Apply only the authorized removal of daily AI counts; never refill wallets."""
import importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('api',Path(__file__).with_name('tcf-marking.py'));helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
FILE='20261112002700_ai_total_credits_only.sql'
TABLES=['public.academy_learning_progress','academy_ai.wallets','academy_ai.requests','academy_ai.ledger','academy_ai.policy','academy_ai.activities','academy_ai.testing_grants','academy_tcf_writing.attempts','academy_tcf_speaking.attempts','academy_tcf_speaking.calls','academy_exams.attempts']
SNAPSHOT='select jsonb_build_array('+','.join("(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from "+t+' t)' for t in TABLES)+') state'
def transaction(apply=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text();parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-ai-total-credits'));",'create temp table usage_before on commit drop as '+SNAPSHOT+';']
 if apply:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('20261112002700','ai_total_credits_only',array["+helper.literal(source)+']);']
 parts+=['create temp table usage_after on commit drop as '+SNAPSHOT+';',"""do $$begin
 if (select state from usage_before) is distinct from (select state from usage_after) then raise exception 'Student data or settings changed';end if;
 if (select count(*) from academy_ai.testing_grants g join academy_exams.audio_operators o using(user_id) join academy_ai.wallets w using(user_id) where g.reference='owner-testing-cap100-20261111' and w.cap_microcad=100000000)<>1 then raise exception 'Verify existing owner CAD100 cap';end if;
 if not exists(select 1 from academy_ai.policy where id and student_cap_microcad=10000000 and global_cap_microcad is null) then raise exception 'Review ordinary student budget';end if;
 end;$$;"""]
 for sig in ['public.academy_ai_reserve(uuid,uuid,text,text,text,integer,uuid,text)','public.academy_tcf_writing_command(uuid,text,uuid,jsonb)','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','public.academy_exam_command(uuid,text,uuid,jsonb)']:
  parts += ["do $$begin if has_function_privilege('anon',"+helper.literal(sig)+",'execute') or has_function_privilege('authenticated',"+helper.literal(sig)+",'execute') then raise exception 'Unexpected student privilege';end if;end;$$;"]
 parts+=['commit;' if commit else 'rollback;'];return '\n'.join(parts)
def main():
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='20261112002700'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded migration differs')
 pending=not rows;helper.query(transaction(pending));helper.query(transaction(pending,True))
 print('::notice title=AI daily limits removed::Daily request and AI test-start counts removed. All wallets, credits, history and policy preserved; existing owner CAD100 and student CAD10 caps verified. No refill, inference, secret read or account creation.')
if __name__=='__main__':
 try:main()
 except Exception as error:
  print('::error title=AI usage release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; details withheld'));sys.exit(1)
