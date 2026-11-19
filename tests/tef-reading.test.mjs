import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {makeTefReadingStore} from '../src/exams/tef-reading/store.js';

const paper=JSON.parse(await readFile('supabase/exams/tef-reading-test01.json','utf8'));
const sql=await readFile('supabase/migrations/20261119234000_tef_reading_test01.sql','utf8');
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
const identity={testId:paper.id,version:paper.version};
async function database(){
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.purchase_entitlements(user_id uuid,status text,verified_at timestamptz,access_starts_at timestamptz,access_ends_at timestamptz,product_code text);");
 await db.query('insert into auth.users values($1,now()),($2,now())',[alice,bob]);
 await db.query("insert into purchase_entitlements select id,'active',now(),now()-interval'1 day',null,'HZAD_FULL_ACADEMY' from auth.users");
 for(const f of ['20261029_academy_learning.sql','20261105001000_ai_learning.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 const query=async(s,params=[])=>(await db.query(s,params)).rows;
 const command=async(user,action,id=null,payload={})=>{await query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await query("select public.academy_tef_reading_command($1,$2,$3) result",[action,id,payload]))[0].result};
 return {db,query,command};
}

test('TEF Test 01 follows reference 40-question, 60-minute, visual-question structure with unique answer',()=>{
 assert.equal(paper.id,'tef-reading-01');assert.equal(paper.seconds,3600);
 assert.equal(paper.questions.length,40);assert.equal(paper.maxPoints,40);
 assert.equal(paper.questions.reduce((s,q)=>s+q.points,0),40);
 const counts=Object.fromEntries('ABCD'.split('').map(c=>[c,paper.questions.filter(q=>q.correct===c).length]));
 assert.deepEqual(counts,{A:10,B:10,C:10,D:10});
 for(const [i,q] of paper.questions.entries()){
  assert.equal(q.number,i+1);assert.equal(q.options.length,4);
  assert.equal(new Set(q.options).size,4);assert.match(q.correct,/^[ABCD]$/);
  assert(q.explanation.length>30);assert(q.question.length>10);
  assert.equal(q.points,1);
  if(i<7)assert(['notice','illustration'].includes(q.media.kind),'Visual notice '+(i+1));
  if(i>=17&&i<=18){assert.equal(q.media.kind,'offers');assert.equal(q.media.items.length,4)}
  if(i>=19&&i<=21){assert.equal(q.media.kind,'chart-grid');assert.equal(q.media.series.length,4);for(const v of q.media.series)assert.equal(v.length,5)}
  if(i>=22&&i<=31)assert.equal(q.section,'email');
  if(i>=32)assert.equal(q.section,'long');
 }
 const embedded=JSON.parse(sql.split('$paper$')[1]);
 assert.deepEqual(embedded,paper);
 assert(!sql.includes('academy_tcf_reading'),'TEF reading data is isolated from TCF');
});

test('isolated TEF reading RPC securely hides answer keys, saves progress, and grades 40/40 server-side',async()=>{
 const {db,query,command}=await database();
 try{
  await db.exec(sql.replace(/commit;\s*$/,'rollback;'));
  assert.equal((await query("select count(*)::int n from pg_namespace where nspname='academy_tef_reading'"))[0].n,0);
  await db.exec(sql);
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await query("select has_schema_privilege($1,'academy_tef_reading','usage') v",[role]))[0].v,false);
   assert.equal((await query("select has_table_privilege($1,'academy_tef_reading.papers','select') v",[role]))[0].v,false);
  }
  const catalog=await command(alice,'catalog');
  assert.equal(catalog.tests.length,1);assert.equal(catalog.tests[0].questions,40);
  assert(!JSON.stringify(catalog).includes('"correct"'));
  let a=await command(alice,'start',crypto.randomUUID(),identity);
  assert.equal(a.paper.questions.length,40);
  assert(!JSON.stringify(a.paper).includes('"correct"'));
  assert.equal(a.paper.questions[19].media.kind,'chart-grid');
  assert.equal(a.paper.questions[18].media.items.length,4);
  await assert.rejects(()=>command(bob,'read',a.id),/not found/i);
  a=await command(alice,'answer',a.id,{revision:a.revision,number:1,choice:'A'});
  assert.equal(a.answers[1],'A');
  a=await command(alice,'answer',a.id,{revision:a.revision,number:40,choice:paper.questions[39].correct});
  a=await command(alice,'submit',a.id,{revision:a.revision});
  assert.equal(a.status,'completed');assert.equal(a.result.total,40);
  assert.equal(a.result.rows.length,40);
  assert.equal(a.result.correct,1);assert.equal(a.result.unanswered,38);
  assert.equal(a.result.rows[0].selected,'A');assert.equal(a.result.rows[0].correct,paper.questions[0].correct);
  assert.equal(a.result.rows[0].isCorrect,false);
  assert.equal(a.result.rows[39].isCorrect,true);
  assert(a.result.rows[0].explanation);
  const old=await command(alice,'read',a.id);
  assert.deepEqual(old.result,a.result,'Historical grading persists');
  let b=await command(bob,'start',crypto.randomUUID(),identity);
  for(const item of paper.questions)b=await command(bob,'answer',b.id,{revision:b.revision,number:item.number,choice:item.correct});
  b=await command(bob,'submit',b.id,{revision:b.revision});
  assert.equal(b.result.correct,40);assert.equal(b.result.points,40);
  assert.equal(b.result.unanswered,0);
  assert.deepEqual((await command(alice,'read',a.id)).result,a.result);
 }finally{await db.close()}
});

test('TEF reading UI is connected without exposing keys or disturbing the TCF reading simulator',async()=>{
 const main=await readFile('src/main.js','utf8'),template=await readFile('src/ui/template.js','utf8');
 const hub=await readFile('src/exams/ui.js','utf8'),ui=await readFile('src/exams/tef-reading/ui.js','utf8');
 const media=await readFile('src/exams/tef-reading/media.js','utf8');
 assert.match(main,/wireTefReading\(root,client\)/);
 assert.match(template,/id="hz-tef-reading"/);
 assert.match(hub,/event:'hzad-open-tef-reading'/);
 assert.match(ui,/renderTefMedia\(q\.media\)/);
 assert.match(ui,/Your marked answer sheet/);
 assert.match(ui,/✓ Correct/);assert.match(ui,/✕ Incorrect/);
 assert.match(media,/chart-grid/);assert.match(media,/offers/);
 assert.match(main,/wireTcfReading\(root,client\)/);
 assert(!ui.includes('academy_tef_reading.grade'));
});

test('TEF Reading store uses the authenticated private-bank RPC only',async()=>{
 const calls=[],client={auth:{getSession:async()=>({data:{session:{access_token:'fixture',expires_at:Date.now()/1000+3600,user:{id:alice}}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{id:alice}}}};
 const store=makeTefReadingStore(client);
 await store.answer(alice,1,20,'A');
 assert.deepEqual(calls,[{name:'academy_tef_reading_command',args:{p_action:'answer',p_id:alice,p_payload:{revision:1,number:20,choice:'A'}}}]);
});
