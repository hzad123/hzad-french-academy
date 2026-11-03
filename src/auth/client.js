import {requireSession,trackSession} from './session.js';
import {createRequestGate,attachRequestGate} from './rate-limit.js';
export const SESSION_BUILD='rate-v3-20261103';
const REGISTRY=Symbol.for('hzad.academy.clients.rate-v3');
export function createSessionStorage(backing,events){
  const cache=new Map();
  const storage={
    getItem(key){if(cache.has(key))return cache.get(key);let value=null;try{value=backing?.getItem(key)??null}catch{}cache.set(key,value);return value},
    setItem(key,value){cache.set(key,value);try{backing?.setItem(key,value)}catch{}},
    removeItem(key){cache.set(key,null);try{backing?.removeItem(key)}catch{}}
  };
  events?.addEventListener?.('storage',event=>{
    if(event.storageArea&&event.storageArea!==backing)return;
    if(event.key===null)cache.clear();else if(cache.has(event.key))cache.set(event.key,event.newValue);
  });
  return storage;
}
// Retained for tests and non-SDK consumers: never send a public key as user identity.
export function createAuthenticatedFetch(getClient,fetcher,projectUrl){
  const project=new URL(projectUrl);
  return async(input,init={})=>{
    const raw=typeof input==='string'?input:input.url||String(input);
    const target=new URL(raw,project);
    if(target.origin!==project.origin||!target.pathname.startsWith('/rest/v1/'))return fetcher(input,init);
    const session=await requireSession(getClient());
    const headers=new Headers(typeof input==='object'?input.headers:undefined);
    new Headers(init.headers).forEach((value,name)=>headers.set(name,value));
    headers.set('Authorization','Bearer '+session.access_token);
    return fetcher(input,{...init,headers});
  };
}
export function getAcademyClient(createClient,url,publicKey,runtime=globalThis){
  const scope=/\/a0-preview(?:\/|$)/.test(runtime.location?.pathname||'')?'preview':'portal';
  const project=new URL(url).hostname.split('.')[0];
  // Keep v2 storage so this deployment does not force another login.
  const storageKey=`hzad-${project}-${scope}-auth-v2`;
  const registry=runtime[REGISTRY]||(runtime[REGISTRY]=new Map());
  const registryKey=url+'|'+storageKey;
  if(registry.has(registryKey))return registry.get(registryKey);
  let backing;try{backing=runtime.localStorage}catch{}
  const gate=createRequestGate(runtime.fetch.bind(runtime),url,{storage:backing});
  const authClient=createClient(url,publicKey,{
    auth:{storageKey,storage:createSessionStorage(backing,runtime),persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
    global:{fetch:gate.fetch}
  });
  const client={auth:authClient.auth};
  attachRequestGate(client,gate);trackSession(client);
  // This transport has NO second Auth session. It consumes the one current JWT.
  // SDK database calls no longer invoke auth.getSession/refresh for every request.
  const database=createClient(url,publicKey,{
    accessToken:async()=> (await requireSession(client)).access_token,
    global:{fetch:gate.fetch}
  });
  client.from=(...args)=>database.from(...args);
  client.rpc=(...args)=>database.rpc(...args);
  registry.set(registryKey,client);return client;
}
