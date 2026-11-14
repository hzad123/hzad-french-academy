"""Offline original TCF listening test listening audio generation. Not a runtime API.
Generates 39 real MP3 recordings from the authored French scripts using
licensed Piper voices, then creates the completed immutable paper and manifest.
This is not a substitute for listening to the outputs and checking French QA.
"""
import hashlib,json,math,subprocess,tempfile,wave
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[1]
PAPER=None
OUT=None
PUBLISHED=None
def metadata(path):
 return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)]))
def render(models,test_number):
 raise RuntimeError('Historical recording path retired. Use render-listening-qc-media.py with accepted independent AI evidence and a new immutable version.')
 global PAPER,OUT,PUBLISHED
 if test_number<3 or test_number>20:raise ValueError('Only tests 03 through 20 are supported')
 label=f'{test_number:02d}'
 PAPER=ROOT/f'curriculum/tcf-listening-build/test{label}-audio-pending.json'
 OUT=ROOT/f'assets/tcf-listening/tcf-listening-2026-11-test{label}-v1/audio'
 PUBLISHED=ROOT/f'supabase/exams/tcf-listening-test{label}.json'
 paper=json.loads(PAPER.read_text())
 assert paper['id']==f'tcf-listening-{label}' and len(paper['questions'])==39
 OUT.mkdir(parents=True,exist_ok=True)
 names=['fr_FR-siwis-medium','fr_FR-tom-medium','fr_FR-upmc-medium']
 loaded={n:PiperVoice.load(str(models/(n+'.onnx'))) for n in names}
 profiles={
  'female':(names[0],None),
  'male':(names[1],None),
  'female_alt':(names[2],0),
  'male_alt':(names[2],1)
 }
 def synth(text,voice,path):
  name,speaker=profiles[voice]
  with wave.open(str(path),'wb') as dest:
   loaded[name].synthesize_wav(text,dest,SynthesisConfig(speaker_id=speaker,length_scale=1.08,noise_scale=0.55,noise_w_scale=0.7))
 def normalize(src,dst):
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-ar','22050','-ac','1','-c:a','pcm_s16le',str(dst)],check=True)
 voice_hashes={n:hashlib.sha256((models/(n+'.onnx')).read_bytes()).hexdigest() for n in names}
 manifest=[]
 with tempfile.TemporaryDirectory() as tmp:
  temp=Path(tmp)
  for q in paper['questions']:
   number=q['number'];target=OUT/q['audio'];raw=temp/'combined.wav'
   with wave.open(str(raw),'wb') as joined:
    joined.setnchannels(1);joined.setsampwidth(2);joined.setframerate(22050)
    joined.writeframes(b'\0'*int(22050*0.3)*2)
    use_alt=False
    for i,segment in enumerate(q['segments']):
     gender=segment['voice']
     # Multi-speaker discussions use up to four distinct French timbres.
     if len(q['segments'])>4 and i>1 and gender in ('male','female'):
      use_alt=not use_alt;gender=gender+'_alt' if use_alt else gender
     raw_part=temp/f'part-{i}.wav';part=temp/f'norm-{i}.wav'
     synth(segment['text'],gender,raw_part)
     normalize(raw_part,part)
     with wave.open(str(part),'rb') as wavepart:
      assert wavepart.getframerate()==22050 and wavepart.getnchannels()==1 and wavepart.getsampwidth()==2
      joined.writeframes(wavepart.readframes(wavepart.getnframes()))
     joined.writeframes(b'\0'*int(22050*(0.5 if i<len(q['segments'])-1 else 0.25))*2)
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','22050','-ac','1','-c:a','libmp3lame','-b:a','64k',str(target)],check=True)
   q['audioSeconds']=round(metadata(target),3)
   manifest.append({'file':q['audio'],'seconds':q['audioSeconds'],'sourceHash':hashlib.sha256(json.dumps(q['segments'],ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
   print('Rendered',number,'duration',q['audioSeconds'],flush=True)
 # Preserve the original fixed 35-minute clock. Assign enough time to hear
 # each complete recording and select an answer; never shorten the exam.
 original=[q['slotSeconds'] for q in paper['questions']]
 if all(q['audioSeconds']+12<=slot for q,slot in zip(paper['questions'],original)):
  slots=original
 else:
  base=[math.ceil(q['audioSeconds'])+12 for q in paper['questions']]
  extra=2100-sum(base)
  if extra<0:raise RuntimeError('Full recordings and minimum answer windows exceed 35 minutes; shorten scripts, do not truncate sound')
  weights=[1+i/38 for i in range(39)]
  quotas=[extra*w/sum(weights) for w in weights]
  slots=[b+int(v) for b,v in zip(base,quotas)]
  remaining=2100-sum(slots)
  for i in sorted(range(39),key=lambda i:quotas[i]%1,reverse=True)[:remaining]:slots[i]+=1
 for q,slot in zip(paper['questions'],slots):
  q['slotSeconds']=slot
  if slot<q['audioSeconds']+12:raise RuntimeError('Question '+str(q['number'])+' has too little response time')
 assert sum(slots)==2100
 PUBLISHED.parent.mkdir(parents=True,exist_ok=True)
 PUBLISHED.write_text(json.dumps(paper,ensure_ascii=False,indent=2)+'\n')
 (OUT.parent/'manifest.json').write_text(json.dumps({'version':paper['version'],'seconds':2100,'voices':voice_hashes,'files':manifest},indent=2)+'\n')
 print('Prepared immutable Test02 bank, media and manifest; editorial listening QA still required.')
if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('--models',type=Path,required=True);parser.add_argument('--test',type=int,required=True)
 args=parser.parse_args();render(args.models,args.test)
