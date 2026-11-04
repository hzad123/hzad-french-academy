// Build-time maintenance only; never imported by a browser entry point.
import {readFile,writeFile} from 'node:fs/promises';
const bank=JSON.parse(await readFile('supabase/placement/bank-v1.json','utf8'));
const migration='supabase/migrations/20261104_french_placement.sql';
const marker='-- The versioned seed below is generated from supabase/placement/bank-v1.json.';
const quote=x=>x==null?'null':"'"+String(x).replaceAll("'","''")+"'";
let position=0;
const rows=Object.entries(bank.levels).flatMap(([level,items])=>items.map(([skill,prompt,options,answer,audio])=>{
 const p=++position;
 return '('+[bank.version,p,`fr-v1-${p}`,level,skill,prompt,JSON.stringify(options),answer,audio].map(quote).join(',')+')';
}));
const original=await readFile(migration,'utf8');
if(!original.includes(marker))throw Error('Placement seed marker missing; refusing to rewrite migration');
const sql=original.slice(0,original.indexOf(marker))+marker+'\ninsert into academy_placement.questions(version,position,id,level,skill,prompt,options,answer,audio_text) values\n'+rows.join(',\n')+';\ncommit;\n';
if(process.argv.includes('--check')){
 if(sql!==original)throw Error('Placement migration seed is out of date');
}else await writeFile(migration,sql);
