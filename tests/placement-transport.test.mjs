import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {makePlacementStore} from '../src/placement/store.js';

test('placement transport sends only answer provenance and propagates server errors',async()=>{
 const calls=[];
 const client={auth:{getSession:async()=>({data:{session:{access_token:'test',expires_at:Date.now()/1000+3600}}})},rpc:async(name,args)=>{
  calls.push({name,args});return {data:{attempt:null,history:[]}};
 }};
 const store=makePlacementStore(client);
 await store.state();await store.start();await store.answer('attempt','question',2,'transcript');
 assert.deepEqual(calls,[
  {name:'academy_placement_state',args:{p_attempt:null}},
  {name:'academy_placement_start',args:undefined},
  {name:'academy_placement_answer',args:{p_attempt:'attempt',p_question:'question',p_choice:2,p_mode:'transcript'}}
 ]);
 client.rpc=async()=>({error:Error('Not entitled')});await assert.rejects(store.start,/Not entitled/);
 client.rpc=async()=>({data:{}});await assert.rejects(store.state,/Invalid placement response/);
});
test('signed-out placement requests never reach RPC',async()=>{
 let called=false;const client={auth:{getSession:async()=>({data:{session:null}})},rpc:()=>{called=true}};
 await assert.rejects(makePlacementStore(client).start,/sign in/);assert.equal(called,false);
});
test('versioned SQL seed exactly matches the maintained bank',()=>{
 execFileSync(process.execPath,['scripts/generate-placement-seed.mjs','--check']);
});
