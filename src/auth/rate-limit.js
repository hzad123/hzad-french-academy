// Respect server throttling. Never retry writes or increase the server's limits.
const gates = new WeakMap();
export function attachRequestGate(client, gate) { gates.set(client, gate); }
export function getRequestGate(client) { return gates.get(client); }
export function isRateLimited(error) {
  return error?.status === 429 || error?.code === 'HZAD_RATE_LIMIT' ||
    error?.code === 'over_request_rate_limit' || /rate limit|HTTP 429/i.test(error?.message || '');
}
export class RateLimitError extends Error {
  constructor(state, now = Date.now()) {
    const seconds = Math.max(1, Math.ceil((state.until - now) / 1000));
    super(`Supabase paused requests to ${state.endpoint} (HTTP 429). Retry available in ${seconds} seconds.`);
    this.name = 'RateLimitError'; this.code = 'HZAD_RATE_LIMIT'; this.status = 429;
    this.retryAt = state.until; this.endpoint = state.endpoint;
  }
}
export function retryAfterMs(value, now) {
  if (value && /^\d+(?:\.\d+)?$/.test(value)) return Math.max(1000, Number(value) * 1000);
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) && date > now ? date - now : 60000;
}
export function createRequestGate(fetcher, projectUrl, options = {}) {
  const origin = new URL(projectUrl).origin;
  const now = options.now || Date.now;
  const key = 'hzad-rate-cooldown-' + new URL(projectUrl).hostname;
  const states = new Map();
  const counters = Object.create(null);
  const sync = () => {
    try {
      const saved = JSON.parse(options.storage?.getItem(key) || '{}');
      for (const scope of ['auth', 'rest']) {
        const item = saved[scope];
        if (item && Number.isFinite(item.until) && typeof item.endpoint === 'string' &&
            item.until > (states.get(scope)?.until || 0)) states.set(scope, item);
      }
    } catch { /* cooldown remains in memory if storage is blocked */ }
  };
  const current = scope => { sync(); const s = states.get(scope); return s?.until > now() ? s : null; };
  const assertReady = scope => { const s = current(scope); if (s) throw new RateLimitError(s, now()); };
  function pausedResponse(state) {
    const error = new RateLimitError(state, now());
    const message = error.message;
    return new Response(JSON.stringify({code:'over_request_rate_limit', error_code:'over_request_rate_limit',
      message, msg:message, error_description:message}), {
      status:429, headers:{'Content-Type':'application/json',
        'Retry-After':String(Math.max(1, Math.ceil((state.until-now())/1000)))}
    });
  }
  async function guardedFetch(input, init = {}) {
    const target = new URL(typeof input === 'string' ? input : input.url || String(input), origin);
    const scope = target.pathname.startsWith('/auth/v1/') ? 'auth' : target.pathname.startsWith('/rest/v1/') ? 'rest' : null;
    if (target.origin !== origin || !scope) return fetcher(input, init);
    const held = current(scope);
    if (held) return pausedResponse(held);
    // Safe diagnostics: counts and endpoint paths only, never headers or bodies.
    counters[target.pathname] = (counters[target.pathname] || 0) + 1;
    const response = await fetcher(input, init);
    if (response.status !== 429) return response;
    const state = {until:now() + retryAfterMs(response.headers.get('Retry-After'), now()), endpoint:target.pathname};
    states.set(scope, state);
    try { options.storage?.setItem(key, JSON.stringify(Object.fromEntries(states))); } catch { /* memory fallback */ }
    return pausedResponse(state);
  }
  return {fetch:guardedFetch, current, assertReady, diagnostics:()=>({...counters})};
}
// Pause the affected controls, retaining one error panel instead of repeated errors.
export function showCooldown(target, client, error, onReady = () => {}) {
  const gate = getRequestGate(client);
  const state = gate?.current('rest') || gate?.current('auth');
  const until = state?.until || error?.retryAt || Date.now()+60000;
  target.setAttribute('role','status');
  const tick = () => {
    if (!target.isConnected) { clearInterval(timer); return; }
    const seconds = Math.max(0, Math.ceil((until-Date.now())/1000));
    target.textContent = seconds ? `Requests are temporarily paused. Retry available in ${seconds} seconds. Your answers have not been submitted again.` : 'You can retry now.';
    if (!seconds) { clearInterval(timer); onReady(); }
  };
  const timer = setInterval(tick, 1000); tick();
  return () => clearInterval(timer);
}
