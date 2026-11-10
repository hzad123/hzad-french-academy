-- Owner explicitly requested live TCF feedback using the existing server key.
-- One review of all three tasks: 1 credit, at most CAD $0.02 reserved cost.
-- Preserve all student rows, all other activities and the CAD $10/no-shared-cap policy.
begin;
do $$begin
 if not exists(select 1 from academy_ai.policy where id and enabled and student_cap_microcad=10000000 and global_cap_microcad is null) then
  raise exception 'Review the existing CAD 10 per-student/no-shared-cap policy before TCF activation';
 end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-writing') then raise exception 'Install the TCF writing module first';end if;
end;$$;
update academy_ai.activities set enabled=true,credits=1,ceiling_microcad=20000,model='gpt-4o-mini',max_output_tokens=2000 where kind='tcf-writing';
commit;
