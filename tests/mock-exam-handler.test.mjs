import test from 'node:test';
import assert from 'node:assert/strict';
import {createExamHandler} from '../supabase/functions/academy-exams/handler.js';
import {BANKS} from '../supabase/functions/academy-exams/banks.js';
import {createExamProvider} from '../supabase/functions/academy-exams/provider.js';
import {encodeWav,audioBase64} from '../src/ai/audio.js';
const user='11111111-1111-4111-8111-111111111111',id='33333333-3333-4333-8333-333333333333';
function fixture(){
 let now=0,providerCalls=0;const rows=new Map(),calls=new Map();
 const db={userRpc:async()=>({exams:[{exam:'tef-canada',enabled:true,credits:50}],history:[]}),adminRpc:async(_,{p_user,p_action,p_id,p_payload:p})=>{
  let row=rows.get(p_id);if(row&&row.state.userId!==p_user)throw Error('Exam attempt not found');
  if(p_action==='start'){if(!row){row={id:p_id,exam:p.exam,version:p.version,state:p.state,revision:0,settings:{text_model:'text',audio_model:'audio'},credits:50};rows.set(p_id,row)}return structuredClone(row)}
  if(!row)throw Error('Exam attempt not found');
  if(p_action==='read')return {...structuredClone(row),callResults:[...calls.values()].filter(c=>c.status==='completed').map(c=>c.result)};
  if(p_action==='save'){if(p.revision!==row.revision)throw Error('Exam changed');row.state=structuredClone(p.state);row.revision++;return structuredClone(row)}
  if(p_action==='claim-call'){const c=calls.get(p.callId);if(c){if(c.input_hash!==p.hash)throw Error('Activity ID already used');return {...c,claimed:false}}const fresh={input_hash:p.hash,status:'dispatched'};calls.set(p.callId,fresh);return {...fresh,claimed:true}}
  if(p_action==='finish-call'){const c=calls.get(p.callId);Object.assign(c,{status:p.result?'completed':'failed',result:p.result});return c}
  if(p_action==='close'){row.closed_at='closed';return structuredClone(row)}
  throw Error('Unsupported test command '+p_action);
 }};
 const provider={ready:()=>true,run:async input=>{providerCalls++;return {result:input.kind==='turn'?{transcript:'Bonjour, quels sont vos horaires ?',reply:'Nous ouvrons le mercredi soir et le samedi matin.',observations:['Clear greeting; the final question has a rising intonation.']}:{summary:'Specific feedback',criteria:[],corrections:[],improvedResponse:'Bonjour !',priorities:['a','b','c'],practice:[]},usage:{prompt_tokens:20}}}};
 const storage={listeningUrl:async p=>'https://private.invalid/'+p,saveRecording:async()=>{},recording:async()=>wav()};
 const handle=createExamHandler({authenticate:async token=>token==='alice'?{id:user,email_confirmed_at:'yes'}:{id:'22222222-2222-4222-8222-222222222222',email_confirmed_at:'yes'},db,storage,provider,clock:()=>now});
 async function send(body,token='alice',origin='https://hzad123.github.io'){
  const response=await handle(new Request('https://test.invalid/academy-exams',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify({id,...body}):undefined}));return {http:response.status,data:await response.json()};
 }
 return {send,rows,calls,advance:n=>{now+=n},providerCalls:()=>providerCalls};
}
function wav(){const samples=new Float32Array(16000);for(let i=0;i<samples.length;i++)samples[i]=.1*Math.sin(i*.15);return audioBase64(encodeWav(samples,16000))}
test('full TEF reading/listening run marks exactly 80 original answers and returns corrections only at completion',async()=>{
 const f=fixture(),bank=BANKS['tef-canada'];let reply=await f.send({kind:'start',exam:bank.exam,expectedCredits:50});assert.equal(reply.http,200);assert.ok(!JSON.stringify(reply.data).includes('explanation'));
 for(let section=0;section<2;section++){
  for(let index=0;index<40;index++){
   const item=bank.sections[section].items[index];
   if(section===1){const play=await f.send({kind:'listen',taskId:item.id});assert.equal(play.http,200);assert.ok(play.data.audioUrl);assert.ok(!JSON.stringify(play.data).includes(item.transcript));const duplicate=await f.send({kind:'listen',taskId:item.id});assert.equal(duplicate.http,409)}
   const answered=await f.send({kind:'event',event:{kind:'answer',section,itemId:item.id,choice:item.answer}});assert.equal(answered.http,200);
   reply=await f.send({kind:'event',event:index===39?{kind:'finish-section',section}:{kind:'move',section,itemId:item.id,index:index+1}});assert.equal(reply.http,200);
  }
 }
 for(let section=2;section<4;section++)reply=await f.send({kind:'event',event:{kind:'finish-section',section}});
 assert.equal(reply.data.status,'completed');assert.deepEqual(reply.data.sectionResults.slice(0,2),[{skill:'reading',correct:40,total:40},{skill:'listening',correct:40,total:40}]);assert.equal(reply.data.review[1].items.length,40);assert.ok(reply.data.review[1].items[0].transcript);assert.equal(f.providerCalls(),0);
});
test('speaking uses real validated WAV, persists acoustic evidence and recovers saved provider output without another call',async()=>{
 const f=fixture();await f.send({kind:'start',exam:'tef-canada',expectedCredits:50});
 for(let section=0;section<3;section++)await f.send({kind:'event',event:{kind:'finish-section',section}});
 const task=BANKS['tef-canada'].sections[3].items[0],callId=crypto.randomUUID();f.advance(2000);
 const input={kind:'turn',taskId:task.id,section:3,callId,audio:wav()};const spoken=await f.send(input);assert.equal(spoken.http,200);assert.equal(spoken.data.conversation.length,1);assert.equal(f.providerCalls(),1);
 const row=f.rows.get(id);delete row.state.speechEvidence;
 const read=await f.send({kind:'read'});assert.equal(read.data.conversation[0].transcript,'Bonjour, quels sont vos horaires ?');assert.equal(f.providerCalls(),1);
 const again=await f.send(input);assert.equal(again.http,200);assert.equal(f.providerCalls(),1);
 const bad=await f.send({...input,callId:crypto.randomUUID(),audio:'not-wav'});assert.equal(bad.http,409);assert.equal(f.providerCalls(),1);
});
test('owner checks, origin controls and task eligibility reject forged actions before inference',async()=>{
 const f=fixture();await f.send({kind:'start',exam:'tcf-canada',expectedCredits:50});
 assert.equal((await f.send({kind:'read'},'bob')).http,403);
 assert.equal((await f.send({kind:'read'},'alice','https://evil.invalid')).http,403);
 assert.equal((await f.send({kind:'assess',taskId:'tcf01-ee-1',callId:crypto.randomUUID()})).http,409);
 assert.equal((await f.send({kind:'event',event:{kind:'answer',section:0,itemId:'forged',choice:0}})).http,409);
 assert.equal((await f.send({kind:'turn',section:3,taskId:'tcf01-eo-1',callId:crypto.randomUUID(),audio:wav()})).http,409);assert.equal(f.providerCalls(),0);
});
test('native audio provider sends the WAV, stays in examiner role, and rejects fabricated assessment excerpts',async()=>{
 let sent;
 const provider=createExamProvider({key:'test-placeholder',fetcher:async(_url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({transcript:'Bonjour',reply:'Bonjour !',observations:['Audible greeting.']})}}],usage:{prompt_tokens:10}}))}});
 const result=await provider.run({kind:'turn',task:BANKS['tef-canada'].sections[3].items[0],audio:wav(),settings:{audio_model:'native-audio'}});
 assert.equal(sent.model,'native-audio');assert.equal(sent.messages.at(-1).content[1].type,'input_audio');assert.equal(sent.store,false);assert.equal(result.result.transcript,'Bonjour');
 const failing=createExamProvider({key:'test',fetcher:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'Fine',criteria:[{id:'grammar',rating:4,evidence:['words never said']}],corrections:[],priorities:[],practice:[]})}}]}))});
 await assert.rejects(()=>failing.run({kind:'assessment',task:{prompt:'Write',criteria:['grammar']},skill:'writing',response:'Bonjour',settings:{text_model:'text'}}),/invented/);
});
