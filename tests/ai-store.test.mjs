import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAiStore} from '../src/ai/store.js';
import {SUPABASE_URL} from '../src/config.js';
test('AI requests send only the current student token to the project edge function and never retry a write automatically',async()=>{
 let calls=0;const client={auth:{getSession:async()=>({data:{session:{access_token:'student-token',expires_at:Date.now()/1000+100,user:{id:'student'}}}})}};
 const store=makeAiStore(client,async(url,options)=>{calls++;assert.equal(url,SUPABASE_URL+'/functions/v1/academy-ai');assert.equal(options.headers.Authorization,'Bearer student-token');assert.equal(options.method,'POST');throw Error('lost response')});
 await assert.rejects(()=>store.submit({id:'same-id',kind:'writing',text:'Bonjour'}),/lost response/);assert.equal(calls,1);
});
test('signed-out callers cannot reach AI; 429 pauses subsequent calls',async()=>{
 let calls=0;const denied=makeAiStore({auth:{getSession:async()=>({data:{session:null}})}},async()=>{calls++});await assert.rejects(()=>denied.state(),/sign in/);assert.equal(calls,0);
 const client={auth:{getSession:async()=>({data:{session:{access_token:'jwt',expires_at:Date.now()/1000+100}}})}};
 const store=makeAiStore(client,async()=>{calls++;return new Response('{"error":"Slow down"}',{status:429,headers:{'Retry-After':'60'}})});
 await assert.rejects(()=>store.state(),/Slow down/);await assert.rejects(()=>store.state(),/paused/);assert.equal(calls,1);
});
