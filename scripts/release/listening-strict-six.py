"""Read status or publish exact accepted listening banks through trusted Actions.
No inference, student login, server-key extraction, or accounting changes.
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'work/listening-strict-release'
PAGES = 'https://hzad123.github.io/hzad-french-academy/'
SPEC = importlib.util.spec_from_file_location('management', Path(__file__).with_name('tcf-marking.py'))
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


def save(name, data):
    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / name).write_text(json.dumps(data, indent=2) + '\n')


def catalog():
    return HELPER.query("""select v.test_id,v.version,md5(p.content::text) content_md5,
      jsonb_array_length(p.content->'questions') questions,
      (p.content->>'seconds')::integer seconds
      from academy_tcf_listening.published v
      join academy_tcf_listening.papers p on p.id=v.test_id and p.version=v.version
      order by v.test_id""")


def validate_source(path):
    match = re.fullmatch(r'supabase/migrations/(\d+)_tcf_listening_01_06_strict_v(\d+)\.sql', path)
    if not match or int(match[2]) < 5:
        raise RuntimeError('Use the reviewed CLI-created strict listening migration')
    source = (ROOT / path).read_text()
    chunks = source.split('$six_papers$')
    if len(chunks) != 3:
        raise RuntimeError('Unexpected publication payload')
    papers = [json.loads((ROOT / f'supabase/exams/tcf-listening-test{n:02}-v{match[2]}.json').read_text())
              for n in range(1, 7)]
    if json.loads(chunks[1]) != papers:
        raise RuntimeError('Migration and exact accepted banks differ')
    verify = """import {readFile} from 'node:fs/promises';
import {publicationSQL6} from './scripts/release/listening-01-06-v4.mjs';
import {strictProtectedTables} from './scripts/release/listening-owner-review.mjs';
const source=await readFile(process.argv[1],'utf8'),papers=JSON.parse(source.split('$six_papers$')[1]);
if(source!==publicationSQL6(papers,strictProtectedTables,{revision:Number(process.argv[2])}))throw Error('Publication SQL differs from the reviewed generator');"""
    subprocess.run(['node', '--input-type=module', '-e', verify, path, match[2]], cwd=ROOT, check=True)
    for table in ['academy_tef_writing.attempts', 'academy_tef_speaking.attempts', 'academy_tef_speaking.calls']:
        if source.count('from ' + table + ' t)') != 2:
            raise RuntimeError('Latest TEF history preservation guards missing')
    subprocess.run(['node', 'scripts/check-listening-six-release.mjs', '--require-replacements'], cwd=ROOT, check=True)
    return match[1], source, papers


def hosted_files(papers, commit):
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise RuntimeError('Exact deployed commit required')
    with urlopen(PAGES + '?deployment=' + commit, timeout=30) as response:
        if commit not in response.read().decode():
            raise RuntimeError('The reviewed development commit is not served yet')
    files = [Path('assets/tcf-listening/v1/audio/audio-check.mp3')]
    for paper in papers:
        assets = Path('assets/tcf-listening') / paper['version']
        files += [assets / 'manifest.json', assets / 'AUDIO-LICENSES.md']
        for question in paper['questions']:
            files.append(assets / 'audio' / question['audio'])
            if question.get('image'):
                files.append(assets / 'images' / question['image'])

    def check(path):
        request = Request(PAGES + path.as_posix() + '?deployment=' + commit,
                          headers={'User-Agent': 'HZad-strict-listening-release'})
        with urlopen(request, timeout=45) as response:
            data = response.read()
        digest = hashlib.sha256(data).hexdigest()
        return {'path': path.as_posix(), 'bytes': len(data), 'sha256': digest,
                'match': digest == hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, files))
    save('hosted-media.json', {'commit': commit, 'results': results})
    if len(results) != 271 or not all(row['match'] for row in results):
        raise RuntimeError('All 271 hosted release files must match before activation')
    print('All 271 hosted files match the accepted release bytes.')


def publish(path, commit):
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('GITHUB_REF_NAME') != 'development':
        raise RuntimeError('Activation requires the merged development revision in trusted Actions')
    version, source, papers = validate_source(path)
    hosted_files(papers, commit)
    before = catalog()
    for paper in papers:
        evidence = json.loads((ROOT / 'curriculum/tcf-listening-answer-qc' / paper['version'] / 'evidence.json').read_text())
        live = next((row for row in before if row['test_id'] == paper['id']), None)
        if not live or live['version'] not in [evidence['sourceVersion'], paper['version']]:
            raise RuntimeError('Current publication changed; refusing an unexpected replacement or downgrade')
    recorded = HELPER.query('select statements from supabase_migrations.schema_migrations where version=' + HELPER.literal(version))
    if recorded and recorded[0]['statements'] != [source]:
        raise RuntimeError('Recorded migration differs')
    history = '' if recorded else (
        'insert into supabase_migrations.schema_migrations(version,name,statements) values(' +
        HELPER.literal(version) + ',' + HELPER.literal(Path(path).stem.split('_', 1)[1]) +
        ',array[' + HELPER.literal(source) + ']);')
    # The reviewed SQL takes same-transaction hashes of all old papers,
    # attempts, auth, progress, accounting, both TEF modules and engine code.
    for ending in ['rollback;', 'commit;']:
        HELPER.query('begin isolation level repeatable read;\n' + source + '\n' + history + '\n' + ending)
        print('Preservation-checked publication ' + ('rehearsed.' if ending == 'rollback;' else 'committed.'))
    actual = HELPER.query("select id,content from academy_tcf_listening.papers where version in (" +
                          ','.join(HELPER.literal(p['version']) for p in papers) + ') order by id')
    if [row['content'] for row in actual] != papers:
        raise RuntimeError('Exact live banks differ from reviewed source')
    after = catalog()
    expected = {row['test_id']: row['version'] for row in before}
    expected.update({paper['id']: paper['version'] for paper in papers})
    if {row['test_id']: row['version'] for row in after} != expected:
        raise RuntimeError('Post-publication catalog differs')
    save('publication.json', {'commit': commit, 'migration': path, 'before': before, 'after': after,
                              'hostedFilesVerified': 271, 'preservationRehearsed': True})
    print('Six exact listening replacements are live; all previous student history is preserved.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['status', 'publish'], default='status')
    parser.add_argument('--migration', default='')
    parser.add_argument('--commit', default='')
    args = parser.parse_args()
    if args.mode == 'publish':
        publish(args.migration, args.commit)
    else:
        current = catalog()
        save('status.json', {'catalog': current})
        print(json.dumps({'catalog': current}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('::error title=Strict listening release stopped::' +
              (str(error) if isinstance(error, RuntimeError) else type(error).__name__ + '; private details withheld'))
        sys.exit(1)
