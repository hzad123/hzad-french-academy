import {build} from 'esbuild';
// Compile the actual TypeScript entry and local server modules without invoking
// Deno, opening a port, using credentials, or contacting an AI provider.
await build({entryPoints:['supabase/functions/academy-ai/index.ts','supabase/functions/academy-exams/index.ts','supabase/functions/academy-exam-audio/index.ts'],bundle:true,outdir:'/tmp/hzad-edge-check',platform:'neutral',format:'esm',write:false});
console.log('AI Edge Function bundle checked (live Deno/provider validation still requires staging).');
