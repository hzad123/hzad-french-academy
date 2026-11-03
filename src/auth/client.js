import {requireSession} from './session.js';

export const SESSION_BUILD = 'session-v2-20261103';
const REGISTRY = Symbol.for('hzad.academy.clients.session-v2');

// Mirror the SDK's storage in this page. A storage outage must not erase a
// just-issued session. SDK signOut/removeItem and cross-tab logout still clear it.
export function createSessionStorage(backing, events) {
  const cache = new Map();
  const storage = {
    getItem(key) {
      if (cache.has(key)) return cache.get(key);
      let value = null;
      try { value = backing?.getItem(key) ?? null; } catch { /* memory-only mode */ }
      cache.set(key, value);
      return value;
    },
    setItem(key, value) {
      cache.set(key, value);
      try { backing?.setItem(key, value); } catch { /* keep session in this page */ }
    },
    removeItem(key) {
      // Cache a tombstone even if persistent storage is unavailable.
      cache.set(key, null);
      try { backing?.removeItem(key); } catch { /* do not restore a signed-out session */ }
    }
  };
  events?.addEventListener?.('storage', event => {
    if (event.storageArea && event.storageArea !== backing) return;
    if (event.key === null) cache.clear();
    else if (cache.has(event.key)) cache.set(event.key, event.newValue);
  });
  return storage;
}

// Never allow a protected database call to fall back to the public API key as
// its identity. Only forward a token to this project's REST API, never elsewhere.
export function createAuthenticatedFetch(getClient, fetcher, projectUrl) {
  const project = new URL(projectUrl);
  return async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url || String(input);
    const target = new URL(raw, project);
    if (target.origin !== project.origin || !target.pathname.startsWith('/rest/v1/')) {
      return fetcher(input, init);
    }
    const session = await requireSession(getClient());
    const headers = new Headers(typeof input === 'object' ? input.headers : undefined);
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    headers.set('Authorization', 'Bearer ' + session.access_token);
    return fetcher(input, {...init, headers});
  };
}

export function getAcademyClient(createClient, url, publicKey, runtime = globalThis) {
  const scope = /\/a0-preview(?:\/|$)/.test(runtime.location?.pathname || '') ? 'preview' : 'portal';
  const project = new URL(url).hostname.split('.')[0];
  // Separate the updated preview from older portal tabs and their auth storage.
  const storageKey = `hzad-${project}-${scope}-auth-v2`;
  const registry = runtime[REGISTRY] || (runtime[REGISTRY] = new Map());
  const registryKey = url + '|' + storageKey;
  if (registry.has(registryKey)) return registry.get(registryKey);
  let backing;
  try { backing = runtime.localStorage; } catch { /* memory-only mode */ }
  const storage = createSessionStorage(backing, runtime);
  let client;
  const fetcher = createAuthenticatedFetch(() => client, runtime.fetch.bind(runtime), url);
  client = createClient(url, publicKey, {
    auth: {storageKey, storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true},
    global: {fetch: fetcher}
  });
  registry.set(registryKey, client);
  return client;
}
