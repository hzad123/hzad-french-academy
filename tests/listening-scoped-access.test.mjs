import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {scopedAuthoringAccess} from '../supabase/functions/academy-listening-qc/scoped-access.js';
test('temporary authoring access requires the exact random token, expires, and preserves existing admin auth',async()=>{
 const adminToken='existing-private-admin-value-32-characters',token='temporary-private-runner-value-32-characters';
 const tokenDigest=createHash('sha256').update(token).digest('hex');let time=1000;
 const handler=async r=>new Response(await r.text(),{status:r.headers.get('x-listening-qc-token')===adminToken?200:401});
 const scoped=scopedAuthoringAccess({handler,adminToken,tokenDigest,expiresAt:2000,now:()=>time});
 const request=value=>new Request('https://example.test',{method:'POST',headers:{'x-listening-qc-token':value},body:'{"stage":"health"}'});
 const allowed=await scoped(request(token));assert.equal(allowed.status,200);assert.equal(await allowed.text(),'{"stage":"health"}');
 assert.equal((await scoped(request('wrong-token-at-least-32-characters-long'))).status,401);
 assert.equal((await scoped(request(''))).status,401);
 time=2000;assert.equal((await scoped(request(token))).status,401);assert.equal((await scoped(request(adminToken))).status,200);
 assert.throws(()=>scopedAuthoringAccess({handler,adminToken,tokenDigest,expiresAt:time+9*3600000,now:()=>time}));
});
