// A release gate, not a claim that automated checks establish editorial quality.
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {choiceStats, imageFingerprint, keyPattern, overlaps, passage, reviewHash, reviewStatus, sha256, sourceHash} from './lib/listening-quality.mjs';

const legacy = process.argv.includes('--legacy');
const media = process.argv.includes('--media');
const exists = async path => access(path).then(() => true, () => false);
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const findings = await read('curriculum/tcf-listening-review/findings.json');
const reviewFile = 'curriculum/tcf-listening-review/reviews.json';
const approvals = await exists(reviewFile) ? await read(reviewFile) : [];

async function select(number) {
  const label = String(number).padStart(2, '0');
  const base = `supabase/exams/tcf-listening-test${label}`;
  const original = await read(base + '.json');
  if (!legacy && await exists(base+'-v4.json'))return {paper:await read(base+'-v4.json'),original,file:base+'-v4.json',state:'independently-evaluated-candidate'};
  if (legacy || number < 3) return {paper: original, original, file: base + '.json', state: 'legacy'};
  for (const revision of [3, 2]) {
    const file = `${base}-v${revision}.json`;
    if (await exists(file)) return {paper: await read(file), original, file, state: 'candidate'};
  }
  const source = `curriculum/tcf-listening-rewrites/test${label}-v2-part1.json`;
  if (await exists(source)) {
    const parts = await Promise.all([1,2].map(k => read(`curriculum/tcf-listening-rewrites/test${label}-v2-part${k}.json`)));
    const questions = parts.flatMap(part => part.questions).map(item => {
      const segments = [{voice:'female',text:`Question ${item.number}.`}];
      if (item.number <= 4) segments.push({voice:'female',text:'Regardez l’image et écoutez les propositions.'});
      if (item.speech) segments.push(...item.speech.split('\n').map(turn => ({voice:turn[0] === 'M' ? 'male':'female',text:turn.slice(2)})));
      if (item.number <= 8) segments.push({voice:'female',text:item.options.map((text,i) => `${'ABCD'[i]}. ${text}`).join(' ')});
      else segments.push({voice:'female',text:item.question});
      return {number:item.number,kind:item.kind,question:item.question,options:item.number<=8?['Proposition A','Proposition B','Proposition C','Proposition D']:item.options,
        correct:'ABCD'[item.answer],explanation:item.why,segments,transcript:segments.map(s=>s.text).join('\n'),audio:`q-${String(item.number).padStart(2,'0')}.mp3`,
        slotSeconds:original.questions[item.number-1].slotSeconds,audioSeconds:null,...(item.number<=4?{image:`q-${String(item.number).padStart(2,'0')}.svg`,scene:item.scene}:{})};
    });
    return {paper:{id:original.id,title:original.title,seconds:2100,version:parts[0].version,questions},original,file:source.replace('part1','part{1,2}'),state:'unrecorded-source'};
  }
  return {paper:original,original,file:base+'.json',state:'legacy-needs-rewrite'};
}

