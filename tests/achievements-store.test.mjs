import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAchievementStore,verifyCertificate} from '../src/achievements/store.js';
test('private achievement requests carry answer provenance, never a client score or XP claim',async()=>{
 const calls=[],client={auth:{getSession:async()=>({data:{session:{access_token:'fixture',expires_at:Date.now()/1000+3600}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{}}}};
 const store=makeAchievementStore(client);await store.start('B1',true);await store.answer('attempt','question',2,true);await store.preferences('America/Winnipeg','Élodie','French learner');
 assert.deepEqual(calls,[{name:'academy_final_start',args:{p_level:'B1',p_text_support:true}},
  {name:'academy_final_answer',args:{p_attempt:'attempt',p_question:'question',p_choice:2,p_transcript:true}},
  {name:'academy_rewards_preferences',args:{p_timezone:'America/Winnipeg',p_name:'Élodie',p_title:'French learner'}}]);
});
test('signed-out callers cannot start private assessments',async()=>{
 let called=false;const store=makeAchievementStore({auth:{getSession:async()=>({data:{session:null}})},rpc:()=>{called=true}});
 await assert.rejects(()=>store.start('C2',false),/sign in/);assert.equal(called,false);
});
test('public certificate verification uses no bearer credential and rejects invalid input before network',async()=>{
 let request;
 const fetcher=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({valid:true,level:'A0'})}};
 const id='33333333-3333-4333-8333-333333333333';const result=await verifyCertificate(id,'Élodie',fetcher);
 assert.equal(result.valid,true);assert.equal(request.options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(request.options.body),{p_id:id,p_holder:'Élodie'});
 request=null;await assert.rejects(()=>verifyCertificate('invalid','Élodie',fetcher),/valid certificate ID/);assert.equal(request,null);
 await assert.rejects(()=>verifyCertificate(id,'Élodie',async()=>({ok:false})),/unavailable/);
});
