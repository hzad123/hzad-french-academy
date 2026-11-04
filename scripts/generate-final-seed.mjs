import {readFile,writeFile} from 'node:fs/promises';
const bank=JSON.parse(await readFile('supabase/assessments/finals-v1.json','utf8'));
const path='supabase/migrations/20261104_achievements_certificates.sql';
const marker='-- BEGIN VERSIONED FINAL BANK (generated; never bundled for the browser)';
const quote=x=>x==null?'null':"'"+String(x).replaceAll("'","''")+"'";
const rows=Object.entries(bank.levels).flatMap(([level,items])=>items.map(([skill,prompt,options,answer,audio],index)=>'('+[bank.version,level,index+1,`final-v1-${level}-${index+1}`,skill,prompt,JSON.stringify(options),answer,audio].map(quote).join(',')+')'));
const source=await readFile(path,'utf8');if(!source.includes(marker))throw Error('Final-bank marker missing');
const output=source.slice(0,source.indexOf(marker))+marker+'\ninsert into academy_achievements.questions(version,level,position,id,skill,prompt,options,answer,audio_text) values\n'+rows.join(',\n')+";\nnotify pgrst,'reload schema';\ncommit;\n";
if(process.argv.includes('--check')){if(output!==source)throw Error('Final assessment seed is out of date')}else await writeFile(path,output);
