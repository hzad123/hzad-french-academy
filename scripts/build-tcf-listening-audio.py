"""Offline build: Piper1.8.0 and pinned French voices; no runtime inference.
Usage: python scripts/build-tcf-listening-audio.py --models /path/to/models
Requires ffmpeg. Voice model licenses and attribution are recorded separately. See assets/tcf-listening/v1/AUDIO-LICENSES.md.
"""
import argparse,hashlib,json,math,subprocess,tempfile,wave
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[1]
def duration(path):
 return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)]))
def build(models):
 paper_path=ROOT/'supabase/exams/tcf-listening-test01.json';paper=json.loads(paper_path.read_text());out=ROOT/'assets/tcf-listening/v1/audio';out.mkdir(parents=True,exist_ok=True)
 recipe_voices={k:{'modelSha256':hashlib.sha256((models/(k+'.onnx')).read_bytes()).hexdigest(),'speakerId':None,'lengthScale':1.08 if k=='male' else 1.12,'noiseScale':.55,'noiseWScale':.7} for k in ['female','male']}
 voices={k:PiperVoice.load(str(models/(k+'.onnx'))) for k in ['female','male']}
 def speak(text,voice,path):
  config=SynthesisConfig(speaker_id=None,length_scale=1.08 if voice=='male' else 1.12,noise_scale=.55,noise_w_scale=.7)
  with wave.open(str(path),'wb') as wav:voices[voice].synthesize_wav(text,wav,config)
 def convert(source,target):
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','22050','-ac','1','-c:a','libmp3lame','-b:a','64k',str(target)],check=True)
 with tempfile.TemporaryDirectory() as temp:
  temp=Path(temp)
  for q in paper['questions']:
   target=out/f"q-{q['number']:02}.mp3";raw=temp/'combined.wav'
   # A stable hash supports exact, reproducible source-to-recording identity.
   source_hash=hashlib.sha256(json.dumps(q['segments'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
   meta=target.with_suffix('.json')
   recipe={'engine':'Piper1.8.0','sampleRate':22050,'mastering':'loudnormI=-18:TP=-2:LRA=11;mono;mp3-64k','voices':{k:recipe_voices[k] for k in sorted({s['voice'] for s in q['segments']})}}
   if not(target.exists() and meta.exists() and json.loads(meta.read_text()).get('sourceHash')==source_hash and json.loads(meta.read_text()).get('recipe')==recipe):
    with wave.open(str(raw),'wb') as combined:
     combined.setnchannels(1);combined.setsampwidth(2);combined.setframerate(22050);combined.writeframes(b'\0'*int(22050*.35)*2)
     for i,segment in enumerate(q['segments']):
      part=temp/f'part-{i}.wav';speak(segment['text'],segment['voice'],part)
      with wave.open(str(part),'rb') as check:
       needs_resample=check.getframerate()!=22050
      if needs_resample:
       normalized=temp/f'normalized-{i}.wav'
       subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(part),'-ar','22050','-ac','1','-c:a','pcm_s16le',str(normalized)],check=True);part=normalized
      with wave.open(str(part),'rb') as wav:
       assert wav.getframerate()==22050 and wav.getnchannels()==1 and wav.getsampwidth()==2
       combined.writeframes(wav.readframes(wav.getnframes()))
      combined.writeframes(b'\0'*int(22050*(.65 if i<len(q['segments'])-1 else .35))*2)
    convert(raw,target);meta.write_text(json.dumps({'sourceHash':source_hash,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'seconds':round(duration(target),3),'recipe':recipe},indent=2)+'\n')
   q['audio']=target.name;q['audioSeconds']=json.loads(meta.read_text())['seconds'];print(q['number'],q['audioSeconds'],flush=True)
  check=temp/'check.wav';speak('Bienvenue. Vous entendez la voix française du test. Vérifiez le volume de votre casque avant de commencer.','female',check);convert(check,out/'audio-check.mp3')
 # Whole test lasts exactly35min, including recording and response time. Response
 # allowances grow with item difficulty; distribute remainingseconds fairly.
 base=[math.ceil(q['audioSeconds'])+10 for q in paper['questions']];extra=2100-sum(base)
 if extra<0:raise RuntimeError(f'Recordings exceed test budget by {-extra}s')
 weights=[1+i/38 for i in range(39)];alloc=[extra*w/sum(weights) for w in weights]
 slots=[b+int(a) for b,a in zip(base,alloc)];left=2100-sum(slots)
 for i in sorted(range(39),key=lambda i:alloc[i]%1,reverse=True)[:left]:slots[i]+=1
 for q,slot in zip(paper['questions'],slots):q['slotSeconds']=slot
 assert sum(slots)==2100
 latest=json.loads(paper_path.read_text())
 for fresh,built in zip(latest['questions'],paper['questions']):
  if fresh['segments']!=built['segments']:raise RuntimeError('Spoken script changed during synthesis; rerun builder')
  for key in ['audio','audioSeconds','slotSeconds']:fresh[key]=built[key]
 paper=latest
 paper_path.write_text(json.dumps(paper,ensure_ascii=False,indent=2)+'\n')
 manifest={'version':paper['version'],'seconds':2100,'audioSeconds':round(sum(q['audioSeconds'] for q in paper['questions']),3),'files':[{'file':q['audio'],'seconds':q['audioSeconds'],'slotSeconds':q['slotSeconds'],'sha256':hashlib.sha256((out/q['audio']).read_bytes()).hexdigest()} for q in paper['questions']]}
 (out.parent/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--models',type=Path,required=True);build(p.parse_args().models)
