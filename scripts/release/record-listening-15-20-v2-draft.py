"""Stage six v2 draft banks; rerecord only edited T15/T20 Q25 audio.
No publication, no production writes, no semantic approval implied.
"""
import hashlib,json,shutil,subprocess,tempfile,wave
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[2]
VERSIONS=range(15,21)
MODEL_HASHES={
 "fr_FR-siwis-medium":"b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef",
 "fr_FR-tom-medium":"bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41",
 "fr_FR-upmc-medium":"9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f"}
PROFILE={"female":("fr_FR-siwis-medium",None),"male":("fr_FR-tom-medium",None),"female_alt":("fr_FR-upmc-medium",0),"male_alt":("fr_FR-upmc-medium",1)}
def sha(b):return hashlib.sha256(b).hexdigest()
def load(path):return json.loads(path.read_text())
def save(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n")
def duration(path):
 return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]))
def sourcehash(q):return sha(json.dumps(q["segments"],ensure_ascii=False,sort_keys=True).encode())
def main(models):
 for name,expected in MODEL_HASHES.items():
  if sha((models/(name+".onnx")).read_bytes())!=expected:raise RuntimeError("Voice SHA mismatch: "+name)
 voices={name:PiperVoice.load(str(models/(name+".onnx"))) for name in MODEL_HASHES}
 edits=load(ROOT/"work/tcf-listening-15-20-v2/editorial/q25-audio-corrections.json")
 if edits["state"]!="UNRECORDED_DO_NOT_PUBLISH":raise RuntimeError("Unexpected approval state")
 patches={x["test"]:x["correction"] for x in edits["items"]}
 for n in VERSIONS:
  nn=f"{n:02d}"
  old=load(ROOT/f"supabase/exams/tcf-listening-test{nn}.json")
  draft=load(ROOT/f"supabase/exams/tcf-listening-test{nn}-v2.json")
  if old["version"]!=f"tcf-listening-2026-11-test{nn}-v1" or draft["version"]!=f"tcf-listening-2026-11-test{nn}-v2":raise RuntimeError("Source version mismatch")
  root=ROOT/f"assets/tcf-listening/{draft['version']}"
  manifest=load(root/"manifest.json")
  items={f["file"]:f for f in manifest["files"]}
  if len(items)!=39 or len(draft["questions"])!=39:raise RuntimeError("Incomplete bank")
  if n in patches:
   patch=patches[n];oldq=old["questions"][24]
   if patch["correct"]!=oldq["correct"] or patch["slotSeconds"]!=oldq["slotSeconds"]:raise RuntimeError("Key or timing changed")
   revised={**patch,"audio":oldq["audio"],"kind":oldq["kind"],"number":25,"slotSeconds":oldq["slotSeconds"]}
   for field in ["audioStatus","sourceVersion","previousSegmentsSha256","targetSegmentsSha256"]:revised.pop(field,None)
   assert revised["question"]==revised["segments"][-1]["text"]
   q=draft["questions"][24]=revised
   outfile=root/"audio"/q["audio"]
   with tempfile.TemporaryDirectory() as directory:
    temp=Path(directory);joined=temp/"joined.wav"
    with wave.open(str(joined),"wb") as dst:
     dst.setnchannels(1);dst.setsampwidth(2);dst.setframerate(22050)
     dst.writeframes(bytes(int(22050*0.25)*2))
     for i,segment in enumerate(q["segments"]):
      name,speaker=PROFILE[segment.get("speaker",segment["voice"])]
      raw=temp/f"clip{i}.wav";normalized=temp/f"normalized{i}.wav"
      with wave.open(str(raw),"wb") as f:
       voices[name].synthesize_wav(segment["text"],f,SynthesisConfig(speaker_id=speaker,length_scale=1.0,noise_scale=.55,noise_w_scale=.7))
      subprocess.run(["ffmpeg","-v","error","-y","-i",str(raw),"-ar","22050","-ac","1","-c:a","pcm_s16le",str(normalized)],check=True)
      with wave.open(str(normalized),"rb") as f:dst.writeframes(f.readframes(f.getnframes()))
      dst.writeframes(bytes(int(22050*.35)*2))
    candidate=temp/"rendered.mp3"
    subprocess.run(["ffmpeg","-v","error","-y","-i",str(joined),"-af","loudnorm=I=-18:TP=-2:LRA=11","-ar","22050","-ac","1","-c:a","libmp3lame","-b:a","64k",str(candidate)],check=True)
    measured=duration(candidate)
    if measured+12>q["slotSeconds"]:raise RuntimeError(f"Test{nn} Q25 too long {measured} for {q['slotSeconds']}s slot")
    shutil.copyfile(candidate,outfile)
    q["audioSeconds"]=round(measured,3)
    items[q["audio"]]={"file":q["audio"],"sourceHash":sourcehash(q),"sha256":sha(outfile.read_bytes()),"seconds":q["audioSeconds"],"rerecorded":True}
  for x,y in zip(old["questions"],draft["questions"]):
   if x["number"]!=y["number"] or x["correct"]!=y["correct"] or x["slotSeconds"]!=y["slotSeconds"]:raise RuntimeError("Answer/slot invariant broken")
   if y["number"]!=25 or n not in patches:
    if x["segments"]!=y["segments"] or x["transcript"]!=y["transcript"]:raise RuntimeError("Unapproved audio source changed")
   path=root/"audio"/y["audio"]
   if sha(path.read_bytes())!=items[y["audio"]]["sha256"]:raise RuntimeError("Media SHA mismatch")
   if sourcehash(y)!=items[y["audio"]]["sourceHash"]:raise RuntimeError("Spoken source hash mismatch")
   if y["audioSeconds"]+12>y["slotSeconds"]:raise RuntimeError("Answer window reduced")
  if sum(q["slotSeconds"] for q in draft["questions"])!=2100:raise RuntimeError("Test clock drift")
  manifest["files"]=[items[q["audio"]] for q in draft["questions"]]
  manifest["state"]="DRAFT_AUDIO_VERIFIED_NOT_EDITORIAL_APPROVED"
  manifest["sourceStatus"]="Q25 edited and rerecorded" if n in patches else "all original audio retained"
  save(root/"manifest.json",manifest)
  save(ROOT/f"supabase/exams/tcf-listening-test{nn}-v2.json",draft)
  print(f"Test {nn}: 39 recordings verified; "+("Q25 rerecorded" if n in patches else "original audio retained"),flush=True)
 save(ROOT/"work/tcf-listening-15-20-v2/media-result.json",{"state":"DRAFT_MEDIA_VERIFIED_NOT_PUBLISHED","tests":list(VERSIONS),"items":234,"rerecorded":[{"test":n,"question":25} for n in patches]})
if __name__=="__main__":
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument("--models",type=Path,required=True);a=parser.parse_args();main(a.models)
