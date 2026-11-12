-- Owner authorized deployment of the first speaking test for a live trial.
-- Reuse existing reviewed activity rates and limits; do not change wallets.
begin;
do $$begin
 if not exists(select 1 from academy_ai.policy where id and enabled and student_cap_microcad=10000000 and global_cap_microcad is null) then raise exception 'Review current AI policy';end if;
 if not exists(select 1 from academy_ai.activities where kind='conversation' and enabled and model like '%audio%' and credits between 1 and 10000 and ceiling_microcad>0 and max_output_tokens between 100 and 2000) then raise exception 'Review current voice model and cost configuration';end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-writing' and enabled and model='gpt-4o-mini' and credits=1 and ceiling_microcad=20000 and max_output_tokens=2000) then raise exception 'Review current feedback configuration';end if;
end;$$;
update academy_ai.activities target set enabled=true,credits=source.credits,model=source.model,ceiling_microcad=source.ceiling_microcad,max_output_tokens=source.max_output_tokens
from academy_ai.activities source where (target.kind='tcf-speaking-turn' and source.kind='conversation') or (target.kind='tcf-speaking-feedback' and source.kind='tcf-writing');
do $$begin
 if (select count(*) from academy_ai.activities where kind in('tcf-speaking-turn','tcf-speaking-feedback') and enabled)<>2 then raise exception 'Speaking activation incomplete';end if;
end;$$;
commit;
