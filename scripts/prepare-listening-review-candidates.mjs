// Preserve every historical bank, source and MP3. These new candidates are
// incomplete and this script never emits SQL or changes a publication pointer.
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {sha256,keyPattern,sourceHash} from './lib/listening-quality.mjs';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const corrections=await read('curriculum/tcf-listening-review/corrections.json');
const letters='ABCD';
function shuffled(values,seed) {
  const result=[...values];let counter=0;
  for(let i=result.length-1;i>0;i--) {
    const j=parseInt(sha256(seed+':'+counter++).slice(0,8),16)%(i+1);
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
const requested=process.argv.includes('--test')?Number(process.argv[process.argv.indexOf('--test')+1]):null;
if(requested!==null&&!Object.hasOwn(corrections,requested))throw Error('No individually authored corrections for that test');
for(const number of Object.keys(corrections).map(Number).filter(n=>requested===null||n===requested)) {
  const label=String(number).padStart(2,'0');
  const base=`supabase/exams/tcf-listening-test${label}`;
  const paper=await read(base+'-v2.json'), historical=await read(base+'.json');
  const sourceVersion=paper.version;
  const previousRoot=join('assets/tcf-listening',sourceVersion);
  const manifest=await read(join(previousRoot,'manifest.json'));
  const keys=paper.questions.map(q=>q.correct), originals=structuredClone(paper.questions);
  const changes=[];
  for(const [questionNumber,patch] of Object.entries(corrections[number])) {
    const q=paper.questions[Number(questionNumber)-1];
    if(patch.question)q.question=patch.question;
    if(patch.options) {q.options=patch.options;keys[q.number-1]=letters[patch.answer];}
    if(patch.correctText) {
      const index=q.options.indexOf(patch.correctText);
      if(index<0)throw Error('Missing editorial answer '+label+' Q'+q.number);
      keys[q.number-1]=letters[index];
    }
    if(patch.segments) {q.segments=patch.segments;q.transcript=q.segments.map(s=>s.text).join('\n');q.audioSeconds=null;}
    if(patch.explanation)q.explanation=patch.explanation;
    changes.push({number:q.number,reason:patch.reason});
  }
  // Keep all eight spoken-option keys/orders intact to reuse valid recordings.
  // Shuffle the remaining balanced multiset once, rather than forcing one of
  // each letter in every four-question block.
  const remaining=[10,10,10,9];
  for(const key of keys.slice(0,8))remaining[letters.indexOf(key)]--;
  const slots=shuffled(remaining.flatMap((count,index)=>Array(count).fill(letters[index])),paper.id+'-v3-whole-paper');
  for(const [index,q] of paper.questions.entries()) {
    const correctText=q.options[letters.indexOf(keys[index])];
    if(index>=8) {
      const target=letters.indexOf(slots[index-8]);
      const wrong=shuffled(q.options.filter(option=>option!==correctText),paper.id+':'+q.number);
      const choices=Array(4);choices[target]=correctText;
      for(let i=0;i<4;i++)if(i!==target)choices[i]=wrong.shift();
      q.options=choices;q.correct=letters[target];
    }
    q.slotSeconds=historical.questions[index].slotSeconds;
  }
  if(keyPattern(paper.questions).suspiciousFourItemDeck)throw Error('Predictable answer deck');
  if(paper.questions.reduce((sum,q)=>sum+q.slotSeconds,0)!==2100)throw Error('Historical slots must total 2100');
  paper.version=`tcf-listening-2026-11-test${label}-v3`;
  const outputFile=base+'-v3.json';
  // This tool creates new candidates once. It cannot silently overwrite media
  // or an existing immutable candidate on a rerun.
  if(await access(outputFile).then(()=>true,()=>false))throw Error('Candidate already exists: '+outputFile);
  const root=join('assets/tcf-listening',paper.version);
  await mkdir(join(root,'audio'),{recursive:true});await mkdir(join(root,'images'),{recursive:true});
  const files=[];
  for(const [index,q] of paper.questions.entries()) {
    if(sourceHash(q.segments)===sourceHash(originals[index].segments)) {
      await copyFile(join(previousRoot,'audio',q.audio),join(root,'audio',q.audio));
      files.push({...manifest.files[index],retainedFrom:sourceVersion});
    } else files.push({file:q.audio,seconds:null,sourceHash:sourceHash(q.segments),sha256:null,status:'RERECORD_REQUIRED'});
    if(index<4)await copyFile(join(previousRoot,'images',q.image),join(root,'images',q.image));
  }
  await copyFile(join(previousRoot,'AUDIO-LICENSES.md'),join(root,'AUDIO-LICENSES.md'));
  await writeFile(outputFile,JSON.stringify(paper,null,2)+'\n');
  await writeFile(join(root,'manifest.json'),JSON.stringify({...manifest,version:paper.version,files},null,2)+'\n');
  await writeFile(`curriculum/tcf-listening-review/test${label}-v3-provenance.json`,JSON.stringify({version:paper.version,sourceVersion,state:'INCOMPLETE_UNPUBLISHED',changes,
    timing:'Historical v1 per-question slots restored without modifying the engine.',
    options:'Q9–39 choices shuffled across the whole paper; spoken Q1–8 ordering retained.',
    retainedRecordings:files.filter(f=>f.retainedFrom).length,pendingRecordings:files.filter(f=>!f.retainedFrom).map(f=>f.file)},null,2)+'\n');
  console.log('Prepared unpublished candidate',paper.version,'with',files.filter(f=>f.retainedFrom).length,'retained recordings.');
}
