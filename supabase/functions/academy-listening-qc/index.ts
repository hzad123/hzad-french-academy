import {createQcHandler} from './handler.js';
Deno.serve(createQcHandler({
 serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',
 providerKey:Deno.env.get('OPENAI_API_KEYfrench')||Deno.env.get('OPENAI_API_KEY')||''
}));
