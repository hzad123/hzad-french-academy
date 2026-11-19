import test from 'node:test';
import assert from 'node:assert/strict';
import { createGithubOidcProxy, AUDIENCE, ISSUER, JWKS_URL, SOURCE_REPO, SOURCE_REF, WORKFLOW_REF } from '../supabase/functions/academy-listening-oidc/gateway.js';
import { githubOidcFetch, OIDC_AUDIENCE } from '../scripts/lib/listening-github-oidc.mjs';

const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
async function fixture() {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  jwk.kid = 'fixture';
  jwk.use = 'sig';
  const payload = { iss: ISSUER, aud: AUDIENCE, exp: Math.floor(Date.now()/1000)+300,
    iat: Math.floor(Date.now()/1000), repository: SOURCE_REPO, repository_id: '1439034192',
    repository_owner_id: '182556128', ref: SOURCE_REF, ref_type: 'branch',
    event_name: 'push', workflow_ref: WORKFLOW_REF, run_id: '444999222' };
  const signed = async (claims=payload) => {
    const header=encode({alg:'RS256',kid:'fixture',typ:'JWT'});
    const body=encode(claims);
    const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, Buffer.from(header+'.'+body));
    return header+'.'+body+'.'+Buffer.from(signature).toString('base64url');
  };
  const calls=[];
  const handler=createGithubOidcProxy({ fetcher:async (url, init) => {
    calls.push({url:String(url),headers:init?.headers,body:init?.body});
    if(String(url)===JWKS_URL)return Response.json({keys:[jwk]});
    return Response.json({stage:'health',ready:true});
  }, env: key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'very-private-service-role',LISTENING_QC_ADMIN_TOKEN:'another-very-private-credential-long'}[key]) });
  const request=async token=>handler(new Request('https://example.supabase.co/functions/v1/academy-listening-oidc',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{"stage":"health"}'}));
  return {payload,signed,handler,request,calls};
}

test('only the exact signed GitHub review workflow reaches the private QC service', async()=>{
  const {request,calls,signed,payload}=await fixture();
  let response=await request(await signed());
  assert.equal(response.status,200);
  assert.equal(calls.filter(c=>c.url.includes('/functions/v1/academy-listening-qc')).length,1);
  const internal=calls.find(c=>c.url.includes('/functions/v1/academy-listening-qc'));
  assert.equal(internal.headers.Authorization,'Bearer very-private-service-role');
  assert.equal(internal.headers['x-listening-qc-token'],'another-very-private-credential-long');
  assert.equal((await response.text()).includes('very-private'),false);
  for(const changes of [{repository:'attacker/other'}, {ref:'refs/heads/main'},
    {workflow_ref:'attacker/.github/workflows/any.yml@refs/heads/main'},
    {event_name:'pull_request'}, {aud:'wrong-audience'}, {repository_id:'wrong-id'},
    {exp:Math.floor(Date.now()/1000)-10}]) {
    response=await request(await signed({...payload,...changes}));
    assert.equal(response.status,401, JSON.stringify(changes));
  }
  assert.equal(calls.filter(c=>c.url.includes('/functions/v1/academy-listening-qc')).length,1);
  const originalToken=await signed();
  const segments=originalToken.split('.');
  segments[2]=(segments[2][0]==='A'?'B':'A')+segments[2].slice(1);
  response=await request(segments.join('.'));
  assert.equal(response.status,401);
});

test('workflow OIDC fetch refreshes credentials and never forwards dummy auth', async()=>{
  const now=Date.now();
  let fetches=0;
  const claims={exp:Math.floor(now/1000)+300};
  const fakeToken='x.'+encode(claims)+'.y';
  const fetcher=async(url,init)=>{
    fetches++;
    if(String(url).startsWith('https://oidc.example/'))return Response.json({value:fakeToken});
    assert.equal(init.headers.get('Authorization'),'Bearer '+fakeToken);
    assert.equal(init.headers.get('apikey'),null);
    assert.equal(init.headers.get('x-listening-qc-token'),null);
    return Response.json({ready:true});
  };
  const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:SOURCE_REPO,GITHUB_REF:SOURCE_REF,
    ACTIONS_ID_TOKEN_REQUEST_URL:'https://oidc.example/token?query=1', ACTIONS_ID_TOKEN_REQUEST_TOKEN:'ephemeral-request-token'};
  assert.equal(OIDC_AUDIENCE,AUDIENCE);
  const wrapped=githubOidcFetch({env,now:()=>now,fetcher});
  for(let i=0;i<3;i++)assert.equal((await wrapped('https://example.supabase.co/endpoint',{headers:{apikey:'old','x-listening-qc-token':'dummy'}})).status,200);
  assert.equal(fetches,4);
  assert.throws(()=>githubOidcFetch({env:{...env,GITHUB_REF:'refs/heads/main'},fetcher}),/authorized review branch/);
});
