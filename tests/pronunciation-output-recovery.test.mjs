import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCoachJson} from '../supabase/functions/academy-ai/provider.js';
import {validateOutput} from '../supabase/functions/academy-ai/contracts.js';
test('pronunciation survives optional field omissions and prose wrappers',()=>{
 const raw={feedback:'Try a softer R.',heardText:null,strengths:['Clear',null],focus:[{sound:'R',tip:'Relax your tongue.'}],practicePhrase:null};
 const result=validateOutput('pronunciation',parseCoachJson('Feedback:\n'+JSON.stringify(raw)));
 assert.equal(result.feedback,raw.feedback);assert.equal(result.heardText,'');assert.equal(result.practicePhrase,'');assert.deepEqual(result.strengths,['Clear']);assert.equal(result.focus.length,1);
 assert.throws(()=>validateOutput('pronunciation',{}));assert.throws(()=>parseCoachJson('{"feedback":'));
});
