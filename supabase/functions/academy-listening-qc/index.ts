import {createQcHandler} from './handler.js';
Deno.serve(createQcHandler({
 adminToken:Deno.env.get('LISTENING_QC_ADMIN_TOKEN')||'',
 providerKey:Deno.env.get('OPENAI_API_KEYfrench')||Deno.env.get('OPENAI_API_KEY')||''
}));
