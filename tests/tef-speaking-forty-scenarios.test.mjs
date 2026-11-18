import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BANK} from '../supabase/functions/academy-tef-speaking/bank.js';
import {createTefSpeakingProvider,validateTefFeedback} from '../supabase/functions/academy-tef-speaking/provider.js';
test('All 40 TEF oral scenarios independently dispatch the intended A/B examiner role in French',async()=>{
 let total=0;
 for(const paper of BANK.tests){
  const histories=[{id:'11111111-1111-4111-8111-111111111111',phase:0,kind:'turn',status:'completed',
   result:{transcript:'Quels sont les horaires ?',reply:'Le samedi.',intelligible:true,observations:[],seconds:5}},
   {id:'22222222-2222-4222-8222-222222222222',phase:2,kind:'turn',status:'completed',
    result:{transcript:'Je te conseille de participer, car cela serait enrichissant.',reply:'Et si je ne suis pas prêt ?',intelligible:true,observations:[],seconds:8}}];
  for(const phase of [0,2]){
   let promptSeen=false;
   const provider=createTefSpeakingProvider({key:'fixture',fetcher:async(url,opts)=>{
    if(url.endsWith('/audio/transcriptions'))return Response.json({text:phase===0?'Bonjour, pourriez-vous préciser vos horaires ?':'Je voudrais te convaincre de venir.'});
    const payload=JSON.parse(opts.body);
    const system=payload.messages[0].content;
    const student=payload.messages[1].content;
    const section=paper.sections[phase===0?0:1];
    assert(student.includes(section.document));assert(system.includes('français'));
    if(phase===0){
     assert(system.includes(section.privateRole));assert(system.includes(section.privateFacts));
     assert(system.includes('Le candidat mène'));
    }else{
     assert(system.includes(section.privateRole));assert(system.includes(section.privateConcerns[0]));
     assert(system.includes('ami'));
    }
    promptSeen=true;
    return Response.json({model:'gpt-audio-mini',choices:[{message:{content:JSON.stringify({
     transcript:phase===0?'Bonjour, pourriez-vous préciser vos horaires ?':'Je voudrais te convaincre de venir.',
     reply:phase===0?'Nous ouvrons samedi.':'Je ne sais pas, j’ai quelques réserves.',
     intelligible:true,questionAsked:phase===0,observations:['La parole est intelligible.']})}}]});
   }});
   const attempt={test_id:paper.id,version:paper.version,phase,calls:histories};
   const res=await provider.run({kind:'turn',audio:Buffer.from('test wave').toString('base64'),attempt},{model:'gpt-audio-mini',maxOutputTokens:2000});
   assert(promptSeen);assert(res.result.reply.length>5);
   assert.equal(res.result.questionAsked,phase===0);
   total++;
  }
 }
 assert.equal(total,40);
});
