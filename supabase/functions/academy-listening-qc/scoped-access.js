// Optional time-limited authoring access, deployed only by a project admin.
// Only a SHA-256 digest is deployed; the random bearer stays in the runner.
// Existing JWT verification and the permanent admin credential stay enabled.
export function scopedAuthoringAccess({handler,adminToken,tokenDigest,expiresAt,now=Date.now}){
 if(!/^[a-f0-9]{64}$/.test(tokenDigest)||!Number.isFinite(expiresAt)||expiresAt>now()+8*3600000)throw Error('Invalid scoped authoring configuration');
 return async request=>{
  const supplied=request.headers.get('x-listening-qc-token')||'';
  if(now()<expiresAt&&supplied.length>=32&&supplied.length<=256&&adminToken.length>=32){
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied));
   const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   if(digest===tokenDigest){const headers=new Headers(request.headers);headers.set('x-listening-qc-token',adminToken);return handler(new Request(request,{headers}));}
  }
  return handler(request);
 };
}
