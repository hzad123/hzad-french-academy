"""Preserve non-credential QC evidence on the feature branch, including rejects."""
from pathlib import Path
import shutil,json
source=Path('work/listening-answer-qc');dest=Path('reports/listening-answer-qc-latest')
if source.exists():
 if dest.exists():shutil.rmtree(dest)
 dest.mkdir(parents=True)
 run=json.loads((source/'run.json').read_text()) if (source/'run.json').exists() else None
 for name in ['run.json','summary.json','baseline.json','seed.json','model-receipts/cost-ledger.json']:
  p=source/name
  if p.exists():
   target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
 for folder in source.glob('test??'):
  evidence=folder/'evidence.json'
  if run and (not evidence.exists() or json.loads(evidence.read_text()).get('policyHash')!=run['policyHash']):continue
  target=dest/folder.name;target.mkdir()
  for name in ['bank.json','evidence.json']:
   p=folder/name
   if p.exists():shutil.copyfile(p,target/name)
 (dest/'README.txt').write_text('Diagnostic candidates and actual independent evaluator results. A readyForMedia=false summary is NOT an accepted or published examination. No credentials, student submissions or accounts are stored here.\n')
 print('Saved QC progress/evidence; no credential environment or API keys copied.')
