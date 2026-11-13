"""Embed the reviewed, timed listening bank in its CLI-created additive migration."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILE='20261113171848_tcf_listening_test01.sql'
paper=json.loads((ROOT/'supabase/exams/tcf-listening-test01.json').read_text())
assert paper['id']=='tcf-listening-01' and paper['version']=='tcf-listening-2026-11-v1'
assert paper['seconds']==2100 and len(paper['questions'])==39
assert sum(q['slotSeconds'] for q in paper['questions'])==2100
for i,q in enumerate(paper['questions'],1):
 assert q['number']==i and len(q['options'])==4 and q['correct'] in 'ABCD'
 assert 0<q['audioSeconds']<q['slotSeconds'] and q['audio']==f'q-{i:02}.mp3'
path=ROOT/'supabase/migrations'/FILE
parts=path.read_text().split('$paper$');assert len(parts)==3
parts[1]=json.dumps(paper,ensure_ascii=False,indent=2)
path.write_text('$paper$'.join(parts))
print('Embedded exact39question bank with2100second timeline into '+FILE)
