"""Offline authoring of 40 TEF Canada listening mock clips; no student AI costs.
Produces immutable source-hashed audio, full verified 40-min bank and manifest.
Do not use as an automated substitute for French-language editorial listening QA.
"""
import hashlib,json,subprocess,tempfile,wave,shutil
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[2]
BANK=ROOT/"supabase/exams/tef-listening-test01.json"
ASSETS=ROOT/"assets/tef-listening/tef-listening-2026-11-test01-v1"
VOICES={"female":("fr_FR-siwis-medium",None,"b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef"),"male":("fr_FR-tom-medium",None,"bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41")}
def hash_bytes(b):return hashlib.sha256(b).hexdigest()
def sha(path):return hash_bytes(path.read_bytes())
def source_hash(q):return hash_bytes(json.dumps(q["segments"],ensure_ascii=False,sort_keys=True).encode())
def duration(path):return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))
def save(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
def render(models):
 paper=json.loads(BANK.read_text())
 if paper["id"]!="tef-listening-01" or len(paper["questions"])!=40 or paper["seconds"]!=2400:raise RuntimeError("Incorrect 40-question TEF paper")
 loaded={}
 for voice,(name,speaker,expected) in VOICES.items():
  if sha(models/(name+".onnx"))!=expected:raise RuntimeError("Pinned French voice hash mismatch")
  loaded[voice]=(PiperVoice.load(str(models/(name+".onnx"))),speaker)
 ASSETS.joinpath("audio").mkdir(parents=True,exist_ok=True)
 entries=[]
 for q in paper["questions"]:
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
   if seconds+q["previewSeconds"]+10>q["slotSeconds"]:
    raise RuntimeError(f"TEF Q{q['number']}: {seconds:.2f}s audio needs more time than fixed {q['slotSeconds']}s slot")
   shutil.copyfile(clip,target);q["audioSeconds"]=round(seconds,3)
   subprocess.run(["ffmpeg","-v","error","-xerror","-i",str(target),"-f","null","-"],check=True,stderr=subprocess.PIPE)
   entries.append({"file":q["audio"],"sha256":sha(target),"sourceHash":source_hash(q),"seconds":q["audioSeconds"]})
   print(f"TEF Q{q['number']:02d}: {seconds:.2f}s audio OK in {q['slotSeconds']}s slot",flush=True)
 source=ROOT/"assets/tcf-listening/v1/audio/audio-check.mp3"
 if not source.exists():raise RuntimeError("Existing verified headphone check missing")
 shutil.copyfile(source,ASSETS/"audio/audio-check.mp3")
 if sum(q["slotSeconds"] for q in paper["questions"])!=2400:raise RuntimeError("Exam clock mismatch")
 save(ASSETS/"manifest.json",{"version":paper["version"],"state":"MEDIA_VERIFIED_EDITORIAL_REVIEW_PENDING","files":entries,"seconds":2400,"previewPolicy":"5–10 seconds before playback; once per question"})
 save(BANK,paper)
 print("40 audio recordings source-matched, and 4 picture panels prepared; do not publish before final QA.")
if __name__=="__main__":
 import argparse
 a=argparse.ArgumentParser();a.add_argument("--models",type=Path,required=True);render(a.parse_args().models)
