import {transcribeFrenchLearnerWav} from '../academy-ai/verbatim-transcription.js';

// Keep the public TEF helper stable while using the same literal-speech
// recognition as TCF. Do not pass examiner context or previous dialogue.
export function transcribeTefWav({audio,key,fetcher=fetch}){
 return transcribeFrenchLearnerWav({audio,key,fetcher,maxChars:1100});
}