const selected = await Promise.all(Array.from({length:20},(_,i) => select(i+1)));
const reports = [], items = [], fingerprints = new Map(), audioHashes = new Map();
for (const {paper,original,file,state} of selected) {
  const number = Number(paper.id.slice(-2)), affected = true;
  const violations = [], questions = [], add = (kind,question,detail) => violations.push({kind,question,detail});
  if(state==='independently-evaluated-candidate') {
    try{execFileSync('node',['scripts/check-listening-answer-quality.mjs','--bank',file],{stdio:'pipe'});}
    catch(error){add('independent-answer-qc',null,'Blind, grounding, paper or frozen-cohort evidence is missing/stale.');}
  } else add('independent-answer-qc',null,'Historical bank has not passed the new independent answer-quality protocol.');
  if (paper.questions.length !== 39 || paper.seconds !== 2100 || paper.questions.reduce((sum,q)=>sum+q.slotSeconds,0)!==2100)
    add('structure',null,'Exactly 39 questions and 2100 seconds required.');
  const root = join('assets/tcf-listening',paper.version === 'tcf-listening-2026-11-v1' ? 'v1' : paper.version);
  const manifestFile = join(root,'manifest.json');
  const manifest = await exists(manifestFile) ? await read(manifestFile) : null;
  if (!manifest || manifest.version !== paper.version || manifest.files?.length !== 39) add('manifest',null,'Matching 39-recording manifest required.');
  let longest = 0, uniqueLongest = 0, longestCredit = 0, shortestCredit=0, written = 0, checkedMedia = 0;
  let maxRatio = 0, changedSlots = 0;
  const pattern = keyPattern(paper.questions);
  if(Math.max(...Object.values(pattern.counts))-Math.min(...Object.values(pattern.counts))>1)
    add('unbalanced-key',null,'Whole-paper A–D counts must differ by at most one.');
  if (pattern.suspiciousFourItemDeck) add('predictable-key',null,`${pattern.permutationBlocks}/${pattern.blocks} four-question blocks contain every answer letter exactly once.`);
  for (const [i,q] of paper.questions.entries()) {
    const id = `${paper.id}/${q.number}`;
    if (q.number !== i+1 || q.kind !== original.questions[i]?.kind) add('order',q.number,'Original number and genre order required.');
    if (q.transcript !== q.segments?.map(s=>s.text).join('\n')) add('script',q.number,'Transcript differs from spoken segments.');
    const stats = choiceStats(q);
    if (!stats.valid) add('choices',q.number,'Four distinct choices and one A–D key required.');
    if (q.number >= 9 && stats.valid) {
      written++; longest+=Number(stats.correctLongest); uniqueLongest+=Number(stats.uniqueCorrectLongest); longestCredit+=stats.longestCredit;
      shortestCredit+=stats.shortestCredit;
      maxRatio=Math.max(maxRatio,stats.ratio);
      // New policy checks exploitable length advantages across the library and
      // wording with a blind evaluator; equal lengths are not a quality target.
      if (state!=='independently-evaluated-candidate' && stats.ratio > 1.35) add('choice-length',q.number,`Historical character length ratio ${stats.ratio.toFixed(2)} requires review.`);
    }
    if (q.slotSeconds !== original.questions[i]?.slotSeconds) {
      changedSlots++;
      add('changed-timing',q.number,`Slot ${q.slotSeconds}s; historical ${original.questions[i]?.slotSeconds}s. Content must fit the established slots.`);
    }
    if (!(q.audioSeconds > 0) || q.audioSeconds + 12 > q.slotSeconds) add('response-window',q.number,'Complete audio plus at least the existing 12-second minimum must fit.');
    const bytesFile = join(root,'audio',q.audio);
    const recording = manifest?.files?.find(m=>m.file === q.audio);
    const existsAudio = await exists(bytesFile);
    let audioHash = null;
    if (existsAudio) {
      const bytes = await readFile(bytesFile); audioHash=sha256(bytes);
      if (!recording || recording.sha256 !== audioHash || bytes.length <= 1000) add('audio-integrity',q.number,'Missing/wrong MP3 or manifest SHA-256.');
      if (recording?.sourceHash && recording.sourceHash !== sourceHash(q.segments)) add('stale-recording',q.number,'Recording source hash differs from current speaker segments.');
      if (recording && Math.abs(recording.seconds-q.audioSeconds)>0.01) add('duration-metadata',q.number,'Manifest duration differs from bank.');
      if (audioHashes.has(audioHash)) add('reused-recording',q.number,`Same audio bytes as ${audioHashes.get(audioHash)}.`);
      else audioHashes.set(audioHash,id);
      if (media) {
        try {
          const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',bytesFile],{encoding:'utf8'}));
          execFileSync('ffmpeg',['-v','error','-xerror','-i',bytesFile,'-f','null','-'],{stdio:'pipe'});
          if (!Number.isFinite(duration) || Math.abs(duration-q.audioSeconds)>0.25 || duration+12>q.slotSeconds) add('measured-duration',q.number,`Decoded ${duration}s does not fit recorded duration/response window.`);
          else checkedMedia++;
        } catch(error) {add('audio-decode',q.number,String(error.message).slice(0,250));}
      }
    } else add('missing-audio',q.number,bytesFile);
    let imageHash = null;
    if (q.number <= 4) {
      const imageFile=join(root,'images',q.image ?? 'missing');
      if (await exists(imageFile)) {
        const svg=await readFile(imageFile,'utf8');imageHash=sha256(svg);
        const fingerprint=imageFingerprint(svg);
        if (fingerprints.has(fingerprint)) add('reused-picture',q.number,`Geometry duplicates ${fingerprints.get(fingerprint)} after stripping labels/colors.`);
        else fingerprints.set(fingerprint,id);
      } else add('missing-picture',q.number,imageFile);
    } else if(q.image) add('unexpected-picture',q.number,'Keep the established four introductory picture items.');
    for (const finding of findings) if (finding.tests.includes(number) && finding.questions.includes(q.number) && (!finding.versions || finding.versions.includes(paper.version)))
      add('editorial',q.number,`${finding.id}: ${finding.reason}`);
    const hash=reviewHash(q);
    const {review:approval,pending}=reviewStatus(q,paper.version,audioHash,imageHash,approvals);
    if (pending.length && affected) add('unreviewed',q.number,`Evidence-bound editorial review pending: ${pending.join(', ')}.`);
    questions.push({number:q.number,kind:q.kind,contentHash:hash,audioHash,imageHash,hasAudio:existsAudio,scene:q.scene??null,
      choices:q.number>=9?stats:null,correct:q.correct,review:approval??null,pendingCriteria:pending});
    items.push({id,text:passage(q)});
  }
  if (written && longestCredit/written > 0.4) add('longest-answer-strategy',null,`Longest-choice success ${(100*longestCredit/written).toFixed(1)}%; chance is 25%.`);
  if (written && shortestCredit/written > 0.4) add('shortest-answer-strategy',null,`Shortest-choice success ${(100*shortestCredit/written).toFixed(1)}%; chance is 25%.`);
  reports.push({test:paper.id,version:paper.version,source:file,state,affected,questionCount:paper.questions.length,
    verifiedForRelease:false,answerPositions:pattern,metrics:{writtenChoices:written,correctLongest:longest,uniqueCorrectLongest:uniqueLongest,
      longestChoiceCredit:longestCredit,shortestChoiceCredit:shortestCredit,maxOptionRatio:maxRatio,changedSlots,decodedRecordings:checkedMedia,
      existingRecordings:questions.filter(q=>q.hasAudio).length,existingPictures:questions.filter(q=>q.imageHash).length},questions,violations});
}
const transcriptOverlaps=overlaps(items);
for (const match of transcriptOverlaps) for (const side of ['left','right']) {
  const [test,number]=match[side].split('/');
  const report=reports.find(r=>r.test===test);
  report.violations.push({kind:'repeated-transcript',question:Number(number),detail:match});
}
for (const report of reports) report.verifiedForRelease = report.affected && report.violations.length===0 && media;
const affected=reports.filter(r=>r.affected);
const output={mode:legacy?'legacy':'best-existing-candidates',mediaDecoded:media,
  automatedChecksDoNotEstablishSemanticQuality:true,scope:{tests:20,questions:780,pictures:80},
  coverage:{selectedQuestions:affected.reduce((s,r)=>s+r.questionCount,0),existingRecordings:affected.reduce((s,r)=>s+r.metrics.existingRecordings,0),
    existingPictures:affected.reduce((s,r)=>s+r.metrics.existingPictures,0),decodedRecordings:affected.reduce((s,r)=>s+r.metrics.decodedRecordings,0),
    fullyVerifiedTests:affected.filter(r=>r.verifiedForRelease).length},transcriptOverlaps,results:reports};
await mkdir('reports',{recursive:true});
const destination=`reports/tcf-listening-${legacy?'legacy':'candidate'}-qa.json`;
await writeFile(destination,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({report:destination,...output.coverage}));
for (const result of affected) console.log(result.test,result.version,result.verifiedForRelease?'VERIFIED':'BLOCKED',JSON.stringify(result.metrics));
if (affected.some(r=>!r.verifiedForRelease)) process.exitCode=1;
