"""Verify every hosted TEF Listening Test01 audio, image, manifest and voice license byte.
Requires GitHub Pages to serve the exact deployment SHA before activating private bank.
"""
import argparse,concurrent.futures,hashlib,json,time,sys
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[2]
PAGES="https://hzad123.github.io/hzad-french-academy/"
def sha(b):return hashlib.sha256(b).hexdigest()
def load(path,commit):
 req=Request(PAGES+path.as_posix()+"?release="+commit,headers={"User-Agent":"HZad-TEF01-integrity"})
 with urlopen(req,timeout=45) as response:body=response.read()
 expected=sha((ROOT/path).read_bytes())
 return {"path":path.as_posix(),"sha256":sha(body),"bytes":len(body),"match":sha(body)==expected}
def run(commit,attempts):
 if len(commit)!=40 or any(c not in "0123456789abcdef" for c in commit):raise RuntimeError("Exact 40-character deployed commit required")
 bank=json.loads((ROOT/"supabase/exams/tef-listening-test01-v2.json").read_text())
 if bank["id"]!="tef-listening-01" or len(bank["questions"])!=40 or bank["seconds"]!=2400:raise RuntimeError("Incomplete TEF listening paper")
 base=Path("assets/tef-listening")/bank["version"]
 paths=[base/"manifest.json",base/"AUDIO-LICENSES.md",base/"audio"/"audio-check.mp3"]
 for q in bank["questions"]:
  paths.append(base/"audio"/q["audio"])
  if q.get("image"):paths.append(base/"images"/q["image"])
 paths=list(dict.fromkeys(paths))
 if len(paths)!=43 or len(set(paths))!=43:raise RuntimeError("Expected 43 unique hosted files")
 for turn in range(attempts):
  try:
   with urlopen(PAGES+"?deployment="+commit,timeout=25) as r:html=r.read().decode()
   if commit in html:break
  except Exception:pass
  if turn==attempts-1:raise RuntimeError("Exact GitHub Pages revision not yet deployed")
  time.sleep(15)
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  result=list(pool.map(lambda p:load(p,commit),paths))
 mismatches=[x["path"] for x in result if not x["match"]]
 if mismatches:raise RuntimeError("Hosted byte mismatches: "+", ".join(mismatches[:12]))
 report=ROOT/"work/tef-listening-test01/v2-hosted-verified.json";report.parent.mkdir(parents=True,exist_ok=True)
 report.write_text(json.dumps({"commit":commit,"files":43,"result":"HOSTED_BYTE_MATCH","checked":result},indent=2)+"\n")
 print("PASS: 43 exact hosted files for original TEF Listening Test01.")
if __name__=="__main__":
 a=argparse.ArgumentParser();a.add_argument("--commit",required=True);a.add_argument("--attempts",type=int,default=18);opts=a.parse_args()
 try:run(opts.commit,opts.attempts)
 except Exception as e:print("::error title=TEF Listening hosted verification::"+str(e));sys.exit(1)
