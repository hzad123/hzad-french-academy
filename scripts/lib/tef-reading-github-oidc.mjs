// Fresh, short-lived GitHub-signed identity for each group of private QC requests.
// Never write the bearer to logs, files, persistent cache, or authoring receipts.
export const OIDC_AUDIENCE = 'hzad-tef-reading-qc-ogntvgvzmjrnppcullsj';
export function githubOidcFetch({ fetcher = fetch, env = process.env, now = () => Date.now() } = {}) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== 'hzad123/hzad-french-academy' ||
      env.GITHUB_REF !== 'refs/heads/fix/tef-reading-six-blind-distractors-20261120' ||
      !env.ACTIONS_ID_TOKEN_REQUEST_URL || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw Error('GitHub workflow OIDC is not available on the authorized review branch');
  }
  let cachedToken = null;
  let validUntil = 0;
  let pending = null;
  async function token() {
    if (cachedToken && now() + 90000 < validUntil) return cachedToken;
    if (pending) return pending;
    pending = (async () => {
      const endpoint = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
      endpoint.searchParams.set('audience', OIDC_AUDIENCE);
      const response = await fetcher(endpoint, { headers: { Authorization: 'Bearer ' + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('GitHub OIDC request failed');
      const body = await response.json();
      if (!/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(body.value || '')) throw Error('Malformed GitHub OIDC response');
      const raw = body.value;
      const payload = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString('utf8'));
      if (!Number.isInteger(payload.exp) || payload.exp * 1000 < now() + 30000) throw Error('Expired GitHub OIDC response');
      cachedToken = raw;
      validUntil = payload.exp * 1000;
      return cachedToken;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return async (url, init = {}) => {
    const bearer = await token();
    const headers = new Headers(init.headers);
    headers.set('Authorization', 'Bearer ' + bearer);
    headers.delete('apikey');
    headers.delete('x-tef-reading-qc-token');
    return fetcher(url, { ...init, headers });
  };
}
