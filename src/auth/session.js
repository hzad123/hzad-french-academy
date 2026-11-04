import {getRequestGate} from './rate-limit.js';
// Cache only the current auth session, not an entitlement decision.
// Every database request is still authorized by Supabase, RLS and the RPC.
const sessions = new WeakMap();
export class SessionRequiredError extends Error {
  constructor(message = 'Please sign in from the academy sign-in screen.') {
    super(message); this.name='SessionRequiredError'; this.code='HZAD_SESSION_REQUIRED';
  }
}
export function isSessionRequired(error) {
  return error?.code==='HZAD_SESSION_REQUIRED' || error?.name==='AuthSessionMissingError';
}
export function trackSession(client) {
  if (sessions.has(client)) return sessions.get(client);
  const state = {session:null, pending:null, epoch:0}; sessions.set(client,state);
  client.auth.onAuthStateChange?.((event, session) => {
    if (event==='SIGNED_OUT') { state.epoch++; state.session=null; }
    else if (session?.access_token) state.session=session;
  });
  return state;
}
function usable(session) {
  return !!session?.access_token && Number.isFinite(session.expires_at) && session.expires_at*1000>Date.now()+1000;
}
export function requireSession(client) {
  const state=trackSession(client);
  // Do not force proactive Auth refresh each time a student selects an answer.
  if (usable(state.session)) return Promise.resolve(state.session);
  if (state.pending) return state.pending;
  const epoch=state.epoch;
  const request=(async()=>{
    getRequestGate(client)?.assertReady('auth');
    const {data,error}=await client.auth.getSession();
    if (error) throw error;
    if (epoch!==state.epoch) throw new SessionRequiredError();
    const session=usable(state.session)?state.session:data?.session;
    if (!session?.access_token) throw new SessionRequiredError();
    if (!usable(session)) throw new Error('Supabase returned an already-expiring session. Check the device clock and the project JWT lifetime.');
    state.session=session; return session;
  })();
  state.pending=request;
  request.finally(()=>{if(state.pending===request)state.pending=null}).catch(()=>{});
  return request;
}
