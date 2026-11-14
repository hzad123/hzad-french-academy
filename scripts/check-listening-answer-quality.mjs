import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {assertAnswerQuality,loadJson,hash} from './lib/listening-answer-qc.mjs';
const args=process.argv.slice(2),get=key=>args[args.indexOf(key)+1];
if(!args.includes('--bank'))throw Error('Supply --bank for the exact candidate to record/release');
const paper=await loadJson(get('--bank'));
const root=get('--evidence')||join('curriculum/tcf-listening-answer-qc',paper.version);
const evidence=await loadJson(join(root,'evidence.json')).catch(()=>{throw Error('Independent AI answer QC has not accepted '+paper.version)});
const cohort=await loadJson(join(root,'cohort.json')).catch(()=>{throw Error('Missing frozen held-out cohort assessment')});
const imageHashes={},imageDataByNumber={};
for(const q of paper.questions.slice(0,4)) {
 imageHashes[q.number]=hash(await readFile(join('assets/tcf-listening',paper.version,'images',q.image)));
 imageDataByNumber[q.number]='data:image/png;base64,'+(await readFile(join(root,'images','q-'+String(q.number).padStart(2,'0')+'.png'))).toString('base64');
}
await assertAnswerQuality(paper,evidence,{imageHashes,imageDataByNumber});
if(!cohort.readyForMedia||!cohort.statistics?.heldout?.passes||cohort.statistics.heldout.sample<100)throw Error('Library blind-guessing experiment is incomplete or above chance');
console.log('Independent blind, grounding, paper and frozen-cohort checks passed for '+paper.version);
