"""Release isolated TEF Canada Speaking on the existing HZad French Academy Supabase project.

GitHub Actions only. Does not log access tokens, user IDs, student audio,
raw student answers, model prompts or wallet balances.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2]
BASE='https://api.supabase.com/v1/projects/ogntvgvzmjrnppcullsj'
FILENAME='20261117234000_tef_speaking_twenty_tests.sql'
VERSION='20261117234000'
NAME='tef_speaking_twenty_tests'
def api(path,body=None,raw=None,content_type='application/json'):
 token=os.environ.get('SUPABASE_ACCESS_TOKEN','').strip()
 if not token:raise RuntimeError('Repository SUPABASE_ACCESS_TOKEN secret is not available.')
 data=raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
 req=Request(BASE+path,data=data,headers={'Authorization':'Bearer '+token,'Content-Type':content_type})
 try:
  with urlopen(req,timeout=120) as response:
   output=response.read();return json.loads(output) if output else None
 except HTTPError as ex:
  # Do not print sensitive provider/SQL responses.
  raise RuntimeError('Supabase Management API refused request (HTTP '+str(ex.code)+').') from None
def query(sql):return api('/database/query',{'query':sql})
def literal(v):return "'"+v.replace("'","''")+"'"
SNAPSHOT="""select jsonb_build_object(
 'progress',(select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.user_id,p.unit_id),'')) from public.academy_learning_progress p),
 'tcfSpeaking',(select md5(coalesce(string_agg(to_jsonb(a)::text,'|' order by a.id),'')) from academy_tcf_speaking.attempts a),
 'tcfSpeakingCalls',(select md5(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.id),'')) from academy_tcf_speaking.calls c),
 'tcfWriting',(select md5(coalesce(string_agg(to_jsonb(w)::text,'|' order by w.id),'')) from academy_tcf_writing.attempts w),
 'tefWriting',(select md5(coalesce(string_agg(to_jsonb(w)::text,'|' order by w.id),'')) from academy_tef_writing.attempts w),
 'wallets',(select md5(coalesce(string_agg(to_jsonb(w)::text,'|' order by w.user_id),'')) from academy_ai.wallets w),
 'policy',(select to_jsonb(p) from academy_ai.policy p where id),
 'otherActivities',(select jsonb_agg(to_jsonb(a) order by a.kind) from academy_ai.activities a where a.kind not like 'tef-speaking-%')
) as state"""
def transaction(source,commit):
 if not source.startswith('-- Dedicated TEF Canada speaking practice.') or not source.strip().endswith('commit;'):
  raise RuntimeError('Migration differs from reviewed TEF speaking source.')
 text=source.replace('begin;','',1).rsplit('commit;',1)[0]
 sql=["begin isolation level repeatable read;",
  "select pg_advisory_xact_lock(hashtext('hzad-tef-speaking-20261117'));",
  "create temp table tef_release_before on commit drop as "+SNAPSHOT+";"]
 sql.append(text)
 sql.extend([
  "create temp table tef_release_after on commit drop as "+SNAPSHOT+";",
  """do $$begin
   if (select state from tef_release_before) is distinct from (select state from tef_release_after)
    then raise exception 'Existing student work, TCF attempts or wallets changed';end if;
   if has_function_privilege('anon','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','execute') or
      has_function_privilege('authenticated','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','execute') or
      not has_function_privilege('service_role','public.academy_tef_speaking_command(uuid,text,uuid,jsonb)','execute')
    then raise exception 'TEF voice RPC privilege check failed';end if;
   if not exists(select 1 from storage.buckets where id='academy-tef-speaking' and not public)
    then raise exception 'TEF recording bucket must be private';end if;
   if not exists(select 1 from pg_class where oid='academy_tef_speaking.attempts'::regclass and relrowsecurity)
    then raise exception 'TEF speaking RLS not enabled';end if;
  end;$$;"""])
 if commit:
  sql.append('insert into supabase_migrations.schema_migrations(version,name,statements) values('+
   literal(VERSION)+','+literal(NAME)+',array['+literal(source)+']);')
 sql.append('commit;' if commit else 'rollback;')
 return '\n'.join(sql)
def preflight(source):
 rows=query('select version,statements from supabase_migrations.schema_migrations where version='+literal(VERSION))
 if rows:
  if len(rows)!=1 or rows[0]['statements']!=[source]:raise RuntimeError('Existing TEF speaking migration hash differs.')
  return False
 if query("select to_regclass('academy_tef_speaking.attempts') as name")[0]['name'] is not None:
  raise RuntimeError('TEF speaking tables already exist without reviewed migration entry.')
 acts=query("select kind,enabled,credits,model,ceiling_microcad from academy_ai.activities where kind in('tcf-speaking-turn','tcf-speaking-feedback') order by kind")
 if len(acts)!=2 or not all(x['enabled'] and x['credits'] and x['model'] and x['ceiling_microcad'] for x in acts):
  raise RuntimeError('Existing TCF voice model / credit settings incomplete; do not activate TEF yet.')
 return True
def deploy(bundle):
 if not bundle.is_file() or not 2000<bundle.stat().st_size<2000000:
  raise RuntimeError('Bundled TEF Speaking function missing or has unsafe size.')
 boundary='tef-speaking-'+uuid.uuid4().hex
 meta=json.dumps({'name':'academy-tef-speaking','entrypoint_path':'index.ts','verify_jwt':True})
 prefix=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{meta}\r\n'
  f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n').encode()
 body=prefix+bundle.read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
 result=api('/functions/deploy?slug=academy-tef-speaking',raw=body,content_type='multipart/form-data; boundary='+boundary)
 if result.get('status')!='ACTIVE' or result.get('verify_jwt') is not True or result.get('slug')!='academy-tef-speaking':
  raise RuntimeError('TEF Speaking Edge deployment not ACTIVE or JWT not enforced.')
 print('TEF Speaking Edge FUNCTION ACTIVE, verify_jwt=true, version '+str(result.get('version')))
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--bundle',type=Path,required=True)
 args=parser.parse_args()
 source=(ROOT/'supabase/migrations'/FILENAME).read_text()
 if preflight(source):
  query(transaction(source,False))
  print('TEF speaking schema migration rollback rehearsal and preservation checks: passed.')
  query(transaction(source,True))
  print('TEF speaking schema migration applied with existing student data preserved.')
 else:print('Existing matching TEF speaking migration verified; not applied twice.')
 deploy(args.bundle)
 print('TEF Speaking release completed. No paid AI inference, user recordings or wallet adjustments performed.')
if __name__=='__main__':
 try:main()
 except Exception as exc:
  message=str(exc) if isinstance(exc,RuntimeError) else type(exc).__name__+'; private details omitted'
  print('::error title=TEF speaking release stopped::'+message.replace('%','%25'),file=sys.stderr)
  sys.exit(1)
