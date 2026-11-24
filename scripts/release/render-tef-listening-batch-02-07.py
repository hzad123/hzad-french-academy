"""Offline authoring of 40 TEF Canada listening mock clips; no student AI costs.
Produces immutable source-hashed audio, full verified 40-min bank and manifest.
Do not use as an automated substitute for French-language editorial listening QA.
"""
import hashlib,json,subprocess,tempfile,wave,shutil
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[2]
BANK=None
ASSETS=None
VOICES={"female":("fr_FR-siwis-medium",None,"b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef"),"male":("fr_FR-tom-medium",None,"bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41")}
def hash_bytes(b):return hashlib.sha256(b).hexdigest()
def sha(path):return hash_bytes(path.read_bytes())
def source_hash(q):return hash_bytes(json.dumps(q["segments"],ensure_ascii=False,sort_keys=True).encode())
def duration(path):return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))
def save(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
def render(models, bank_file):
 global BANK,ASSETS
 BANK=ROOT/"supabase/exams"/bank_file
 if not BANK.is_file():raise RuntimeError("Missing original authored bank: "+str(BANK))
 paper=json.loads(BANK.read_text())
 if paper.get("version") not in [f"tef-listening-2026-11-test{n:02d}-v1" for n in range(2,8)]:raise RuntimeError("Only new immutable Tests 02-07 allowed")
 ASSETS=ROOT/"assets/tef-listening"/paper["version"]

 if paper["id"]!=paper["version"].replace("tef-listening-2026-11-test","tef-listening-").split("-v")[0] or len(paper["questions"])!=40 or paper["seconds"]!=2400:raise RuntimeError("Incorrect 40-question TEF paper")
 loaded={}
 for voice,(name,speaker,expected) in VOICES.items():
  if sha(models/(name+".onnx"))!=expected:raise RuntimeError("Pinned French voice hash mismatch")
  loaded[voice]=(PiperVoice.load(str(models/(name+".onnx"))),speaker)
 ASSETS.joinpath("audio").mkdir(parents=True,exist_ok=True)
 entries=[]
 for q in paper["questions"]:
  if q["slotSeconds"]==0:continue  # pair uses same audio
  target=ASSETS/"audio"/q["audio"]
  # Repeatable/restart-safe source/byte checks for an interrupted Actions job.
  with tempfile.TemporaryDirectory() as t:
   tmp=Path(t);join=tmp/"combined.wav"
   with wave.open(str(join),"wb") as whole:
    whole.setnchannels(1);whole.setsampwidth(2);whole.setframerate(22050)
    whole.writeframes(bytes(int(22050*.25)*2))
    for i,segment in enumerate(q["segments"]):
     voice,speaker=loaded[segment["voice"]];raw=tmp/f"part{i}.wav";pcm=tmp/f"normalized{i}.wav"
     with wave.open(str(raw),"wb") as dest:
      voice.synthesize_wav(segment["text"],dest,SynthesisConfig(speaker_id=speaker,length_scale=1.04,noise_scale=.55,noise_w_scale=.7))
     subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(raw),"-ar","22050","-ac","1","-c:a","pcm_s16le",str(pcm)],check=True)
     with wave.open(str(pcm),"rb") as part:whole.writeframes(part.readframes(part.getnframes()))
     whole.writeframes(bytes(int(22050*.34)*2))
   clip=tmp/"source.mp3"
   subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(join),"-af","loudnorm=I=-18:TP=-2:LRA=11","-ar","22050","-ac","1","-c:a","libmp3lame","-b:a","64k",str(clip)],check=True)
   seconds=duration(clip)
   minimum=(18 if q["number"]<=4 else 20 if q["number"]<=12 else 23 if q["number"]<=20 else 36 if q["number"]<=22 else 105 if q["number"]<=28 else 100 if q["number"]==29 else 35)
   post=30 if 23<=q["number"]<=28 else 15 if q["number"]>=13 else 10
   if seconds<minimum:raise RuntimeError(f"Recording too SHORT: {seconds:.2f}s vs {minimum}s minimum")
   # Final question slots are allocated AFTER measuring real WAV/MP3 duration.
   # Do not shorten an original spoken passage to satisfy an arbitrary estimate.
   q["_neededSlot"]=int(__import__("math").ceil(seconds+q["previewSeconds"]+post))
   shutil.copyfile(clip,target);q["audioSeconds"]=round(seconds,3)
   subprocess.run(["ffmpeg","-v","error","-xerror","-i",str(target),"-f","null","-"],check=True,stderr=subprocess.PIPE)
   entries.append({"file":q["audio"],"sha256":sha(target),"sourceHash":source_hash(q),"seconds":q["audioSeconds"]})
   print(f"TEF Q{q['number']:02d}: {seconds:.2f}s audio OK in {q['slotSeconds']}s slot",flush=True)
 for q in paper["questions"]:
  if q["slotSeconds"]==0:
   earlier=paper["questions"][q["groupStart"]-1]
   q["audioSeconds"]=earlier["audioSeconds"]
 source=ROOT/"assets/tcf-listening/v1/audio/audio-check.mp3"
 if not source.exists():raise RuntimeError("Existing verified headphone check missing")
 shutil.copyfile(source,ASSETS/"audio/audio-check.mp3")
 if len(entries)!=36:raise RuntimeError('Expected 36 unique recordings')
 # Keep official reading/answer windows, and retain a strict 40-minute total.
 active=[q for q in paper["questions"] if q["slotSeconds"]>0]
 needed=sum(q["_neededSlot"] for q in active)
 if needed>2400:
  print("::error::Actual audio + required reading/answer windows exceed 40 minutes: "+str(needed)+"s",flush=True)
  for q in active:print(f"Q{q['number']}: {q['audioSeconds']}s audio; {q['_neededSlot']}s required",flush=True)
  raise RuntimeError("40-minute paper does not fit; revise spoken scripts, not playback speed")
 surplus=2400-needed
 # Excess time is not silently spread as extra response time.
 # No more than one second per recording is allowed for codec rounding.
 if surplus>len(active):
  raise RuntimeError(f"Recording bank leaves {surplus}s unassigned; revise speech lengths rather than padding answer windows")
 for i,q in enumerate(active):
  q["slotSeconds"]=q.pop("_neededSlot")+(1 if i<surplus else 0)
 print(f"Real voice recordings require {needed}s including reading/response; allocated {surplus}s codec-rounding overhead (max 1s per clip).",flush=True)
 if sum(q["slotSeconds"] for q in paper["questions"])!=2400:raise RuntimeError("Exam clock mismatch")
 save(ASSETS/"manifest.json",{"version":paper["version"],"state":"MEDIA_VERIFIED_EDITORIAL_REVIEW_PENDING","files":entries,"seconds":2400,"previewPolicy":"Official reading/response windows with <=1s per recording rounding; interview questions displayed together"})
 save(BANK,paper)
 print("36 original recordings, four shared two-question passages, four original picture panels.")
if __name__=="__main__":
 import argparse
 a=argparse.ArgumentParser();a.add_argument("--models",type=Path,required=True);a.add_argument("--bank",required=True);opts=a.parse_args();render(opts.models,opts.bank)
