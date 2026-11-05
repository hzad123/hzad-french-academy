// Only server-side environment names; no credential values enter public assets.
export function providerKey(read){
 return String(read('OPENAI_API_KEYfrench')||'').trim()||String(read('OPENAI_API_KEY')||'').trim();
}
