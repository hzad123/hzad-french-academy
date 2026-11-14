-- Hide the four owner-review papers without deleting any bank, attempt or score.
-- The pre-release registry contained only Tests01–02.
-- Do not remove a subsequent replacement version if one has been published.
begin;
delete from academy_tcf_listening.published
where (test_id,version) in (
 ('tcf-listening-03','tcf-listening-2026-11-test03-v3'),
 ('tcf-listening-04','tcf-listening-2026-11-test04-v3'),
 ('tcf-listening-05','tcf-listening-2026-11-test05-v3'),
 ('tcf-listening-06','tcf-listening-2026-11-test06-v3')
);
commit;
