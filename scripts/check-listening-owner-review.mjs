import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadJson,hash} from './lib/listening-answer-qc.mjs';
import {sourceHash} from './lib/listening-quality.mjs';
import {assertReviewAuthorization,assertReviewPaper} from './lib/listening-owner-review.mjs';
const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
if(!args.includes('--bank')||!args.includes('--evidence'))throw Error('Exact recorded bank and owner-review evidence required');
const paper=await loadJson(get('--bank')),root=get('--evidence'),evidence=await loadJson(join(root,'evidence.json'));
assertReviewAuthorization(await loadJson(join(root,'review-release.json')));
const original=await loadJson(evidence.source),images={},assets=join('assets/tcf-listening',paper.version);
for(const q of paper.questions.slice(0,4)){
 const bytes=await readFile(join(assets,'images',q.image));
 const sourceAssets=join('assets/tcf-listening',original.version==='tcf-listening-2026-11-v1'?'v1':original.version);
 if(hash(bytes)!==hash(await readFile(join(sourceAssets,'images',q.image))))throw Error('Historical image replaced unexpectedly');
 images[q.number]={imageHash:hash(bytes),imageData:'data:image/png;base64,'+(await readFile(join(root,'images',`q-${String(q.number).padStart(2,'0')}.png`))).toString('base64')};
}
assertReviewPaper(paper,evidence,original,images);
if(args.includes('--media')){
 const manifest=await loadJson(join(assets,'manifest.json'));
 if(manifest.version!==paper.version||manifest.files.length!==39||manifest.state!=='MEDIA_VERIFIED')throw Error('Incomplete media manifest');
 for(const q of paper.questions){
  const path=join(assets,'audio',q.audio),entry=manifest.files.find(e=>e.file===q.audio);
  if(!entry||entry.sourceHash!==sourceHash(q.segments)||entry.sha256!==hash(await readFile(path)))throw Error('Stale/missing recording '+q.number);
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],{encoding:'utf8'}));
  if(!Number.isFinite(duration)||duration<=0||Math.abs(duration-q.audioSeconds)>.01||Math.abs(duration-entry.seconds)>.01||duration+12>q.slotSeconds)throw Error('Incorrect recording duration/response window '+q.number);
 }
}
console.log(paper.id+': owner-authorized review; all39 keys independently supported'+(args.includes('--media')?', all39 matching complete recordings verified':'')+'. Blind QA warnings retained.');
