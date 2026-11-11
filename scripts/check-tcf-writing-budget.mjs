// Conservative analytical launch bound, not a fabricated live API benchmark.
// Reference gpt-4o-mini pricing: USD $0.15/M input, $0.60/M output;
// CAD 2/USD includes a conservative FX buffer. One BPE token cannot contain
// less than one UTF-8 byte, so bytes + a framing allowance bound input tokens.
import {CURRENT_BANK,LEGACY_BANK} from '../supabase/functions/academy-tcf-writing/banks.js';
import {assessmentMessages} from '../supabase/functions/academy-tcf-writing/scoring.js';
import {WRITING_RESPONSE_FORMAT} from '../supabase/functions/academy-tcf-writing/response-schema.js';
const responses=['\u0000'.repeat(3500),'\u0000'.repeat(3000),''];
let largest=0;
for(const bank of [CURRENT_BANK,LEGACY_BANK])for(const test of bank.tests){
 const messages=assessmentMessages(test,responses);
 const bytes=messages.reduce((n,m)=>n+new TextEncoder().encode(m.content).length,0)+new TextEncoder().encode(JSON.stringify(WRITING_RESPONSE_FORMAT)).length;
 // Extra space covers role framing, word-count digits, and task JSON framing.
 largest=Math.max(largest,bytes+1024);
}
const microcad=Math.ceil((largest*.15+2000*.60)*2);
if(microcad>20000)throw Error('TCF writing exceeds its CAD $0.02 launch ceiling.');
console.log(JSON.stringify({model:'gpt-4o-mini',inputTokenUpperBound:largest,maxOutputTokens:2000,referenceInputUsdPerMillion:.15,referenceOutputUsdPerMillion:.60,cadPerUsdBuffer:2,conservativeMicrocad:microcad,reservedMicrocad:20000,credits:1,method:'analytical byte bound; no live AI call'}));
