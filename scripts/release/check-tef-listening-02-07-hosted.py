"""Fail-closed published TEF Listening 02–07 hosted media byte verifier.
Run only AFTER GitHub Pages deploys exact development SHA and BEFORE inserting
any of six immutable paper versions into private Supabase schema.
"""
import argparse,hashlib,json,time,sys,concurrent.futures
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
PAGES="https://hzad123.github.io/hzad-french-academy/"
def sha(b):return hashlib.sha256(b).hexdigest()
def hosted(path,commit):
 req=Request(PAGES+path.as_posix()+"?release="+commit,headers={"User-Agent":"HZad-TEF-02-07-integrity","Cache-Control":"no-cache"})
 with urlopen(req,timeout=60) as r:content=r.read()
 original=(ROOT/path).read_bytes()
 return {"path":path.as_posix(),"match":sha(content)==sha(original),"localHash":sha(original),"hostHash":sha(content),"size":len(original)}
def run(commit,attempts):
 if len(commit)!=40 or any(c not in "0123456789abcdef" for c in commit):raise RuntimeError("Exact deployed development git SHA required")
 paths=[]
 for n in range(2,8):
  paper=json.loads((ROOT/f"supabase/exams/tef-listening-test{n:02d}-v1.json").read_text())
  if paper["id"]!=f"tef-listening-{n:02d}" or len(paper["questions"])!=40 or paper["seconds"]!=2400:raise RuntimeError("Incomplete paper "+str(n))
  if sum(q["slotSeconds"] for q in paper["questions"])!=2400:raise RuntimeError("Unmeasured/incorrect clock Test "+str(n))
  if len({q["audio"] for q in paper["questions"]})!=36:raise RuntimeError("Incorrect recording count Test "+str(n))
  base=Path("assets/tef-listening")/paper["version"]
  items=[base/"manifest.json",base/"AUDIO-LICENSES.md",base/"audio"/"audio-check.mp3"]
  for q in paper["questions"]:
   items.append(base/"audio"/q["audio"])
   if q.get("image"):items.append(base/"images"/q["image"])
  items=list(dict.fromkeys(items))
  if len(items)!=43:raise RuntimeError("Expected 43 hosted artifacts per paper Test "+str(n))
  paths.extend(items)
 if len(paths)!=258 or len(set(paths))!=258:raise RuntimeError("Expected 258 original hosted artifacts")
 for retry in range(attempts):
  try:
   with urlopen(PAGES+"BUILD_COMMIT.txt?release="+commit,timeout=25) as r:live=r.read().decode().strip()
   if live==commit:break
  except Exception:pass
  if retry==attempts-1:raise RuntimeError("Pages revision not yet the published SHA")
  time.sleep(12)
 with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
  checks=list(pool.map(lambda p:hosted(p,commit),paths))
 bad=[x["path"] for x in checks if not x["match"]]
 if bad:raise RuntimeError("Hosted SHA mismatches: "+", ".join(bad[:20]))
 report=ROOT/"work/tef-listening-02-07/hosted-verified.json"
 report.parent.mkdir(parents=True,exist_ok=True)
 report.write_text(json.dumps({"commit":commit,"files":258,"verified":True,"checks":checks},indent=2)+"\n")
 print("PASS: 258 exact hosted files / 216 immutable French recordings / 24 picture SVGs verified for six papers.")
if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--commit",required=True);p.add_argument("--attempts",type=int,default=18)
 o=p.parse_args()
 try:run(o.commit,o.attempts)
 except Exception as e:print("::error title=TEF 02-07 hosted files::"+str(e));sys.exit(1)
