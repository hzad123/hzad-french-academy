// Authoring contract for TEF Listening Tests 02-07.
// This is deliberately a strict validator, NOT a content generator.
// A paper is not releasable until all 40 entries are original, human-authored,
// independently audited, and its 36 measured recordings fit the timing policy.
// No draft paper is exposed to the student catalog.
export const VERSION_PREFIX='tef-listening-2026-11-test';
export const LEVELS=Object.freeze(['picture','announcement','voicemail','street','radio','interview','report','document']);
export const QUESTION_KINDS=Object.freeze([
 ...Array(4).fill('picture'),
 ...Array(4).fill('announcement'),
 ...Array(4).fill('voicemail'),
 ...Array(8).fill('street'),
 ...Array(2).fill('radio'),
 ...Array(6).fill('interview'),
 ...Array(2).fill('report'),
 ...Array(10).fill('document')
]);
export const PAIRED_STARTS=[23,25,27,29];
export const PAIRED_SECONDS=new Set(PAIRED_STARTS.map(x=>x+1));
export function previewSeconds(number){
 if(number<=4)return 5;
 if(number<=12)return 10;
 if(number<=20)return 5;
 if(number<=22)return 10;
 if(PAIRED_SECONDS.has(number))return 0;
 if([23,25,27].includes(number))return 20;
 return 10;
}
export function responseSeconds(number){
 if(PAIRED_SECONDS.has(number))return 0;
 if(number<=12)return 10;
 if(number>=23&&number<=28)return 30;
 return 15;
}
export function minimumAudioSeconds(number){
 if(number<=4)return 18;
 if(number<=12)return 20;
 if(number<=20)return 23;
 if(number<=22)return 36;
 if(number>=23&&number<=28)return 105;
 if(number===29)return 100;
 return 35;
}
export const timeBudgetSeconds=2400;
export const uniqueRecordingCount=36;
export function normalizeSource(text){
 return String(text||'').normalize('NFKC').toLowerCase()
  .replace(/[’']/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export function validateDraft(test,otherSources=[]){
 const errors=[],warnings=[];
 const err=s=>errors.push(s), warn=s=>warnings.push(s);
 if(!/^tef-listening-0[2-7]$/.test(test?.id||''))err('invalid ID');
 if(!Array.isArray(test?.questions)||test.questions.length!==40)return {errors:['exactly 40 questions required'],warnings};
 const source=new Map(),keys={A:0,B:0,C:0,D:0};
 for(let i=0;i<40;i++){
  const q=test.questions[i],n=i+1;
  if(q.number!==n)err('question numbering '+n);
  if(q.kind!==QUESTION_KINDS[i])err('format at '+n);
  if(q.previewSeconds!==previewSeconds(n))err('preview at '+n);
  if(!Array.isArray(q.options)||q.options.length!==4)err('four answers '+n);
  if(!/^[ABCD]$/.test(q.correct||''))err('correct letter '+n);
  else keys[q.correct]++;
  const text=String(q.transcript||'');
  if(text.length<180)err('short/incomplete transcript '+n);
  if(!String(q.question||'').trim()||!String(q.explanation||'').trim())err('missing question or explanation '+n);
  if(!Array.isArray(q.segments)||!q.segments.length)err('missing speech segments '+n);
  if(n<=4&&!q.image)err('missing visual cue '+n);
  if(q.options?.length===4){
   const normalized=q.options.map(normalizeSource);
   if(new Set(normalized).size!==4)err('duplicate answer options '+n);
   if(new Set(q.options.map(x=>String(x).trim().split(/\s+/).length)).size===4)warn('review option length spread '+n);
   const sizes=q.options.map(x=>String(x).length);
   if(Math.max(...sizes)>Math.min(...sizes)*2.15)warn('unbalanced answer lengths '+n);
   if(q.options.some(x=>/\b(toujours|jamais|uniquement|exclusivement|aucun|tous|impossible)\b/i.test(x)))warn('potential extreme qualifier '+n);
  }
  if(!PAIRED_SECONDS.has(n)){
   const normalized=normalizeSource(text);
   if(source.has(normalized))err('duplicate transcript '+n+' and '+source.get(normalized));
   source.set(normalized,n);
   if(otherSources.includes(normalized))err('same transcript as prior test '+n);
  }else{
   if(q.transcript!==test.questions[n-2].transcript)err('paired transcript mismatch '+n);
   if(q.audio!==test.questions[n-2].audio)err('paired audio mismatch '+n);
  }
  if(PAIRED_STARTS.includes(n)){
   if(q.groupStart!==n||q.groupEnd!==n+1)err('paired group metadata '+n);
   if(test.questions[n].groupStart!==n)err('paired second group metadata '+(n+1));
   if(normalizeSource(q.question)===normalizeSource(test.questions[n].question))err('pair asks same thing '+n);
  }
  if(PAIRED_SECONDS.has(n) && q.slotSeconds!==0)err('paired second has independent time '+n);
 }
 if(Object.entries(keys).some(([,v])=>v!==10))warn('correct answers not exactly balanced '+JSON.stringify(keys));
 if(source.size!==36)err('recording count must be 36, got '+source.size);
 return {errors,warnings,keys,uniqueRecordings:source.size};
}
