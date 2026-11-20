import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const src=await readFile('src/exams/tef-listening/ui.js','utf8');
const bank=JSON.parse(await readFile('supabase/exams/tef-listening-test01.json','utf8'));

test('TEF Next starts the preloaded clip synchronously before an asynchronous server request',()=>{
 const start=src.indexOf('function nextQuestion(){');
 const end=src.indexOf('function finish(){',start);
 assert(start>=0&&end>start);
 const next=src.slice(start,end);
 const playing=next.indexOf('void audio.play()');
 const remote=next.lastIndexOf('await store.next(');
 assert(playing>=0&&remote>playing,'Next must call audio.play() before any awaited RPC');
 assert(next.indexOf('clearInterval(timer)')<playing,'Old question tick must stop before next audio starts');
 assert(next.includes('const audio=preload||audioFactory()'),'Preload the next MP3');
 assert(next.includes('audio.currentTime=0'),'New questions must start from beginning');
 assert(next.includes('queuedPlayback=queued'),'Keep playing audio when RPC returns');
});

test('TEF player adopts already playing clip without seeking or replaying it',()=>{
 const start=src.indexOf('function playCurrent(){'),end=src.indexOf('function resumeAudio()',start);
 const playback=src.slice(start,end);
 assert(playback.includes('const queued=queuedPlayback?.attemptId===attempt.id'),'Match prestarted clip to attempt');
 assert(playback.includes('queuedPlayback.number===item.number'),'Match prestarted clip to exact question');
 assert(playback.includes('const audio=queued?.audio'),'Adopt the prestarted MP3');
 assert(playback.includes('if(!queued){'),'Do not play again if already playing');
 assert(!playback.includes('if(elapsed()<item.previewSeconds'),'Do not hold audio behind extra preview');
 assert(!playback.includes('at-item.previewSeconds'),'No preview offset in audio position');
 assert(src.includes('if(elapsed()>=(officialPreview()?q().previewSeconds:0)+q().audioSeconds)'),'Recovery includes v2 reading time while retaining v1 immediate playback');
});

test('TEF keeps its 40-question secure exam and timing unchanged',()=>{
 assert.equal(bank.questions.length,40);
 assert.equal(bank.seconds,2400);
 assert.equal(bank.questions.reduce((sum,q)=>sum+q.slotSeconds,0),2400);
 assert(src.includes("const next=await store.next("));
 assert(src.includes("const next=await store.answer("));
 assert(src.includes("const next=await store.submit("));
 assert(src.includes('if(busy||pending||attempt.currentQuestion>=40)return'));
 assert(src.includes("input.dataset.locked=String(!!pending"));
 assert(!src.includes('speechSynthesis'),'Play immutable recorded audio, not runtime TTS');
});
