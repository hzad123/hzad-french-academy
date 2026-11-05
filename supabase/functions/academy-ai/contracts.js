export const LEVELS=['A0','A1','A2','B1','B2','C1','C2'];
export const SCENARIOS={cafe:'Order at a French café',travel:'Ask for help while travelling',daily:'Talk about your day',work:'Work with French-speaking colleagues',interview:'Attend a job interview',debate:'Discuss a current issue respectfully'};
export class AiError extends Error{constructor(message,status=400,code='AI_INPUT'){super(message);this.status=status;this.code=code}}
export function uuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
function text(value,max,label,{empty=false}={}){
 if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw new AiError(`Check ${label}.`);
 return value.trim();
}
export function inspectAudio(base64){
 if(typeof base64!=='string'||base64.length>1280060||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new AiError('Record up to 30 seconds of French audio.');
 let raw;try{raw=atob(base64)}catch{throw new AiError('Please record your audio again.')}
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
 const str=(start,n)=>String.fromCharCode(...bytes.subarray(start,start+n));
 if(bytes.length<16044||bytes.length>960044||str(0,4)!=='RIFF'||str(8,8)!=='WAVEfmt '||str(36,4)!=='data'||view.getUint32(4,true)!==bytes.length-8||view.getUint32(16,true)!==16
 ||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint32(28,true)!==32000||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw new AiError('Please record your audio again.');
 let energy=0;for(let i=44;i<bytes.length;i+=2)energy+=(view.getInt16(i,true)/32768)**2;
 if(Math.sqrt(energy/((bytes.length-44)/2))<.003)throw new AiError('The recording is too quiet. Move closer to your microphone and try again.');
 return {seconds:(bytes.length-44)/32000,bytes:bytes.length};
}
export function validateInput(raw){
 if(!raw||Array.isArray(raw)||typeof raw!=='object'||Object.keys(raw).some(k=>!['id','kind','level','text','reference','audio','conversationId','scenario','expectedCredits'].includes(k)))throw new AiError('Invalid AI activity.');
 if(!uuid(raw.id)||!['writing','pronunciation','conversation'].includes(raw.kind)||!LEVELS.includes(raw.level))throw new AiError('Choose a trainer and French level.');
 if(!Number.isSafeInteger(raw.expectedCredits)||raw.expectedCredits<1||raw.expectedCredits>10000)throw new AiError('Refresh the activity credit charge.');
 const input={id:raw.id,kind:raw.kind,level:raw.level,expectedCredits:raw.expectedCredits};
 if(raw.kind==='writing'){
  if(raw.audio||raw.reference||raw.conversationId||raw.scenario)throw new AiError('Send your French writing for review.');
  input.text=text(raw.text,4000,'your French writing');
 }else if(raw.kind==='pronunciation'){
  if(raw.text||raw.conversationId||raw.scenario)throw new AiError('Record the practice sentence.');
  input.reference=text(raw.reference,240,'the practice sentence');inspectAudio(raw.audio);input.audio=raw.audio;
 }else{
  if(raw.reference||!Object.hasOwn(SCENARIOS,raw.scenario)||(raw.conversationId!=null&&!uuid(raw.conversationId)))throw new AiError('Choose a conversation scenario.');
  input.scenario=raw.scenario;input.conversationId=raw.conversationId||null;
  if(raw.audio){if(raw.text?.trim())throw new AiError('Send either a recording or a typed reply.');inspectAudio(raw.audio);input.audio=raw.audio}
  else input.text=text(raw.text,2000,'your French reply');
 }
 return input;
}
function list(value,max,fn){if(!Array.isArray(value)||value.length>max)throw new AiError('The AI response could not be read. Please try a new activity.',502,'AI_OUTPUT');return value.map(fn)}
function resultText(value,max,empty=false){try{return text(value,max,'the AI response',{empty})}catch{throw new AiError('The AI response could not be read. Please try a new activity.',502,'AI_OUTPUT')}}
export function validateOutput(kind,raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AiError('The AI response could not be read.',502,'AI_OUTPUT');
 const corrections=items=>list(items,8,item=>({original:resultText(item?.original,240),corrected:resultText(item?.corrected,240),explanation:resultText(item?.explanation,500)}));
 let result;
 if(kind==='writing')result={correctedText:resultText(raw.correctedText,6000),summary:resultText(raw.summary,700),corrections:corrections(raw.corrections),suggestions:list(raw.suggestions,5,s=>resultText(s,400))};
 else if(kind==='pronunciation')result={heardText:resultText(raw.heardText,500,true),feedback:resultText(raw.feedback,700),strengths:list(raw.strengths,4,s=>resultText(s,300)),focus:list(raw.focus,4,item=>({sound:resultText(item?.sound,80),example:resultText(item?.example,160),tip:resultText(item?.tip,400)})),practicePhrase:resultText(raw.practicePhrase,240)};
 else result={reply:resultText(raw.reply,2000),englishHelp:resultText(raw.englishHelp,1000),transcript:resultText(raw.transcript,2000,true),corrections:corrections(raw.corrections),suggestedReplies:list(raw.suggestedReplies,3,s=>resultText(s,300))};
 if(new TextEncoder().encode(JSON.stringify(result)).length>16000)throw new AiError('The AI response was too long. Please try a shorter activity.',502,'AI_OUTPUT');
 return result;
}
export async function fingerprint(input){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input)));
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
