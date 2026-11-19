import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BANK} from '../supabase/functions/academy-tef-speaking/bank.js';
import {TESTS} from '../supabase/functions/academy-tcf-speaking/bank.js';
import {createTefSpeakingProvider} from '../supabase/functions/academy-tef-speaking/provider.js';
import {createSpeakingProvider} from '../supabase/functions/academy-tcf-speaking/provider.js';
const audio=Buffer.from('saved user WAV').toString('base64');
const student='Moi je aller au parc et euh...';
test('TEF examiner HTTP 400 recovers once without transcribing again or rewriting student mistakes',async()=>{
 let asr=0,examiner=0;
 const provider=createTefSpeakingProvider({key:'fixture',fetcher:async(url,opts)=>{
  if(url.endsWith('/audio/transcriptions')){asr++;return Response.json({text:student,languages:[{code:'fr'}]})}
  examiner++;
  const body=JSON.parse(opts.body);
  if(examiner===1){assert.equal(body.model,'gpt-audio-mini');return Response.json({error:{code:'invalid_request_error'}},{status:400})}
  assert.equal(body.model,'gpt-4o-mini');assert.equal(body.messages.at(-1).content.includes(student),true);
  return Response.json({model:'gpt-4o-mini',choices:[{message:{content:JSON.stringify({
   transcript:'Moi je vais au parc.',intelligible:true,reply:'Le parc ouvre samedi.',
   questionAsked:false,observations:[]
  })}}]});
 }});
 const attempt={test_id:BANK.tests[0].id,version:BANK.version,phase:0,calls:[]};
 const out=await provider.run({kind:'turn',audio,attempt},{model:'gpt-audio-mini',maxOutputTokens:1600});
 assert.equal(asr,1);assert.equal(examiner,2);assert.equal(out.result.transcript,student);
 assert.equal(out.result.reply,'Le parc ouvre samedi.');
});
test('TCF examiner HTTP 400 recovers once without changing student transcript or wallet behavior',async()=>{
 let asr=0,examiner=0;
 const provider=createSpeakingProvider({key:'fixture',fetcher:async(url,opts)=>{
  if(url.endsWith('/audio/transcriptions')){asr++;return Response.json({text:student})}
  examiner++;
  const body=JSON.parse(opts.body);
  if(examiner===1){assert.equal(body.model,'gpt-audio-mini');return Response.json({error:{code:'invalid_request_error'}},{status:400})}
  assert.equal(body.model,'gpt-4o-mini');
  return Response.json({choices:[{message:{content:JSON.stringify({reply:'D’accord, et ensuite ?'})}}]});
 }});
 const paper=TESTS[0],attempt={test_id:paper.id,version:paper.version,phase:2,calls:[]};
 const out=await provider.run({kind:'turn',audio,attempt},{model:'gpt-audio-mini',maxOutputTokens:1000});
 assert.equal(asr,1);assert.equal(examiner,2);assert.equal(out.result.transcript,student);
 assert.equal(out.result.reply,'D’accord, et ensuite ?');
});
