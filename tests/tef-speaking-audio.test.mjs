import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/ai/audio.js';
import {inspectAudio} from '../supabase/functions/academy-ai/contracts.js';
import {createSpeakingRecorder} from '../src/exams/tcf-speaking/recorder.js';
import {createFrenchVoicePlayer} from '../src/exams/tef-speaking/voice.js';
const wav=seconds=>Buffer.from(encodeWav(Float32Array.from({length:Math.round(16000*seconds)},(_,i)=>Math.sin(i/7)*.12),16000)).toString('base64');
test('TEF section clips use safe WAV audio; silent, missing or overlong clips cannot be sent as paid turns',()=>{
 assert(Math.abs(inspectAudio(wav(10),30).seconds-10)<.01);
 assert.throws(()=>inspectAudio(wav(31),30),/30 seconds/);
 assert.throws(()=>inspectAudio('not wav',30));
 assert.throws(()=>inspectAudio(Buffer.from(encodeWav(new Float32Array(16000),16000)).toString('base64'),30),/quiet/);
});
test('Microphone denied: clean failure with closed AudioContext, no expensive inference',async()=>{
 const prevNav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),prevContext=globalThis.AudioContext;
 let closed=false;
 globalThis.AudioContext=class{resume=async()=>{};close=async()=>{closed=true}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{throw Error('Permission denied')}}}});
 const recorder=createSpeakingRecorder();
 try{await assert.rejects(()=>recorder.prepare(),/Permission denied/);assert.equal(closed,true);assert.equal(recorder.isRecording(),false)}
 finally{recorder.dispose();globalThis.AudioContext=prevContext;
  if(prevNav)Object.defineProperty(globalThis,'navigator',prevNav);else delete globalThis.navigator}
});
test('TEF browser voice prefers fr-CA and returns a visible fallback when speech is unavailable',async()=>{
 let selectedVoice=null;
 class FakeUtterance{constructor(text){this.text=text}}
 const voices=[{name:'English',lang:'en-US'},{name:'French France',lang:'fr-FR'},{name:'French Canada',lang:'fr-CA'}];
 const synth={getVoices:()=>voices,cancel(){},speak(utterance){selectedVoice=utterance.voice;queueMicrotask(()=>utterance.onend())}};
 const voice=createFrenchVoicePlayer({synthesis:synth,Utterance:FakeUtterance});
 assert.equal(voice.selectedVoice(),'French Canada');
 assert.equal(await voice.speak('Bonjour, pouvez-vous préciser le tarif ?'),true);
 assert.equal(selectedVoice.name,'French Canada');voice.dispose();
 const unavailable=createFrenchVoicePlayer({synthesis:null,Utterance:null});
 assert.equal(await unavailable.speak('Bonjour'),false);unavailable.dispose();
});
