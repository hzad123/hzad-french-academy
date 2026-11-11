"""Bounded TCF retry release through Supabase Management API; no inference/login.

Run only from the reviewed feature revision after tests/builds. Never prints
credentials, user identifiers, writing, provider messages or raw database rows.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://api.supabase.com/v1/projects/ogntvgvzmjrnppcullsj'
MIGRATIONS = ['20261110002000_owner_testing_budget.sql',
              '20261110002100_tcf_saved_assessment_retry.sql',
              '20261111002200_tcf_feedback_diagnostic_codes.sql']


def api(path, body=None, raw=None, content_type='application/json'):
    token = os.environ.get('SUPABASE_ACCESS_TOKEN', '').strip()
    if not token:
        raise RuntimeError('Add repository Actions secret SUPABASE_ACCESS_TOKEN, then re-run this job.')
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    request = Request(BASE + path, data=data, headers={
        'Authorization': 'Bearer ' + token, 'Content-Type': content_type})
    try:
        with urlopen(request, timeout=120) as response:
            result = response.read()
            return json.loads(result) if result else None
    except HTTPError as error:
        # Do not echo a response body: SQL/provider messages can contain private data.
        raise RuntimeError('Supabase Management HTTP ' + str(error.code) +
                           '; verify the repository account access token and project access.') from None


def query(sql):
    return api('/database/query', {'query': sql})


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def migration_body(text):
    head, tail = text.rsplit('commit;', 1)
    if tail.strip() or head.count('begin;') != 1:
        raise RuntimeError('Review migration transaction boundaries.')
    return head.replace('begin;', '', 1)


SNAPSHOT = """select jsonb_build_object(
 'progress',(select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.user_id,p.unit_id),'')) from public.academy_learning_progress p),
 'writing',(select md5(coalesce(string_agg((to_jsonb(a)-'review_id')::text,'|' order by a.id),'')) from academy_tcf_writing.attempts a),
 'otherWallets',(select md5(coalesce(string_agg((to_jsonb(w)-'testing_budget_microcad')::text,'|' order by w.user_id),'')) from academy_ai.wallets w where w.user_id<>(select user_id from release_owner)),
 'policy',(select to_jsonb(p) from academy_ai.policy p where id),
 'activities',(select jsonb_agg(to_jsonb(a) order by a.kind) from academy_ai.activities a),
 'ownerPreserved',(select to_jsonb(w)-array['available','cap_microcad','testing_budget_microcad'] from academy_ai.wallets w where w.user_id=(select user_id from release_owner))
) as state"""


def transaction(pending, commit=False):
    parts = ['begin isolation level repeatable read;',
             "select pg_advisory_xact_lock(hashtext('hzad-tcf-retry-release'));",
             # The previously privately verified owner is the sole privileged audio
             # operator. Fail closed if that role becomes ambiguous. No public UID.
             "create temp table release_owner on commit drop as select user_id from academy_exams.audio_operators;",
             """do $$begin
 if (select count(*) from release_owner)<>1 then raise exception 'Resolve the intended owner privately before granting testing';end if;
 if not exists(select 1 from academy_ai.wallets where user_id=(select user_id from release_owner)) then raise exception 'Existing owner wallet required';end if;
 if not exists(select 1 from academy_ai.requests where user_id=(select user_id from release_owner) and kind='tcf-writing' and status='failed') then raise exception 'Previously verified owner writing failure required';end if;
 if not exists(select 1 from academy_ai.policy where id and enabled and student_cap_microcad=10000000 and global_cap_microcad is null) then raise exception 'Review live AI policy';end if;
 if not exists(select 1 from academy_ai.activities where kind='tcf-writing' and enabled and credits=1 and model='gpt-4o-mini' and max_output_tokens=2000 and ceiling_microcad=20000) then raise exception 'Review live marking price';end if;
 end;$$;""",
             'create temp table release_before on commit drop as ' + SNAPSHOT + ';']
    for filename in pending:
        source = (ROOT / 'supabase/migrations' / filename).read_text()
        parts.append(migration_body(source))
        version, name = filename.removesuffix('.sql').split('_', 1)
        parts.append('insert into supabase_migrations.schema_migrations(version,name,statements) values(' +
                     literal(version) + ',' + literal(name) + ',array[' + literal(source) + ']);')
    parts += ["""select public.academy_ai_grant_owner_testing((select user_id from release_owner),'owner-testing-cap100-20261111');""",
              'create temp table release_after on commit drop as ' + SNAPSHOT + ';',
              """do $$begin
 if (select state from release_before) is distinct from (select state from release_after) then raise exception 'Preservation checks failed; entire release rolled back';end if;
 if not exists(select 1 from academy_ai.wallets where user_id=(select user_id from release_owner) and cap_microcad=100000000 and spent_microcad+reserved_microcad<=cap_microcad) then raise exception 'Testing cap verification failed';end if;
 if has_function_privilege('anon','public.academy_ai_grant_owner_testing(uuid,text)','execute') or has_function_privilege('authenticated','public.academy_ai_grant_owner_testing(uuid,text)','execute')
 or has_function_privilege('authenticated','public.academy_tcf_writing_note_failure(uuid,uuid,jsonb)','execute')
 or has_function_privilege('authenticated','public.academy_tcf_writing_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Unexpected student privilege';end if;
 if not has_function_privilege('service_role','public.academy_tcf_writing_note_failure(uuid,uuid,jsonb)','execute') then raise exception 'Backend privilege missing';end if;
 end;$$;""",
              'commit;' if commit else 'rollback;']
    return '\n'.join(parts)


def preflight():
    rows = query("select version,statements from supabase_migrations.schema_migrations where version in ('20261110002000','20261110002100','20261111002200')")
    recorded = {row['version']: row['statements'] for row in rows}
    pending = []
    for filename in MIGRATIONS:
        version = filename.split('_', 1)[0]
        source = (ROOT / 'supabase/migrations' / filename).read_text()
        if version in recorded:
            if recorded[version] != [source]:
                raise RuntimeError('Recorded migration differs; review before applying.')
        else:
            pending.append(filename)
    if MIGRATIONS[1] in pending:
        original = (ROOT / 'supabase/migrations/20261109001800_tcf_writing_sample_format.sql').read_text().split('as $$', 1)[1].split('$$;', 1)[0]
        deployed = query("select prosrc from pg_proc where oid='public.academy_tcf_writing_command(uuid,text,uuid,jsonb)'::regprocedure")[0]['prosrc']
        if deployed != original:
            raise RuntimeError('Live writing command differs from the reviewed baseline.')
    names = {row['name'] for row in api('/secrets')}
    if 'OPENAI_API_KEYfrench' not in names:
        raise RuntimeError('Expected OpenAI secret name missing; key values were not read.')
    return pending


def deploy(bundle):
    boundary = 'tcf-' + uuid.uuid4().hex
    meta = json.dumps({'name': 'academy-tcf-writing', 'entrypoint_path': 'index.ts', 'verify_jwt': True})
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{meta}\r\n'
               f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n').encode()
    payload += bundle.read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
    result = api('/functions/deploy?slug=academy-tcf-writing', raw=payload,
                 content_type='multipart/form-data; boundary=' + boundary)
    if result.get('status') != 'ACTIVE' or result.get('verify_jwt') is not True:
        raise RuntimeError('Deployed function readiness/auth verification failed.')
    print(json.dumps({k: result.get(k) for k in ['slug', 'status', 'version', 'verify_jwt']}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    args = parser.parse_args()
    if not args.bundle.is_file():
        raise RuntimeError('Build the reviewed Edge bundle first.')
    pending = preflight()
    query(transaction(pending))
    print('Rolled-back migration/grant rehearsal and preservation checks passed.')
    query(transaction(pending, commit=True))
    print('Migrations recorded; owner testing cap CAD 100; ordinary caps CAD 10; progress/responses/other wallets preserved.')
    deploy(args.bundle)
    print('Backend release complete. No provider call, Auth identity or payment was created. Native marking still needs a normal signed-in retry.')
    print('::notice title=TCF backend released::Reviewed migrations and owner CAD 100 allowance applied; student work preserved; JWT-protected writing function ACTIVE. Native marking requires a signed-in saved retry.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Print only our curated messages; never dump remote bodies or credentials.
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
            print('::error title=TCF release stopped::' + str(error).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'))
        else:
            print('Release stopped: ' + type(error).__name__ + '. No private response details printed.', file=sys.stderr)
            print('::error title=TCF release stopped::' + type(error).__name__ + '; private response details withheld.')
        sys.exit(1)
