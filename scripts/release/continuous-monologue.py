"""Bounded continuous Task3 release, no inference or wallet refill."""
import importlib.util,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def module(name,file):
 s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
usage=module('usage','ai-total-credits.py');speaker=module('speaker','tcf-speaking.py');helper=usage.helper
FILE='20261112002800_continuous_speaking_monologue.sql'
SNAPSHOT=usage.SNAPSHOT.replace('to_jsonb(t)::text',"(to_jsonb(t)-'monologue_started_at')::text")
# Only the reviewed speaking output limit changes; keep all other activity fields.
SNAPSHOT=SNAPSHOT.replace("(to_jsonb(t)-'monologue_started_at')::text,'|' order by (to_jsonb(t)-'monologue_started_at')::text),'')) from academy_ai.activities t)","(case when kind='tcf-speaking-turn' then to_jsonb(t)-'max_output_tokens' else to_jsonb(t) end)::text,'|' order by kind),'')) from academy_ai.activities t)")
def transaction(pending=True,commit=False):
 source=(ROOT/'supabase/migrations'/FILE).read_text();parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-continuous-monologue'));",'create temp table mono_before on commit drop as '+SNAPSHOT+';']
 if pending:parts += [helper.migration_body(source),"insert into supabase_migrations.schema_migrations(version,name,statements) values('20261112002800','continuous_speaking_monologue',array["+helper.literal(source)+']);']
 parts += ['create temp table mono_after on commit drop as '+SNAPSHOT+';',"""do $$begin
 if (select state from mono_before) is distinct from (select state from mono_after) then raise exception 'Preservation checks failed';end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-speaking-turn' and credits=10 and ceiling_microcad=200000 and model='gpt-audio-mini' and max_output_tokens=2000) then raise exception 'Speaking settings differ';end if;
 if has_function_privilege('authenticated','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') or has_function_privilege('anon','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Unexpected public permission';end if;
 end;$$;""",'commit;' if commit else 'rollback;'];return '\n'.join(parts)
def main():
 source=(ROOT/'supabase/migrations'/FILE).read_text();rows=helper.query("select statements from supabase_migrations.schema_migrations where version='20261112002800'")
 if rows and rows[0]['statements']!=[source]:raise RuntimeError('Recorded migration differs')
 helper.query(transaction(not rows));helper.query(transaction(not rows,True));speaker.deploy(Path('/tmp/continuous-monologue.ts'))
 print('::notice title=Continuous monologue live::Task3 continuous270second upload enabled;10credits/CAD0.20 ceiling unchanged;2000output tokens; preserved wallets, budgets, history and no daily limits; JWT protected. No native inference.')
if __name__=='__main__':
 try:main()
 except Exception as error:print('::error title=Monologue release stopped::'+(str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; details withheld'));sys.exit(1)
