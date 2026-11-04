// Generate an administrator-reviewed SQL seed for the three public sample lessons.
// Never auto-publish lessons or use a service-role key in client code.
import {a0Lessons} from '../src/curriculum/a0.js';
import {writeFile,mkdir} from 'node:fs/promises';
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const rows=a0Lessons.map((l,i)=>{
 const content={objectives:l.objectives,sections:l.sections,vocabulary:l.vocabulary};
 return `(${quote(l.id)},'A0',${i+1},${quote(l.title)},${l.minutes},${quote(JSON.stringify(content))}::jsonb,${quote(JSON.stringify(l.quiz))}::jsonb,false)`;
});
const sql=`-- Review before running in Supabase SQL Editor. Lessons remain unpublished.\ninsert into public.academy_units(id,level,position,title,minutes,content,quiz,published)\nvalues\n${rows.join(',\n')}\non conflict(id) do update set title=excluded.title,minutes=excluded.minutes,content=excluded.content,quiz=excluded.quiz;\n`;
await mkdir('generated',{recursive:true});
await writeFile('generated/a0-sample-seed.sql',sql);
console.log('Wrote generated/a0-sample-seed.sql (3 unpublished sample lessons)');
