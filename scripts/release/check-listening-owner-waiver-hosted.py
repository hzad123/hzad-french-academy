"""Check every hosted byte for owner-approved TCF Listening v5 before activating it.

Runs after GitHub Pages publishes the exact reviewed development commit.
This is independent of the Supabase management API and never changes a bank.
"""
import argparse
import concurrent.futures
import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[2]
PAGES='https://hzad123.github.io/hzad-french-academy/'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def verified(url, expected):
    with urlopen(Request(url,headers={'User-Agent':'HZad-owner-waiver-audio-integrity'}),timeout=45) as response:
        body=response.read()
    return {'file':expected.as_posix(),'bytes':len(body),'sha256':digest(body),
        'match':digest(body)==digest((ROOT/expected).read_bytes())}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--commit',required=True)
    parser.add_argument('--attempts',type=int,default=18)
    args=parser.parse_args()
    commit=args.commit
    if len(commit)!=40 or any(c not in '0123456789abcdef' for c in commit):
        raise RuntimeError('Exact reviewed git commit SHA required')
    banks=[]
    for n in range(1,7):
        path=ROOT/f'supabase/exams/tcf-listening-test{n:02d}-v5.json'
        data=json.loads(path.read_text())
        if data['version']!=f'tcf-listening-2026-11-test{n:02d}-v5' or len(data['questions'])!=39:
            raise RuntimeError('Missing complete, uniform six-paper v5 payload')
        banks.append(data)
    paths=[Path('assets/tcf-listening/v1/audio/audio-check.mp3')]
    for bank in banks:
        root=Path('assets/tcf-listening')/bank['version']
        paths.extend([root/'manifest.json',root/'AUDIO-LICENSES.md'])
        for q in bank['questions']:
            paths.append(root/'audio'/q['audio'])
            if q.get('image'):paths.append(root/'images'/q['image'])
    if len(paths)!=271 or len(set(paths))!=271:
        raise RuntimeError('Expected exactly271 unique release assets')
    for attempt in range(args.attempts):
        try:
            with urlopen(PAGES+'?deployment='+commit,timeout=25) as response:
                page=response.read().decode()
            if commit in page:break
        except Exception:pass
        if attempt==args.attempts-1:raise RuntimeError('GitHub Pages is not serving the exact reviewed development SHA')
        time.sleep(15)
    def check(path):
        return verified(PAGES+path.as_posix()+'?deployment='+commit,path)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(check,paths))
    if len(results)!=271 or not all(row['match'] for row in results):
        mismatch=[r['file'] for r in results if not r['match']]
        raise RuntimeError('Hosted audio/images differ from approved source: '+','.join(mismatch[:8]))
    report=ROOT/'work/listening-owner-waiver-hosted/verified.json'
    report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps({'commit':commit,'verifiedFiles':271,'status':'HOSTED_MEDIA_MATCH','files':results},indent=2)+'\n')
    print('Exactly271 audio/image/manifest/source files match the deployed GitHub Pages bytes; safe to consider the guarded database transaction.')

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('::error title=Owner-waiver hosted release not verified::'+str(exc))
        sys.exit(1)
