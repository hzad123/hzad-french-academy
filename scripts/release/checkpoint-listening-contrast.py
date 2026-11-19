"""Publish aggregate authoring progress only; never activate an exam or log keys."""
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
BRANCH = 'fix/listening-six-blind-cues-v5'


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def main():
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('GITHUB_REF_NAME') != BRANCH:
        return
    data = json.loads((ROOT / sys.argv[1]).read_text())
    # An allowlist prevents source text, credentials or student data entering
    # this small progress report even if a caller passes the wrong JSON file.
    report = {key: data[key] for key in ['runId', 'sourceCommit', 'updatedAt', 'completed', 'total', 'papers']}
    report['papers'] = [{key: p[key] for key in ['test', 'reviewed', 'accepted', 'lateAccepted']}
                        for p in report['papers']]
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('fetch', 'origin', BRANCH)
    git('rebase', 'origin/' + BRANCH)
    target = ROOT / 'reports/listening-answer-qc-latest/live-progress.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + '\n')
    git('add', str(target.relative_to(ROOT)))
    if git('diff', '--cached', '--name-only').stdout.strip():
        git('commit', '-m', 'Checkpoint aggregate listening review progress [skip ci]')
        git('push', 'origin', 'HEAD:' + BRANCH)
    print('Saved aggregate listening review progress; candidates remain unpublished.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Aggregate checkpoint unavailable; actual model results remain in the job cache/artifact.', flush=True)
