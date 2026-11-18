import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tefMicrophoneControls} from '../src/exams/tef-speaking/mic-state.js';

const base={allowed:true,timeLeft:300};

test('Microphone permission/preparation is not a recording: Submit stays disabled',()=>{
 const waiting=tefMicrophoneControls({...base,recording:false});
 assert.equal(waiting.maySend,false);
 assert.equal(waiting.mayStart,true);
 assert.equal(waiting.state,'ready');
 const initializing=tefMicrophoneControls({...base,starting:true,recording:false});
 assert.equal(initializing.maySend,false);
 assert.equal(initializing.mayStart,false);
 assert.equal(initializing.state,'starting');
 const startingButLive=tefMicrophoneControls({...base,starting:true,recording:true});
 assert.equal(startingButLive.maySend,false);
});
test('Send is enabled only when an actual recording is active and affordable',()=>{
 const recording=tefMicrophoneControls({...base,recording:true});
 assert.equal(recording.maySend,true);
 assert.equal(recording.mayStart,false);
 assert.equal(recording.state,'recording');
 for(const state of [
  {...base,recording:true,busy:true},
  {...base,recording:true,pending:true},
  {...base,recording:true,captured:true},
  {...base,recording:true,allowed:false},
  {...base,recording:true,timeLeft:0}
 ]){
  assert.equal(tefMicrophoneControls(state).maySend,false);
 }
 assert.equal(tefMicrophoneControls({...base,timeLeft:0}).state,'expired');
});
test('TEF live UI renders a microphone activation control and recorder-only submit',()=>{
 const source=readFileSync('src/exams/tef-speaking/ui.js','utf8');
 assert.match(source,/import \{tefMicrophoneControls\} from '\.\/mic-state\.js'/);
 assert.match(source,/data\.tefMicIndicator='true'/);
 assert.match(source,/send\.dataset\.tefSend='true'/);
 assert.match(source,/start\.dataset\.tefStartMic='true'/);
 assert.match(source,/function syncMicControls\(\)/);
 assert.match(source,/send\.disabled=!state\.maySend/);
 assert.match(source,/start\.disabled=!state\.mayStart/);
 assert.match(source,/await mic\.start\(Math\.min\(30,remaining\(\)\)\)/);
 assert.match(source,/voice\?\.stop\(\);examinerSpeaking=false/);
 assert.match(source,/wasRecording\?recorder\.stop\(\):null/);
 assert.match(source,/if\(!audio\)\{/);
 assert.match(source,/Le microphone n’enregistre pas encore/);
 assert.match(source,/Aucune voix suffisamment forte/);
});
test('No server/TCF changes and expired recorder silence cannot debit credits',()=>{
 const ui=readFileSync('src/exams/tef-speaking/ui.js','utf8');
 assert.match(ui,/const audio=recorder\.stop\(\);if\(audio\)void submitAnswer\(audio,true\);else if\(!capture\)void advance\(\)/);
 const tcf=readFileSync('src/exams/tcf-speaking/ui.js','utf8');
 assert.doesNotMatch(tcf,/tefMicrophoneControls|startMicrophoneManually|hz-tef-speaking-microphone/);
 const handler=readFileSync('supabase/functions/academy-tef-speaking/handler.js','utf8');
 assert.match(handler,/inspectAudio\(input\.audio,30\)/);
});
