// Standalone, restricted proxy for the existing private TCF listening evaluator.
// No provider key, Supabase privileged key, or authoring token leaves Supabase.
export const AUDIENCE = 'hzad-listening-qc-ogntvgvzmjrnppcullsj';
export const ISSUER = 'https://token.actions.githubusercontent.com';
export const JWKS_URL = ISSUER + '/.well-known/jwks';
export const SOURCE_REPO = 'hzad123/hzad-french-academy';
export const SOURCE_REF = 'refs/heads/fix/listening-six-blind-cues-v5';
export const WORKFLOW_REF = SOURCE_REPO + '/.github/workflows/listening-answer-qc.yml@' + SOURCE_REF;
const unauthorized = () => Response.json({ error: 'QC_OIDC_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
const b64 = text => {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+$/.test(text)) throw Error('malformed-jwt');
  const chars = atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '='));
  return Uint8Array.from(chars, c => c.charCodeAt(0));
};
const readJson = text => JSON.parse(new TextDecoder().decode(b64(text)));
export function createGithubOidcProxy({ fetcher = fetch, webCrypto = crypto, env = name => Deno.env.get(name), now = () => Date.now() } = {}) {
  let cachedKeys = null;
  let validUntil = 0;
  async function keysFor(kid) {
    if (!cachedKeys || now() >= validUntil || !cachedKeys.some(key => key.kid === kid)) {
      const response = await fetcher(JWKS_URL, { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw Error('jwks-unavailable');
      const document = await response.json();
      if (!Array.isArray(document.keys) || !document.keys.length) throw Error('jwks-empty');
      cachedKeys = document.keys;
      validUntil = now() + 300000;
    }
    return cachedKeys.filter(key => key.kid === kid && key.kty === 'RSA' && (!key.use || key.use === 'sig'));
  }
  async function authorized(raw) {
    if (typeof raw !== 'string' || raw.length > 12000) return false;
    const parts = raw.split('.');
    if (parts.length !== 3) return false;
    const header = readJson(parts[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false;
    const candidates = await keysFor(header.kid);
    if (candidates.length !== 1) return false;
    const key = await webCrypto.subtle.importKey('jwk', candidates[0], { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await webCrypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!valid) return false;
    const payload = readJson(parts[1]);
    const seconds = Math.floor(now() / 1000);
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE ||
        !Number.isInteger(payload.exp) || payload.exp <= seconds || payload.exp > seconds + 600 ||
        !Number.isInteger(payload.iat) || payload.iat > seconds + 30 ||
        (payload.nbf !== undefined && payload.nbf > seconds + 30) ||
        payload.repository !== SOURCE_REPO || String(payload.repository_id) !== '1439034192' ||
        String(payload.repository_owner_id) !== '182556128' ||
        payload.ref !== SOURCE_REF || payload.ref_type !== 'branch' ||
        payload.workflow_ref !== WORKFLOW_REF || payload.event_name !== 'push' ||
        !/^\d+$/.test(String(payload.run_id || ''))) return false;
    return true;
  }
  return async request => {
    if (request.method !== 'POST') return unauthorized();
    const bearer = request.headers.get('authorization') || '';
    if (!bearer.startsWith('Bearer ')) return unauthorized();
    try { if (!(await authorized(bearer.slice(7)))) return unauthorized(); }
    catch { return unauthorized(); }
    const secret = env('SUPABASE_SERVICE_ROLE_KEY');
    const admin = env('LISTENING_QC_ADMIN_TOKEN');
    const base = env('SUPABASE_URL');
    if (!secret || !admin || admin.length < 32 || !base?.startsWith('https://')) {
      return Response.json({ error: 'QC_PRIVATE_SERVICE_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const body = await request.arrayBuffer();
    if (body.byteLength > 350000) return Response.json({ error: 'QC_INPUT_LIMIT' }, { status: 413 });
    try {
      const response = await fetcher(base + '/functions/v1/academy-listening-qc', {
        method: 'POST', headers: { Authorization: 'Bearer ' + secret, apikey: secret,
          'x-listening-qc-token': admin, 'Content-Type': 'application/json' },
        body, signal: AbortSignal.timeout(117000)
      });
      // Deliver the original validator result and error status unchanged, without ever returning credentials.
      return new Response(response.body, { status: response.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch { return Response.json({ error: 'QC_PRIVATE_SERVICE_UNAVAILABLE' }, { status: 502 }); }
  };
}
