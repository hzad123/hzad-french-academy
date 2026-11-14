"""Trusted Actions runner only. Never prints or persists provider/server keys.
Uses the already configured Supabase authoring function; no student/wallet calls.
"""
import importlib.util, os, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('management',Path(__file__).with_name('tcf-marking.py'))
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
def main():
 # This credential exists only in the trusted hosted backend runner, never
 # in a browser, model input, result artifact, public log or local checkout.
 keys=api.api('/api-keys')
 key=next((k.get('api_key') for k in keys if k.get('name')=='service_role'),None)
 if not key:raise RuntimeError('Existing server credential unavailable; no model request made')
 env=os.environ.copy();env['LISTENING_QC_TOKEN']=key
 env['LISTENING_QC_URL']='https://ogntvgvzmjrnppcullsj.supabase.co/functions/v1/academy-listening-qc'
 result=subprocess.run(['node','scripts/run-listening-answer-qc.mjs',*sys.argv[1:]],cwd=ROOT,env=env)
 raise SystemExit(result.returncode)
if __name__=='__main__':
 try:main()
 except RuntimeError as error:
  print('::error title=Listening authoring QC stopped::'+str(error));raise SystemExit(1)
 except Exception:
  print('::error title=Listening authoring QC stopped::Backend setup failed; credentials and response details withheld.');raise SystemExit(1)
