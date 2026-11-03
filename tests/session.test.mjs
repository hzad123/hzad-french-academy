import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionStorage, createAuthenticatedFetch, getAcademyClient} from '../src/auth/client.js';
import {requireSession} from '../src/auth/session.js';

function backing(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values}}
test('a saved session survives backing-store loss within the page',()=>{
 const disk=backing(),storage=createSessionStorage(disk);
 storage.setItem('auth','session');disk.values.clear();
 assert.equal(storage.getItem('auth'),'session');
 storage.removeItem('auth');assert.equal(storage.getItem('auth'),null);
});
test('storage exceptions do not discard a freshly issued session',()=>{
 const disk={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 const storage=createSessionStorage(disk);storage.setItem('auth','session');
 assert.equal(storage.getItem('auth'),'session');storage.removeItem('auth');assert.equal(storage.getItem('auth'),null);
});
test('cross-tab explicit signout clears the cached session',()=>{
 let listener;const disk=backing();
 const storage=createSessionStorage(disk,{addEventListener:(_name,callback)=>listener=callback});
 storage.setItem('auth','session');listener({storageArea:disk,key:'auth',newValue:null});
 assert.equal(storage.getItem('auth'),null);
});
test('simultaneous session checks share one SDK session request',async()=>{
 let calls=0;const client={auth:{async getSession(){calls++;await new Promise(r=>setTimeout(r,5));return {data:{session:{access_token:'student'}}}}}};
 const result=await Promise.all([requireSession(client),requireSession(client),requireSession(client)]);
 assert.equal(calls,1);assert.equal(result[0].access_token,'student');
});
test('protected REST requests always carry the current student token',async()=>{
 const sent=[];const client={auth:{async getSession(){return {data:{session:{access_token:'student'}}}}}};
 const request=createAuthenticatedFetch(()=>client,async(url,init)=>{sent.push(init);return 'ok'},'https://example.supabase.co');
 await request('https://example.supabase.co/rest/v1/rpc/academy_check_answer',{method:'POST',headers:{apikey:'public',Authorization:'Bearer public'}});
 assert.equal(sent[0].headers.get('Authorization'),'Bearer student');
 assert.equal(sent[0].headers.get('apikey'),'public');
});
test('a missing session never sends an anonymous protected request',async()=>{
 let sent=false;const client={auth:{async getSession(){return {data:{session:null}}}}};
 const request=createAuthenticatedFetch(()=>client,async()=>{sent=true},'https://example.supabase.co');
 await assert.rejects(()=>request('https://example.supabase.co/rest/v1/rpc/academy_check_answer'),{code:'HZAD_SESSION_REQUIRED'});
 assert.equal(sent,false);
});
test('auth and other-origin requests do not receive a student token',async()=>{
 const sent=[];const client={auth:{getSession(){throw Error('must not run')}}};
 const request=createAuthenticatedFetch(()=>client,async(url,init)=>{sent.push(init);return 'ok'},'https://example.supabase.co');
 await request('https://example.supabase.co/auth/v1/token',{headers:{apikey:'public'}});
 await request('https://other.example/rest/v1/rpc/x',{headers:{}});
 assert.equal(sent[0].headers.Authorization,undefined);assert.equal(sent[1].headers.Authorization,undefined);
});
test('one client per page and separate preview/portal storage keys',()=>{
 const options=[];const runtime={location:{pathname:'/hzad-french-academy/a0-preview/'},localStorage:backing(),fetch:async()=>{}};
 const factory=(_url,_key,settings)=>{options.push(settings);return {auth:{}}};
 const first=getAcademyClient(factory,'https://example.supabase.co','public',runtime);
 assert.equal(getAcademyClient(factory,'https://example.supabase.co','public',runtime),first);
 assert.equal(options.length,1);assert.match(options[0].auth.storageKey,/-preview-auth-v2$/);
 runtime.location.pathname='/hzadfrenchacademy';
 assert.notEqual(getAcademyClient(factory,'https://example.supabase.co','public',runtime),first);
 assert.match(options[1].auth.storageKey,/-portal-auth-v2$/);
});
