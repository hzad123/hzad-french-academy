"""Release only the TEF writing section-unlock migration to the French Academy project.

Uses existing GitHub Actions secret, never exposes credentials or student content.
"""
import json
import os
from pathlib import Path
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

PROJECT='ogntvgvzmjrnppcullsj'
BASE='https://api.supabase.com/v1/projects/'+PROJECT
MIGRATION=Path(__file__).resolve().parents[2]/'supabase/migrations/20261117230000_tef_writing_unlock_sections.sql'

def query(sql):
 token=os.environ.get('SUPABASE_ACCESS_TOKEN','').strip()
 if not token: raise RuntimeError('Supabase release secret unavailable.')
 body=json.dumps({'query':sql}).encode()
 req=Request(BASE+'/database/query',data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 try:
  with urlopen(req,timeout=90) as res:return json.loads(res.read())
 except HTTPError as exc: raise RuntimeError('Supabase SQL release rejected with HTTP '+str(exc.code)) from None

def main():
 source=MIGRATION.read_text()
 if not source.startswith('-- TEF writing practice:') or not source.strip().endswith('commit;'):
  raise RuntimeError('Expected reviewed TEF writing migration.')
 baseline=query("""select
  (select count(*) from academy_tef_writing.attempts) as attempts,
  (select count(*) from academy_ai.requests where kind='tef-writing') as assessments,
  (select count(*) from academy_ai.wallets) as wallets,
  (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by t.id),'')) from academy_tef_writing.attempts t) as response_checksum,
  (select has_function_privilege('anon','public.academy_tef_writing_command(uuid,text,uuid,jsonb)','EXECUTE')) as anon_access""")
 if len(baseline)!=1 or baseline[0]['anon_access']:raise RuntimeError('Baseline permission/state check failed.')
 definitions=query("select pg_get_functiondef('public.academy_tef_writing_command(uuid,text,uuid,jsonb)'::regprocedure) as definition")
 if len(definitions)!=1: raise RuntimeError('TEF backend definition unavailable.')
 updated=definitions[0]['definition']
 key="if now()<a.started_at+interval '25 minutes'"
 if key not in updated and "if now()>=a.started_at+interval '25 minutes'" not in updated:
  print('TEF sections already unlocked; verifying only.')
 else:
  # Full rehearsal in a transaction that rolls back before committing.
  query(source.rsplit('commit;',1)[0]+'rollback;')
  print('TEF writing unlock transaction rehearsal passed.')
  query(source)
  print('TEF writing section unlock applied.')
 after=query("""select
  (select count(*) from academy_tef_writing.attempts) as attempts,
  (select count(*) from academy_ai.requests where kind='tef-writing') as assessments,
  (select count(*) from academy_ai.wallets) as wallets,
  (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by t.id),'')) from academy_tef_writing.attempts t) as response_checksum,
  (select has_function_privilege('anon','public.academy_tef_writing_command(uuid,text,uuid,jsonb)','EXECUTE')) as anon_access""")
 final=query("select pg_get_functiondef('public.academy_tef_writing_command(uuid,text,uuid,jsonb)'::regprocedure) as definition")
 if after!=baseline or not final or "Section B has not started" in final[0]['definition'] or "Section A is closed" in final[0]['definition']:
  raise RuntimeError('TEF release failed preservation or final-function check.')
 print('TEF section unlock verified: saved answers, wallet counts and security permissions preserved.')

if __name__=='__main__':
 try:main()
 except Exception as e:
  print(str(e) if isinstance(e,RuntimeError) else 'TEF release failed; private details withheld.',file=sys.stderr)
  sys.exit(1)
