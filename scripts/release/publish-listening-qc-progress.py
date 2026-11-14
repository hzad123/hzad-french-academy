"""Trusted runner: publish diagnostics after each paper, never bank activation."""
import os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BRANCH='feature/listening-blind-answer-quality'
def git(*args):
 return subprocess.run(['git',*args],cwd=ROOT,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True).stdout
def main():
 if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('GITHUB_REF_NAME')!=BRANCH:
  raise RuntimeError('Diagnostic publication requires the trusted authoring branch')
 subprocess.run([sys.executable,'scripts/save-listening-qc-progress.py'],cwd=ROOT,check=True)
 git('config','user.name','github-actions[bot]')
 git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 git('add','reports/listening-answer-qc-latest')
 if not git('diff','--cached','--name-only').strip():return
 git('commit','-m','Checkpoint actual listening question evaluations; candidates remain unpublished')
 git('fetch','origin',BRANCH)
 git('rebase','origin/'+BRANCH)
 git('push','origin','HEAD:'+BRANCH)
 print('Saved per-paper diagnostic checkpoint on the feature branch.',flush=True)
if __name__=='__main__':
 try:main()
 except Exception:
  print('Diagnostic checkpoint not pushed; local evaluation files retained. No credentials logged.',flush=True)
  raise SystemExit(1)
