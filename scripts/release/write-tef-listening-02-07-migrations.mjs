import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Six separate immutable paper seeds + one atomic start-allowlist activation.
// Input paths MUST be generated first by "supabase migration new" CLI.
const files=process.argv.slice(2);
assert.equal(files.length,7,'Six versioned seed migrations plus one explicit activation migration');
const pad=n=>String(n).padStart(2,'0');
const expected=[2,3,4,5,6,7].map(n=>'tef_listening_'+pad(n)+'_v1').concat('activate_tef_listening_02_07');
for(let i=0;i<files.length;i++)assert(new RegExp('^supabase/migrations/\\d+_'+expected[i]+'\\.sql$').test(files[i]),'Migration must be created by CLI: '+expected[i]);
const reference='tef-listening-2026-11-test01-v3';
const versions=[["tef-listening-01",reference]];
for(let t=2;t<=7;t++){
 const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test'+pad(t)+'-v1.json','utf8'));
 assert.equal(bank.id,'tef-listening-'+pad(t));assert.equal(bank.questions.length,40);assert.equal(bank.seconds,2400);
 assert.equal(bank.questions.reduce((s,q)=>s+q.slotSeconds,0),2400);
 assert.equal(bank.questions.filter(q=>q.slotSeconds>0).length,36);
 assert(bank.questions.filter(q=>q.slotSeconds>0).every(q=>q.audioSeconds>0));
 const manifest=JSON.parse(await readFile('assets/tef-listening/'+bank.version+'/manifest.json','utf8'));
 assert.equal(manifest.files.length,36);
 const raw=JSON.stringify(bank),delim='$tef_paper_'+pad(t)+'$';
 assert(!raw.includes(delim),'SQL data delimiter collision');
 const sql=`-- Immutable fully hosted and independently reviewed TEF Listening Test ${pad(t)}.
-- This seed MUST NOT be run until exact-sha Pages verification of all 43 assets.
begin;
insert into academy_tef_listening.papers(id,version,content)
values('${bank.id}','${bank.version}',${delim}${raw}${delim}::jsonb)
on conflict(id,version) do nothing;
commit;
`;
 await writeFile(files[t-2],sql);
 versions.push([bank.id,bank.version]);
}
const migration=await readFile('supabase/migrations/20261124142411_tef_listening_01_audio_timing_v3.sql','utf8');
const start=migration.indexOf('create or replace function public.academy_tef_listening_command('),end=migration.indexOf('\nnotify pgrst',start);
assert(start>0&&end>start);
let fn=migration.slice(start,end);
const old="if p_payload->>'testId' is distinct from 'tef-listening-01' or p_payload->>'version' is distinct from 'tef-listening-2026-11-test01-v3' then raise exception 'Listening paper changed. Refresh before starting';end if;";
assert(fn.includes(old),'Secure authenticated start allowlist changed unexpectedly');
const allowed=versions.map(([id,v])=>"(p_payload->>'testId'='"+id+"' and p_payload->>'version'='"+v+"')").join(' or ');
fn=fn.replace(old,"if not coalesce(("+allowed+"),false) then raise exception 'Listening paper changed. Refresh before starting';end if;");
assert(fn.includes('perform academy_ai.require_access(u)'),'Preserve purchase verification and user access policy');
assert(fn.includes("if found and a.user_id<>u"),'Preserve account ownership restrictions');
assert(fn.includes("language plpgsql security definer set search_path=''"),'Preserve secure RPC search path');
const sql=`-- Release ONLY after six approved immutable paper seeds AND media-host verification.
-- Preserve every historical attempt by immutable testId/version reference.
begin;
${fn}
notify pgrst,'reload schema';
commit;
`;
await writeFile(files[6],sql);
console.log(JSON.stringify({status:'SEVEN_PREPARED_MIGRATIONS_NOT_APPLIED',versions,bytes:files.map((name,i)=>({name,bytes:i===6?sql.length:0}))},null,2));
