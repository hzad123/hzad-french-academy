import {readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {publicationSQL6} from './listening-01-06-v4.mjs';import {protectedTables} from './listening-owner-review.mjs';
const output=process.argv[2],match=output?.match(/^supabase\/migrations\/\d+_tcf_listening_01_06_strict_v(\d+)\.sql$/);
if(!match)throw Error('Supply the empty strict migration file created by Supabase CLI');
const revision=Number(match[1]);if(revision<5)throw Error('New strict version required');const papers=[];
for(let n=1;n<=6;n++){
 const bank=`supabase/exams/tcf-listening-test${String(n).padStart(2,'0')}-v${revision}.json`,paper=JSON.parse(await readFile(bank,'utf8'));
 execFileSync('node',['scripts/check-listening-contrast-quality.mjs','--bank',bank,'--evidence',`curriculum/tcf-listening-answer-qc/${paper.version}`,'--media'],{stdio:'inherit'});papers.push(paper);
}
await writeFile(output,publicationSQL6(papers,protectedTables,{revision}));console.log('Prepared strict publication after all six exact banks/media passed mandatory quality gates.');
