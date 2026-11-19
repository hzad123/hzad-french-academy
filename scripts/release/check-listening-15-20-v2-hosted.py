"""Verify every hosted TCF Listening 15–20 v2 audio/image byte after Pages deploys development.
Never touches Supabase publication pointers. All 39 source-matched recordings per
paper must be available at their new immutable version paths before release.
"""
import argparse,concurrent.futures,hashlib,json,time,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
PAGES='https://hzad123.github.io/hzad-french-academy/'
def sha(data):return hashlib.sha256(data).hexdigest()
def fetch_file(path,sha_commit):
    req=Request(PAGES+path.as_posix()+'?release='+sha_commit,headers={'User-Agent':'HZad-TCF15-20-v2-integrity'})
    with urlopen(req,timeout=50) as resp:body=resp.read()
    expected=sha((ROOT/path).read_bytes())
    return {'file':path.as_posix(),'bytes':len(body),'sha256':sha(body),'match':expected==sha(body)}
def check(commit,attempts):
    if len(commit)!=40 or any(x not in '0123456789abcdef' for x in commit):
        raise RuntimeError('Exact deployed development commit required')
    paths=[Path('assets/tcf-listening/v1/audio/audio-check.mp3')]
    for num in range(15,21):
        label=f'{num:02d}'
        bank_path=ROOT/f'supabase/exams/tcf-listening-test{label}-v2.json'
        bank=json.loads(bank_path.read_text())
        if bank['id']!=f'tcf-listening-{label}' or bank['version']!=f'tcf-listening-2026-11-test{label}-v2' or len(bank['questions'])!=39 or bank['seconds']!=2100:
            raise RuntimeError('Incomplete six-paper payload: '+label)
        base=Path('assets/tcf-listening')/bank['version']
        paths.extend([base/'manifest.json',base/'AUDIO-LICENSES.md'])
        for q in bank['questions']:
            paths.append(base/'audio'/q['audio'])
            if q.get('image'):paths.append(base/'images'/q['image'])
    if len(paths)!=271 or len(set(paths))!=271:raise RuntimeError('Expected271 unique hosted files, no duplicate sources')
    for i in range(attempts):
        try:
            with urlopen(PAGES+'?deployment='+commit,timeout=30) as response:
                page=response.read().decode()
            if commit in page:break
        except Exception:pass
        if i==attempts-1:raise RuntimeError('GitHub Pages has not deployed the exact reviewed development commit')
        time.sleep(15)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(lambda p:fetch_file(p,commit),paths))
    if not all(row['match'] for row in results):
        mismatch=[row['file'] for row in results if not row['match']]
        raise RuntimeError('Hosted source hash mismatch: '+','.join(mismatch[:12]))
    report=ROOT/'work/tcf-listening-15-20-v2-hosted/verified.json'
    report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps({'commit':commit,'verifiedFiles':271,'status':'HOSTED_MEDIA_MATCH','files':results},indent=2)+'\n')
    print('PASS: 271 source-matched audio, picture, license and manifest files match public hosted bytes.')
if __name__=='__main__':
    try:
        parser=argparse.ArgumentParser()
        parser.add_argument('--commit',required=True)
        parser.add_argument('--attempts',type=int,default=18)
        args=parser.parse_args()
        check(args.commit,args.attempts)
    except Exception as e:
        print('::error title=TCF listening 15-20 hosted verification::'+str(e))
        sys.exit(1)
