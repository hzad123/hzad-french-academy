import {readFile} from 'node:fs/promises';import {join} from 'node:path';
import {loadJson,hash,contentHash} from './lib/listening-answer-qc.mjs';
import {assertCohort,assertPaper,protocol} from './lib/listening-contrast-quality.mjs';
import {sourceHash} from './lib/listening-quality.mjs';import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
if(!args.includes('--bank')||!args.includes('--evidence'))throw Error('Exact bank and evidence required');
const paper=await loadJson(get('--bank')),root=get('--evidence'),evidence=await loadJson(join(root,'evidence.json')),cohort=await loadJson(join(root,'cohort.json'));
const originals=await Promise.all(cohort.papers.map(m=>loadJson(m.evidence.source)));assertCohort(cohort,originals);
const index=Number(paper.id.slice(-2))-1,member=cohort.papers[index];
if(member.paper.version!==paper.version||hash(member.paper.questions.map(contentHash))!==hash(paper.questions.map(contentHash))||hash(evidence)!==hash(member.evidence))throw Error('Bank is not the frozen accepted version');
const images={};for(const q of paper.questions.slice(0,4)){
 const bytes=await readFile(join('assets/tcf-listening',paper.version,'images',q.image)),data='data:image/png;base64,'+(await readFile(join(root,'images',`q-${String(q.number).padStart(2,'0')}.png`))).toString('base64');
 images[q.number]={hash:hash(bytes),data};if(hash(images[q.number])!==hash(member.images[q.number]))throw Error('Displayed/evaluated image changed');
}
assertPaper(paper,evidence,originals[index],images);
if(args.includes('--media')){
 const assets=join('assets/tcf-listening',paper.version),manifest=await loadJson(join(assets,'manifest.json'));
 if(manifest.version!==paper.version||manifest.state!=='MEDIA_VERIFIED'||manifest.files.length!==39)throw Error('Incomplete media');
 for(const q of paper.questions){
  const file=join(assets,'audio',q.audio),entry=manifest.files.find(e=>e.file===q.audio),seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}));
  if(!entry||entry.sourceHash!==sourceHash(q.segments)||entry.sha256!==hash(await readFile(file))||!Number.isFinite(seconds)||seconds<=0||Math.abs(seconds-q.audioSeconds)>.01||Math.abs(seconds-entry.seconds)>.01||seconds+12>q.slotSeconds)throw Error('Stale or mistimed recording: '+q.number);
 }
}
console.log(protocol+': blind, unique key, whole-paper and frozen late/written cohort checks passed for '+paper.id);
