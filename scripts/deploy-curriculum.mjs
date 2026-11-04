// GitHub Actions only: imports validated lessons via Supabase REST API using a server-side secret.
// Never expose the service role key in browser code, GitHub source, or build artifacts.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=process.argv[2]||'curriculum/a0-batch-01.json';
execFileSync(process.execPath,['scripts/validate-curriculum.mjs',file],{stdio:'inherit'});
const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key)throw Error('Missing or invalid Supabase URL / service-role secret');
const lessons=JSON.parse(readFileSync(file,'utf8'));
// Legacy service_role JWTs require Bearer auth. New sb_secret_ keys use apikey only.
// Sending sb_secret_ as a Bearer token causes authorization failures.
const headers={'apikey':key,'Content-Type':'application/json'};
if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
const ids=lessons.map(u=>u.id);
const lookup=new URL(url+'/rest/v1/academy_units');
lookup.searchParams.set('select','id,published');
lookup.searchParams.set('id','in.('+ids.join(',')+')');
const existingResponse=await fetch(lookup,{headers});
if(!existingResponse.ok){
 const details=await existingResponse.json().catch(()=>({}));
 const code=typeof details.code==='string'?details.code:'';
 throw Error('Could not inspect existing lessons: HTTP '+existingResponse.status+(code?' (code '+code+')':'')+'. Verify the secret is from the correct Supabase project and has server-side privileges.');
}
const existing=await existingResponse.json();
if(existing.some(u=>u.published))throw Error('Refusing to overwrite published lessons: '+existing.filter(u=>u.published).map(u=>u.id).join(','));
const endpoint=url+'/rest/v1/academy_units?on_conflict=id';
const response=await fetch(endpoint,{method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(lessons)});
if(!response.ok)throw Error('Import failed HTTP '+response.status+': '+(await response.text()).slice(0,800));
console.log('Imported '+lessons.length+' lessons as unpublished. No published lessons were modified.');
