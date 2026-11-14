"""Record only explicitly pending draft clips; never overwrite existing audio.
Offline Piper/FFmpeg, with pinned model hashes and the historical clock untouched.
"""
import argparse, hashlib, json, subprocess, tempfile, wave
from pathlib import Path
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[1]
MODELS = {
    'female': ('fr_FR-siwis-medium', 'b1d946fd68d0347155fa59bce0a018924abbef3c1561181db45ca463d83963ef'),
    'male': ('fr_FR-tom-medium', 'bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41'),
    'female_alt': ('fr_FR-upmc-medium', '9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f'),
    'male_alt': ('fr_FR-upmc-medium', '9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f'),
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def render(models, number):
    if number not in (3, 4, 5, 6):
        raise ValueError('Only the explicitly prepared Test03–06 v3 candidates are supported')
    bank = ROOT / f'supabase/exams/tcf-listening-test{number:02d}-v3.json'
    paper = json.loads(bank.read_text())
    root = ROOT / 'assets/tcf-listening' / paper['version']
    manifest_path = root / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    original = json.loads((ROOT / f'supabase/exams/tcf-listening-test{number:02d}.json').read_text())
    assert [q['slotSeconds'] for q in paper['questions']] == [q['slotSeconds'] for q in original['questions']]
    assert sum(q['slotSeconds'] for q in paper['questions']) == 2100
    voices = {}
    loaded = {}
    for gender, (name, expected) in MODELS.items():
        model = models / (name + '.onnx')
        if digest(model) != expected:
            raise ValueError('Model integrity mismatch: ' + name)
        if name not in loaded:
            loaded[name] = PiperVoice.load(str(model))
        voices[gender] = loaded[name]
    for q, entry in zip(paper['questions'], manifest['files']):
        if entry.get('status') != 'RERECORD_REQUIRED':
            continue
        target = root / 'audio' / q['audio']
        if target.exists():
            raise ValueError('Refusing to replace existing audio: ' + str(target))
        with tempfile.TemporaryDirectory() as tmp:
            temp = Path(tmp)
            combined = temp / 'combined.wav'
            with wave.open(str(combined), 'wb') as joined:
                joined.setnchannels(1)
                joined.setsampwidth(2)
                joined.setframerate(22050)
                joined.writeframes(b'\0' * int(22050 * 0.3) * 2)
                for index, segment in enumerate(q['segments']):
                    part = temp / f'{index}.wav'
                    # Explicit editorial speaker identity wins. A character's
                    # voice never depends on the number/order of adjacent turns.
                    profile = segment.get('speaker', segment['voice'])
                    if profile not in voices or profile.split('_')[0] != segment['voice']:
                        raise ValueError('Invalid speaker profile: ' + str(profile))
                    speaker_id = 0 if profile == 'female_alt' else 1 if profile == 'male_alt' else None
                    with wave.open(str(part), 'wb') as output:
                        voices[profile].synthesize_wav(segment['text'], output,
                            SynthesisConfig(speaker_id=speaker_id, length_scale=1.08, noise_scale=0.55, noise_w_scale=0.7))
                    normalized = temp / f'{index}-normalized.wav'
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(part), '-ar', '22050', '-ac', '1',
                                    '-c:a', 'pcm_s16le', str(normalized)], check=True)
                    with wave.open(str(normalized), 'rb') as source:
                        joined.writeframes(source.readframes(source.getnframes()))
                    joined.writeframes(b'\0' * int(22050 * 0.4) * 2)
            clip = temp / 'candidate.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(combined), '-af', 'loudnorm=I=-18:TP=-2:LRA=11',
                            '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', str(clip)], check=True)
            seconds = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                                    '-of', 'default=noprint_wrappers=1:nokey=1', str(clip)]))
            if seconds + 12 > q['slotSeconds']:
                raise ValueError(f"Q{q['number']} takes {seconds}s; rewrite before recording, never change its slot")
            target.write_bytes(clip.read_bytes())
            q['audioSeconds'] = round(seconds, 3)
            entry.clear()
            entry.update(file=q['audio'], seconds=q['audioSeconds'], sha256=digest(target),
                         sourceHash=hashlib.sha256(json.dumps(q['segments'], ensure_ascii=False, sort_keys=True).encode()).hexdigest())
            # Persist each successful clip, so an interrupted run can resume
            # without recreating recordings that already meet these checks.
            bank.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + '\n')
            manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
            print(f"Recorded Q{q['number']}: {seconds:.3f}s in unchanged {q['slotSeconds']}s slot", flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--models', type=Path, required=True)
    parser.add_argument('--test', type=int, required=True)
    args = parser.parse_args()
    render(args.models, args.test)
