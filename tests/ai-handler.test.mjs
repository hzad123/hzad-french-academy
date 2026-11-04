import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/academy-ai/handler.js';
import {createOpenAiProvider,buildMessages} from '../supabase/functions/academy-ai/provider.js';
import {validateInput,validateOutput,inspectAudio,AiError} from '../supabase/functions/academy-ai/contracts.js';
import {encodeWav,audioBase64} from '../src/ai/audio.js';
const uid='11111111-1111-4111-8111-111111111111';
const input=()=>({id:crypto.randomUUID(),kind:'writing',level:'B1',text:'Je suis allé au marché.',expectedCredits:4});
const writing={correctedText:'Je suis allé au marché.',summary:'Clear sentence.',corrections:[],suggestions:['Add a reason for your visit.']};
const audio=()=>audioBase64(encodeWav(Float32Array.from({length:16000},(_,i)=>.1*Math.sin(i/10)),16000));
function setup({run,finishError=false,ready=true}={}){
 const requests=new Map(),calls=[];
 const db={
  async userRpc(token,name,args){calls.push({name,token,args});return name==='academy_ai_request'?requests.get(args.p_id):{enabled:true,activities:{writing:{enabled:true,credits:4}},history:[]}},
  async adminRpc(name,args){
   calls.push({name,args});const id=args.p_id;
   if(name==='academy_ai_reserve'){if(!requests.has(id))requests.set(id,{id,status:'reserved',credits:4});return {...requests.get(id)}}
   if(name==='academy_ai_claim'){const row=requests.get(id);if(row.status!=='reserved')return {claimed:false};row.status='dispatched';return {claimed:true,model:'configured-model',maxOutputTokens:1200,messages:[]}}
   if(name==='academy_ai_finish'){if(finishError)throw Error('database unavailable');const row=requests.get(id);Object.assign(row,{status:'completed',result:args.p_result});return {...row}}
   if(name==='academy_ai_fail'){requests.get(id).status='failed';return null}
   throw Error('Unexpected RPC '+name);
  }
 };
 const provider={ready:()=>ready,run:run|| (async()=>({result:writing,usage:{prompt_tokens:5}}))};
 const handler=createHandler({db,provider,authenticate:async token=>{if(token!=='student-jwt')throw new AiError('Please sign in again.',401,'AI_AUTH');return {id:uid,email_confirmed_at:'2026-01-01'}}});
 const post=body=>handler(new Request('https://academy.test/ai',{method:'POST',headers:{authorization:'Bearer student-jwt','Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {handler,post,calls,requests};
}
test('unauthenticated, invalid-JWT and unapproved browser origins cannot reach paid work',async()=>{
 const {handler,calls}=setup();
 for(const headers of [{},{authorization:'Bearer invalid'},{origin:'https://evil.test',authorization:'Bearer student-jwt'}]){
  const response=await handler(new Request('https://academy.test/ai',{method:'POST',headers,body:JSON.stringify(input())}));assert.ok([401,403].includes(response.status));
 }
 assert.equal(calls.length,0);
 const preflight=await handler(new Request('https://academy.test/ai',{method:'OPTIONS',headers:{origin:'https://www.teftcf.hzadeducation.org'}}));assert.equal(preflight.status,204);
});
test('provider not configured means no reservation; client model/identity/credit forgery is rejected',async()=>{
 let s=setup({ready:false});assert.equal((await s.post(input())).status,503);assert.equal(s.calls.length,0);
 s=setup();for(const extra of [{userId:uid},{model:'expensive-model'},{credits:0},{expectedCredits:0}])assert.equal((await s.post({...input(),...extra})).status,400);
 assert.equal(s.calls.length,0);
});
test('a successful request and replay create one model call, with identity from verified Auth',async()=>{
 let runs=0;const {post,calls}=setup({run:async()=>{runs++;return {result:writing,usage:{prompt_tokens:5}}}}),body=input();
 assert.equal((await post(body)).status,200);const replay=await (await post(body)).json();assert.equal(replay.status,'completed');assert.equal(runs,1);
 const reserved=calls.find(c=>c.name==='academy_ai_reserve').args;assert.equal(reserved.p_user,uid);assert.equal(reserved.p_expected_credits,4);assert.equal(reserved.p_hash.length,64);
});
test('overlapping same-ID calls cannot dispatch the provider twice',async()=>{
 let release,started;const start=new Promise(resolve=>{started=resolve});let runs=0;
 const {post}=setup({run:async()=>{runs++;started();await new Promise(resolve=>{release=resolve});return {result:writing,usage:{}}}}),body=input();
 const first=post(body);await start;assert.equal((await post(body)).status,202);release();assert.equal((await first).status,200);assert.equal(runs,1);
});
test('upstream failure refunds once without exposing provider credentials or internal errors',async()=>{
 const {post,calls}=setup({run:async()=>{throw Error('secret-key-sensitive-upstream-body')}});
 const response=await post(input()),text=await response.text();assert.equal(response.status,502);assert.match(text,/credits were returned/);assert.doesNotMatch(text,/secret-key/);assert.equal(calls.filter(c=>c.name==='academy_ai_fail').length,1);
});
test('lost settlement response keeps the request pending and never repeats the model call',async()=>{
 let runs=0;const {post}=setup({finishError:true,run:async()=>{runs++;return {result:writing,usage:{}}}}),body=input();
 assert.equal((await post(body)).status,202);assert.equal((await post(body)).status,202);assert.equal(runs,1);
});
test('authenticated reads use the student JWT; oversized and malformed bodies never reserve',async()=>{
 const {handler,post,calls}=setup();const response=await handler(new Request('https://academy.test/ai',{headers:{authorization:'Bearer student-jwt'}}));assert.equal(response.status,200);assert.equal(calls[0].token,'student-jwt');
 assert.equal((await post({...input(),text:'x'.repeat(1500000)})).status,413);
 assert.equal((await handler(new Request('https://academy.test/ai',{method:'POST',headers:{authorization:'Bearer student-jwt'},body:'bad-json'}))).status,400);
 assert.equal(calls.filter(c=>c.name==='academy_ai_reserve').length,0);
});
test('actual PCM audio is validated for shape, duration and audibility before charging',()=>{
 const wav=audio();assert.equal(inspectAudio(wav).seconds,1);
 validateInput({id:crypto.randomUUID(),kind:'pronunciation',level:'A0',reference:'Bonjour.',audio:wav,expectedCredits:3});
 for(const data of ['',btoa('fake audio'),audioBase64(encodeWav(new Float32Array(16000),16000)),audioBase64(encodeWav(new Float32Array(16000*31),16000))])assert.throws(()=>inspectAudio(data));
 const bytes=encodeWav(new Float32Array(48000),48000);assert.equal(bytes.length,32044);assert.equal(new DataView(bytes.buffer).getUint32(24,true),16000);
});
test('pronunciation provider receives audio evidence, bounded output and a fixed provider origin',async()=>{
 let request,url;
 const raw={heardText:'Bonjour.',feedback:'Your rhythm is clear.',strengths:['Steady rhythm'],focus:[{sound:'on',example:'bonjour',tip:'Keep the vowel nasal.'}],practicePhrase:'Bonjour, comment allez-vous ?'};
 const provider=createOpenAiProvider({key:'server-only-test-key',fetcher:async(u,options)=>{url=u;request=JSON.parse(options.body);return new Response(JSON.stringify({model:'audio-model',choices:[{message:{content:JSON.stringify(raw)}}],usage:{prompt_tokens:40,prompt_tokens_details:{audio_tokens:25}}}))}});
 const result=await provider.run({kind:'pronunciation',level:'A1',reference:'Bonjour.',audio:audio()},{model:'reviewed-audio-model',maxOutputTokens:1200,messages:[]});
 assert.equal(url,'https://api.openai.com/v1/chat/completions');assert.equal(request.store,false);assert.equal(request.max_tokens,1200);assert.equal(request.messages.at(-1).content[1].type,'input_audio');assert.equal(result.usage.audio_input_tokens,25);assert.equal(result.result.focus[0].sound,'on');assert.ok(!('score' in result.result));
 assert.match(request.messages.at(-1).content[0].text,/acoustic evidence/);assert.doesNotMatch(JSON.stringify(request),/server-only-test-key/);
});
test('writing/conversation outputs are bounded and malformed feedback fails before settlement',()=>{
 assert.deepEqual(validateOutput('writing',writing),writing);
 assert.throws(()=>validateOutput('writing',{...writing,correctedText:'x'.repeat(7000)}));assert.throws(()=>validateOutput('pronunciation',{heardText:'Bonjour.'}));
 assert.throws(()=>validateOutput('conversation',{reply:'Bonjour',englishHelp:'Hello',transcript:'',corrections:[],suggestedReplies:Array(4).fill('Oui')}));
 const messages=buildMessages({kind:'conversation',level:'A0',scenario:'cafe',text:'Un café.'},[{role:'user',content:'Bonjour'},{role:'assistant',content:'Bienvenue'}]);assert.equal(messages.length,4);assert.match(messages[0].content,/level A0/);
});
