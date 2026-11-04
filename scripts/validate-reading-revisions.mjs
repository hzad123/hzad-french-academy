// Editorial quality gate for proposed reading rewrites.
// Never writes to Supabase. Drafts remain separate from published content.
import {readFileSync} from 'node:fs';
import {countFrenchWords} from '../src/learning/reading-workshop.js';
const files=process.argv.slice(2);
if(!files.length)throw Error('Provide one or more curriculum/revisions/*.json paths');
const minWords={A1:120,A2:175,B1:220,B2:260,C1:300,C2:300};
const seen=new Set();
let count=0;
for(const file of files){
 const rows=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(rows)||!rows.length)throw Error('No readings in '+file);
 for(const row of rows){
  if(!/^(a[12]|b[12]|c[12])-\d{3}$/.test(row.id))throw Error('Bad lesson ID: '+row.id);
  if(row.level!==row.id.slice(0,2).toUpperCase()||seen.has(row.id))throw Error('Wrong or duplicate level/id: '+row.id);
  seen.add(row.id);
  if(row.status!=='editorial_draft_pending_review')throw Error('Only editorial drafts may enter the staging queue: '+row.id);
  if(typeof row.french!=='string'||countFrenchWords(row.french)<minWords[row.level])throw Error('Short reading: '+row.id+' ('+countFrenchWords(row.french)+' words, need '+minWords[row.level]+')');
  if(typeof row.english!=='string'||row.english.trim().length<300)throw Error('Translation too short: '+row.id);
  if(!Array.isArray(row.editorial_focus)||row.editorial_focus.length<3)throw Error('Insufficient language objectives: '+row.id);
  if(!Array.isArray(row.comprehension_prompts)||row.comprehension_prompts.length<3)throw Error('Insufficient comprehension prompts: '+row.id);
  if(!row.title||row.title.trim().length<8)throw Error('Missing reading title: '+row.id);
  count++;
 }
}
console.log('Validated '+count+' staged reading drafts; nothing published or written to Supabase.');
