import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrackerStore} from '../src/tracker/store.js';
test('tracker transport forwards only preferences/answer inputs and propagates authorization errors',async()=>{
 const calls=[],client={auth:{getSession:async()=>({data:{session:{access_token:'local-test',expires_at:Date.now()/1000+3600}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{units:[],notebook:[],skills:[]}}}};
 const store=makeTrackerStore(client);await store.snapshot(200);await store.preferences(10,null);await store.revise('a0-01','q1',1);
 assert.deepEqual(calls,[{name:'academy_tracker_snapshot',args:{p_offset:200}},
  {name:'academy_tracker_preferences',args:{p_minutes:10,p_level:null}},
  {name:'academy_tracker_revise',args:{p_unit_id:'a0-01',p_question_id:'q1',p_answer:1}}]);
 client.rpc=async()=>({error:Error('Not entitled')});await assert.rejects(store.snapshot,/Not entitled/);
});
test('signed-out users never reach tracker RPCs',async()=>{
 let calls=0;const store=makeTrackerStore({auth:{getSession:async()=>({data:{session:null}})},rpc:()=>{calls++}});
 await assert.rejects(store.snapshot,/sign in/);await assert.rejects(()=>store.revise('a0-01','q1',0),/sign in/);assert.equal(calls,0);
});
