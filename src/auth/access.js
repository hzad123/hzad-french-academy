import {requireSession,isSessionRequired} from './session.js';
// Deduplicate simultaneous dashboard/open-lesson checks. Never trust this for
// paid-content authorization: the server rechecks entitlement in every RPC.
const checks=new WeakMap();
export async function checkAcademyAccess(client){
  let session;
  try{session=await requireSession(client)}
  catch(error){return {kind:isSessionRequired(error)?'signed_out':'error',error}}
  const token=session.access_token,user=session.user;
  if(!user?.id)return {kind:'signed_out'};
  const old=checks.get(client);
  if(old?.token===token&&old.until>Date.now())return old.promise;
  const record={token,until:Infinity,promise:null};
  const promise=(async()=>{
    // Display metadata only; actual identity comes from the JWT verified by RLS.
    // Calling getUser here hit Auth again on every focus and lesson reopen.
    const now=new Date().toISOString();
    const {data,error}=await client.from('purchase_entitlements')
      .select('id,product_code,access_ends_at').eq('user_id',user.id).eq('status','active')
      .in('product_code',['HZAD_FULL_ACADEMY','FULL_ACADEMY'])
      .not('verified_at','is',null).lte('access_starts_at',now)
      .or('access_ends_at.is.null,access_ends_at.gt.'+now).limit(1);
    if(error)return {kind:'error',user,error};
    if(!user.email_confirmed_at)return {kind:'unverified',user};
    return {kind:data?.length?'active':'pending',user};
  })();
  record.promise=promise;checks.set(client,record);
  try{
    const result=await promise;
    record.until=Date.now()+(result.kind==='error'?0:10000);
    return result;
  }catch(error){checks.delete(client);return {kind:'error',user,error}}
}
