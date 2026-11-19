import {readdir,access} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
export function selectStrictBanks(files,{requireReplacements=false}={}){
 const selected=Array.from({length:6},(_,i)=>{
  const label=String(i+1).padStart(2,'0'),matches=files.filter(f=>new RegExp(`^tcf-listening-test${label}-v[0-9]+\\.json$`).test(f));
  return matches.map(file=>({file,revision:Number(file.match(/-v(\d+)\.json$/)[1])})).sort((a,b)=>b.revision-a.revision)[0];
 });
 if(!selected.some(s=>s?.revision>=5)){
  if(requireReplacements)throw Error('The six strict replacements are not present; historical v4 blind warnings remain unresolved');
  return [];
 }
 if(selected.some(s=>!s||s.revision<5||s.revision!==selected[0].revision))throw Error('Strict release requires all six complete banks at the same new revision');
 return selected.map(s=>'supabase/exams/'+s.file);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const banks=selectStrictBanks(await readdir('supabase/exams'),{requireReplacements:process.argv.includes('--require-replacements')});
 if(!banks.length)console.log('No strict replacement banks in this payload; historical v4 blind warnings remain unresolved.');
 for(const bank of banks){
  const version=bank.match(/test(\d+)-v(\d+)\.json$/);
  // Owner expressly waived only the model blind-guessing target. Independently
  // grounded answers and complete verified recordings remain mandatory.
  const waiverEvidence=`curriculum/tcf-listening-owner-waiver-v5/tcf-listening-2026-11-test${version[1]}-v${version[2]}`;
  const waiver=version[2]==='5'&&await access(waiverEvidence+'/review-release.json').then(()=>true,()=>false);
  if(waiver) {
   execFileSync('node',['scripts/check-listening-owner-waiver-v5.mjs','--bank',bank,'--evidence',waiverEvidence,'--media'],{stdio:'inherit'});
   console.log('OWNER WAIVER: approved grounding/media; blind benchmark was expressly waived for '+bank);
  } else {
   execFileSync('node',['scripts/check-listening-contrast-quality.mjs','--bank',bank,'--evidence',`curriculum/tcf-listening-answer-qc/tcf-listening-2026-11-test${version[1]}-v${version[2]}`,'--media'],{stdio:'inherit'});
  }
 }
}
