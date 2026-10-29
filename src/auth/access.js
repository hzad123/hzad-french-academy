// Client-side UI check only. Supabase RLS must independently protect lesson data.
export async function checkAcademyAccess(client) {
  const {data:{user},error:userError} = await client.auth.getUser();
  if (userError || !user) return {kind:'signed_out'};
  if (!user.email_confirmed_at) return {kind:'unverified',user};
  const now = new Date().toISOString();
  const {data,error} = await client.from('purchase_entitlements')
    .select('id,product_code,access_ends_at')
    .eq('user_id',user.id).eq('status','active')
    .not('verified_at','is',null)
    .lte('access_starts_at',now)
    .or('access_ends_at.is.null,access_ends_at.gt.'+now)
    .limit(10);
  if (error) return {kind:'error',user,error};
  const active = (data||[]).some(e=>['HZAD_FULL_ACADEMY','FULL_ACADEMY'].includes(e.product_code));
  return {kind:active?'active':'pending',user};
}
