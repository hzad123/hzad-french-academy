import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
const directory=resolve(process.argv[2]||'/tmp/hzad-private-exam-audio');let count=0;
for(const bank of Object.values(BANKS))for(const item of bank.sections.find(s=>s.skill==='listening').items){
 const file=resolve(directory,item.audioPath),bytes=await readFile(file),review=JSON.parse(await readFile(file+'.review.json','utf8'));
 if(bytes.length<1000||review.path!==item.audioPath||review.sha256!==createHash('sha256').update(bytes).digest('hex')||review.reviewed!==true||typeof review.reviewer!=='string'||!review.reviewer.trim())throw Error('Missing or mismatched listening review for '+item.audioPath);
 count++;
}
console.log(`${count} original recordings have matching signed-off review records. Upload only to the private academy-exam-listening bucket.`);
