import {requireSession, isSessionRequired} from './session.js';

// The database independently enforces entitlements. UI state is never authority.
export async function checkAcademyAccess(client) {
  let session;
  try { session = await requireSession(client); }
  catch (error) { return {kind: isSessionRequired(error) ? 'signed_out' : 'error', error}; }
  const {data, error: userError} = await client.auth.getUser(session.access_token);
  if (userError) {
    const signedOut = isSessionRequired(userError) || userError.status === 401 || userError.status === 403;
    return {kind: signedOut ? 'signed_out' : 'error', error: userError};
  }
  const user = data?.user;
  if (!user) return {kind: 'signed_out'};
  if (!user.email_confirmed_at) return {kind: 'unverified', user};
  const now = new Date().toISOString();
  const {data: entitlements, error} = await client.from('purchase_entitlements')
    .select('id,product_code,access_ends_at')
    .eq('user_id', user.id).eq('status', 'active')
    .in('product_code', ['HZAD_FULL_ACADEMY', 'FULL_ACADEMY'])
    .not('verified_at', 'is', null).lte('access_starts_at', now)
    .or('access_ends_at.is.null,access_ends_at.gt.' + now).limit(1);
  if (error) return {kind: 'error', user, error};
  return {kind: entitlements?.length ? 'active' : 'pending', user};
}
