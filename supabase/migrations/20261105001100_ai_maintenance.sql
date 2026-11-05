-- Scoped AI-only housekeeping. No model/network call or existing course update.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('academy-ai-maintenance','*/5 * * * *','select academy_ai.maintenance();');
commit;
