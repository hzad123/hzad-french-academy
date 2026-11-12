-- Add immutable paper identity; preserve all existing Test01 attempts/results.
begin;
alter table academy_tcf_speaking.attempts add column test_id text not null default 'tcf-speaking-01';
alter table academy_tcf_speaking.attempts add constraint speaking_paper_identity check (
 (test_id='tcf-speaking-01' and version='tcf-speaking-2026-11-v1') or
 (test_id ~ '^tcf-speaking-(0[2-9]|1[0-9]|20)$' and version='tcf-speaking-2026-11-v2')
);
do $$declare definition text;begin
 select pg_get_functiondef('public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if position('insert into academy_tcf_speaking.attempts(id,user_id) values(p_id,p_user)' in definition)=0 or position('monologue_started_at' in definition)=0 or position('Daily speaking attempt limit' in definition)>0 then raise exception 'Review speaking identity baseline';end if;
 definition:=replace(definition,'select id,phase,created_at "createdAt"','select id,phase,test_id,version,created_at "createdAt"');
 definition:=replace(definition,'if p_action=''start'' and a.id is null then', $patch$
 if p_action='start' then
  if not ((coalesce(p_payload->>'testId','tcf-speaking-01')='tcf-speaking-01' and coalesce(p_payload->>'version','tcf-speaking-2026-11-v1')='tcf-speaking-2026-11-v1') or
   (p_payload->>'testId' ~ '^tcf-speaking-(0[2-9]|1[0-9]|20)$' and p_payload->>'version'='tcf-speaking-2026-11-v2')) or
   (p_payload->>'testId' is not null and p_payload->>'version' is null) then raise exception 'Invalid speaking paper identity';end if;
  if a.id is not null and (a.test_id<>coalesce(p_payload->>'testId','tcf-speaking-01') or a.version<>coalesce(p_payload->>'version','tcf-speaking-2026-11-v1')) then raise exception 'Speaking attempt already belongs to another paper';end if;
 end if;
 if p_action='start' and a.id is null then$patch$);
 definition:=replace(definition,'insert into academy_tcf_speaking.attempts(id,user_id) values(p_id,p_user)', 'insert into academy_tcf_speaking.attempts(id,user_id,test_id,version) values(p_id,p_user,coalesce(p_payload->>''testId'',''tcf-speaking-01''),coalesce(p_payload->>''version'',''tcf-speaking-2026-11-v1''))');
 execute definition;
end;$$;
-- Identity cannot be rewritten even by a later command implementation.
create function academy_tcf_speaking.keep_paper_identity() returns trigger language plpgsql set search_path='' as $$begin
 if new.test_id is distinct from old.test_id or new.version is distinct from old.version then raise exception 'Speaking paper identity is immutable';end if;return new;
end;$$;
revoke all on function academy_tcf_speaking.keep_paper_identity() from public,anon,authenticated,service_role;
create trigger keep_paper_identity before update on academy_tcf_speaking.attempts for each row execute function academy_tcf_speaking.keep_paper_identity();
commit;
