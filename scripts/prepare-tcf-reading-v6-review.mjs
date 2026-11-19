import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Keep the stored answer and explanation out of both independent review stages.
const destination=resolve(process.argv[2]||'/tmp/tcf-reading-v6-review');
const selected=process.argv.slice(3).map(Number);
const tests=selected.length?selected:[1,2,3,4,5,6];
mkdirSync(destination,{recursive:true});
for(const test of tests){
  if(!Number.isInteger(test)||test<1||test>6)throw new Error('Choose tests 1 through 6');
  const suffix=String(test).padStart(2,'0');
  const paper=JSON.parse(readFileSync(new URL(`../supabase/exams/tcf-reading-v6/test-${suffix}.json`,import.meta.url),'utf8'));
  const rows=paper.questions.slice(24).map(q=>({test,number:q.number,
    fingerprint:createHash('sha256').update(JSON.stringify(q)).digest('hex'),
    question:q.question,options:q.options}));
  writeFileSync(resolve(destination,`blind-test-${suffix}.json`),JSON.stringify(rows,null,2)+'\n');
  const passageRows=rows.map((row,i)=>({...row,passage:paper.questions[i+24].passage}));
  writeFileSync(resolve(destination,`passage-test-${suffix}.json`),JSON.stringify(passageRows,null,2)+'\n');
}
console.log(`Prepared keyless question/options and passage packets for ${tests.length} tests at ${destination}`);
