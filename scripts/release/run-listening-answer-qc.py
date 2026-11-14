"""Trusted Actions runner only. Never prints or persists provider/server keys.
Uses the already configured Supabase authoring function; no student/wallet calls.
"""
import importlib.util, os, subprocess, sys, json, base64, hmac, hashlib, uuid, argparse
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('management',Path(__file__).with_name('tcf-marking.py'))
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--bundle',type=Path,required=True);args,forwarded=parser.parse_known_args()
 access_token=os.environ.get('SUPABASE_ACCESS_TOKEN','').strip()
 if not access_token:raise RuntimeError('Trusted Actions credential not configured')
 authoring_token=hmac.new(access_token.encode(),b'hzad-listening-authoring-only-v1',hashlib.sha256).hexdigest()
 secret_name='LISTENING_QC_ADMIN_TOKEN'
 configured=api.api('/secrets')
 if not any(s.get('name')==secret_name and s.get('digest')==hashlib.sha256(authoring_token.encode()).hexdigest() for s in configured):
  api.api('/secrets',body=[{'name':secret_name,'value':authoring_token}])
 # Deploy only the tested authoring service after setting its dedicated secret.
 # This does not change any existing student function, account or wallet.
 boundary='listening-qc-'+uuid.uuid4().hex
 metadata=json.dumps({'name':'academy-listening-qc','entrypoint_path':'index.ts','verify_jwt':True})
 payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n').encode()+args.bundle.read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
 deployed=api.api('/functions/deploy?slug=academy-listening-qc',raw=payload,content_type='multipart/form-data; boundary='+boundary)
 if deployed.get('status')!='ACTIVE' or deployed.get('verify_jwt') is not True:raise RuntimeError('Authoring service deployment/authentication check failed')
 # This credential exists only in the trusted hosted backend runner, never
 # in a browser, model input, result artifact, public log or local checkout.
 keys=api.api('/api-keys?reveal=true')
 key=next((k.get('api_key') for k in keys if k.get('name')=='service_role'),None)
 if not key:raise RuntimeError('Existing server credential unavailable; no model request made')
 try:
  claims=json.loads(base64.urlsafe_b64decode(key.split('.')[1]+'==='))
  if claims.get('role')!='service_role':raise ValueError()
 except Exception:raise RuntimeError('Server credential is redacted or malformed; no model request made')
 env=os.environ.copy();env['LISTENING_QC_TOKEN']=key;env['LISTENING_QC_ADMIN_TOKEN']=authoring_token
 env['LISTENING_QC_URL']='https://ogntvgvzmjrnppcullsj.supabase.co/functions/v1/academy-listening-qc'
 try:
  request=Request(env['LISTENING_QC_URL'],data=b'{"stage":"health"}',headers={'Authorization':'Bearer '+key,'apikey':key,'x-listening-qc-token':authoring_token,'Content-Type':'application/json'})
  with urlopen(request,timeout=30) as response:health=json.load(response)
  if not health.get('ready'):raise RuntimeError('Private evaluator is not ready')
 except HTTPError as error:
  try:reason=json.load(error).get('error','AUTH_GATEWAY')
  except Exception:reason='AUTH_GATEWAY'
  raise RuntimeError('Private evaluator preflight failed: HTTP'+str(error.code)+' '+str(reason)[:60]+'. No model request made.')
 print('Private evaluator authentication/provider preflight passed; no paid health call.',flush=True)
 result=subprocess.run(['node','scripts/run-listening-answer-qc.mjs',*forwarded],cwd=ROOT,env=env)
 raise SystemExit(result.returncode)
if __name__=='__main__':
 try:main()
 except RuntimeError as error:
  print('::error title=Listening authoring QC stopped::'+str(error));raise SystemExit(1)
 except Exception:
  print('::error title=Listening authoring QC stopped::Backend setup failed; credentials and response details withheld.');raise SystemExit(1)
