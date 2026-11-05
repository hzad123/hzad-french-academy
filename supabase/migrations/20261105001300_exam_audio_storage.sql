-- Private buckets only. No browser SELECT/INSERT policies are installed.
-- The verified Edge handler signs current listening assets and owns recordings.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('academy-exam-listening','academy-exam-listening',false,10000000,array['audio/mpeg']),
 ('academy-exam-recordings','academy-exam-recordings',false,1000000,array['audio/wav'])
on conflict(id) do nothing;
do $$begin
 if exists(select 1 from storage.buckets where id in ('academy-exam-listening','academy-exam-recordings') and public) then
  raise exception 'An exam bucket already exists with public access. Review it before migration.';
 end if;
end$$;
-- A pre-existing broad storage policy must not accidentally grant access to
-- these buckets. Service-role requests bypass RLS; learners use the Edge API.
create policy academy_exam_private_buckets on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id not in ('academy-exam-listening','academy-exam-recordings'))
with check(bucket_id not in ('academy-exam-listening','academy-exam-recordings'));
commit;
