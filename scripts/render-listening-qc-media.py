"""Record accepted offline-QC candidates without altering historical media/clocks.
No AI calls. Piper/FFmpeg are local authoring tools, never a student expense.
"""
import argparse,hashlib,json,shutil,subprocess,tempfile,wave
from pathlib import Path
from piper import PiperVoice,SynthesisConfig
ROOT=Path(__file__).resolve().parents[1]
MODELS={'female':('fr_FR-siwis-medium',None,'b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef'),
        'male':('fr_FR-tom-medium',None,'bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41'),
        'female_alt':('fr_FR-upmc-medium',0,'9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f'),
        'male_alt':('fr_FR-upmc-medium',1,'9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f')}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def source_hash(q):return hashlib.sha256(json.dumps(q['segments'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)]))
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def render(root,models):
 summary=json.loads((root/'summary.json').read_text())
 if not summary.get('readyForMedia'):raise RuntimeError('Independent answer QC/held-out cohort has not passed')
 voices={};loaded={}
 for profile,(name,speaker,expected) in MODELS.items():
  model=models/(name+'.onnx')
  if digest(model)!=expected:raise RuntimeError('French model integrity mismatch: '+name)
  if name not in loaded:loaded[name]=PiperVoice.load(str(model))
  voices[profile]=(loaded[name],speaker)
 for number in summary['tests']:
  folder=root/f'test{number:02d}';bank=json.loads((folder/'bank.json').read_text());source=json.loads((ROOT/json.loads((folder/'evidence.json').read_text())['source']).read_text())
  if bank['version']==source['version']:raise RuntimeError('New immutable version required')
  source_root=ROOT/'assets/tcf-listening'/('v1' if source['version']=='tcf-listening-2026-11-v1' else source['version'])
  output=ROOT/'assets/tcf-listening'/bank['version'];proof=ROOT/'curriculum/tcf-listening-answer-qc'/bank['version']
  output.mkdir(parents=True,exist_ok=True);(output/'audio').mkdir(exist_ok=True);(output/'images').mkdir(exist_ok=True)
  proof.mkdir(parents=True,exist_ok=True)
  for name in ['evidence.json']:shutil.copyfile(folder/name,proof/name)
  shutil.copyfile(root/'summary.json',proof/'cohort.json');shutil.copytree(folder/'images',proof/'images',dirs_exist_ok=True)
  for q in bank['questions'][:4]:shutil.copyfile(source_root/'images'/q['image'],output/'images'/q['image'])
  subprocess.run(['node','scripts/check-listening-answer-quality.mjs','--bank',str(folder/'bank.json'),'--evidence',str(proof)],cwd=ROOT,check=True)
  destination=ROOT/f'supabase/exams/tcf-listening-test{number:02d}-v4.json'
  if destination.exists() and subprocess.run(['git','ls-files','--error-unmatch',str(destination.relative_to(ROOT))],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
   raise RuntimeError('Refusing to overwrite a tracked immutable v4 bank')
  old_manifest=json.loads((output/'manifest.json').read_text()) if (output/'manifest.json').exists() else {'files':[]}
  entries={entry['file']:entry for entry in old_manifest['files']};manifest=[]
  for q,old in zip(bank['questions'],source['questions']):
   if q['number']!=old['number'] or q['kind']!=old['kind'] or q['slotSeconds']!=old['slotSeconds']:raise RuntimeError('Historical format/clock changed')
   target=output/'audio'/q['audio'];existing=entries.get(q['audio']);spoken_hash=source_hash(q)
   if target.exists() and existing and existing.get('sourceHash')==spoken_hash and existing.get('sha256')==digest(target):
    q['audioSeconds']=round(duration(target),3);entry=existing
   elif q['segments']==old['segments']:
    shutil.copyfile(source_root/'audio'/q['audio'],target);q['audioSeconds']=round(duration(target),3)
    entry={'file':q['audio'],'sourceHash':spoken_hash,'sha256':digest(target),'seconds':q['audioSeconds'],'retainedFrom':source['version']}
   else:
    # All sentences are synthesized in full. Try modest natural-rate changes
    # if needed; never clip speech or redistribute per-question answer windows.
    complete=False
    for rate in [1.08,1.0,0.96]:
     with tempfile.TemporaryDirectory() as tmp:
      temp=Path(tmp);joined_file=temp/'combined.wav'
      with wave.open(str(joined_file),'wb') as joined:
       joined.setnchannels(1);joined.setsampwidth(2);joined.setframerate(22050);joined.writeframes(b'\0'*int(22050*.25)*2)
       for i,segment in enumerate(q['segments']):
        profile=segment.get('speaker',segment['voice'])
        if profile not in voices:raise RuntimeError('Unsupported explicit speaker profile')
        voice,speaker=voices[profile];part=temp/f'{i}.wav';normalized=temp/f'{i}-normalized.wav'
        with wave.open(str(part),'wb') as wav:voice.synthesize_wav(segment['text'],wav,SynthesisConfig(speaker_id=speaker,length_scale=rate,noise_scale=.55,noise_w_scale=.7))
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(part),'-ar','22050','-ac','1','-c:a','pcm_s16le',str(normalized)],check=True)
        with wave.open(str(normalized),'rb') as wav:joined.writeframes(wav.readframes(wav.getnframes()))
        joined.writeframes(b'\0'*int(22050*.35)*2)
      clip=temp/'clip.mp3';subprocess.run(['ffmpeg','-v','error','-y','-i',str(joined_file),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','22050','-ac','1','-c:a','libmp3lame','-b:a','64k',str(clip)],check=True)
      seconds=duration(clip)
      if seconds+12<=q['slotSeconds']:
       shutil.copyfile(clip,target);q['audioSeconds']=round(seconds,3)
       entry={'file':q['audio'],'sourceHash':spoken_hash,'sha256':digest(target),'seconds':q['audioSeconds'],'lengthScale':rate};complete=True;break
    if not complete:raise RuntimeError(f"Test{number:02d} Q{q['number']} needs shorter wording, not a changed clock")
   if q['audioSeconds']+12>q['slotSeconds']:raise RuntimeError('Audio/response window does not fit')
   subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(target),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   manifest.append(entry);write(output/'manifest.json',{'version':bank['version'],'seconds':2100,'files':manifest,'state':'BUILDING' if len(manifest)<39 else 'MEDIA_VERIFIED'})
  if len(manifest)!=39 or sum(q['slotSeconds'] for q in bank['questions'])!=2100:raise RuntimeError('Incomplete paper')
  shutil.copyfile(source_root/'AUDIO-LICENSES.md',output/'AUDIO-LICENSES.md')
  write(destination,bank);print(f'Test{number:02d}:39 complete matched recordings in unchanged slots; independent answer QC retained.',flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);parser.add_argument('--models',type=Path,required=True);args=parser.parse_args();render(args.root,args.models)
