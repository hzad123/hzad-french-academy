// One shared session gate. Never treat a database or network error as a logout.
const inFlight = new WeakMap();
export class SessionRequiredError extends Error {
  constructor(message = 'Your login session is missing. Please sign in from the academy sign-in screen.') {
    super(message); this.name = 'SessionRequiredError'; this.code = 'HZAD_SESSION_REQUIRED';
  }
}
export function isSessionRequired(error) {
  return error?.code === 'HZAD_SESSION_REQUIRED' || error?.name === 'AuthSessionMissingError';
}
export function requireSession(client) {
  if (inFlight.has(client)) return inFlight.get(client);
  const request = (async () => {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data?.session?.access_token) throw new SessionRequiredError();
    return data.session;
  })();
  inFlight.set(client, request);
  request.finally(() => {
    if (inFlight.get(client) === request) inFlight.delete(client);
  }).catch(() => {});
  return request;
}
