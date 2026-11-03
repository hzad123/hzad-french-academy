import {speakFrench} from './a0-ui.js';

const el=(tag,text)=>{
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=String(text);
 return node;
};
function button(text,callback,className='hz-practice-button'){
 const b=el('button',text);b.type='button';b.className=className;
 b.addEventListener('click',callback);return b;
}

// Questions deliberately contain no visible transcript until graded. The script
// is spoken by the browser. No voice/audio data is sent to a paid AI service.
export function renderListeningCheck(field,check){
 if(!check||!check.french)return ()=>{};
 const panel=el('div');panel.className='hz-listening-quiz';
 const title=el('p','LISTEN FIRST · AUDIO QUESTION');title.className='hz-listening-label';
 const help=el('p','Play the French audio, then choose your answer. The written transcript stays hidden until you answer.');
 help.className='hz-listening-help';
 const actions=el('div');actions.className='hz-listening-actions';
 const status=el('span');status.className='hz-listening-status';status.setAttribute('role','status');
 const play=button('🔊 Play French',()=>speakFrench(check.french,play,status,.86));
 const slow=button('Slow playback',()=>speakFrench(check.french,slow,status,.72),'hz-practice-button is-secondary');
 play.setAttribute('aria-label','Play French listening question');
 slow.setAttribute('aria-label','Play French listening question slowly');
 actions.append(play,slow);
 panel.append(title,help,actions,status);
 const transcript=el('details');transcript.className='hz-listening-transcript';transcript.hidden=true;
 transcript.append(el('summary','Reveal French transcript after answering'));
 const french=el('p',check.french);french.lang='fr';french.className='hz-listening-transcript-french';transcript.append(french);
 if(check.english){
   const english=el('p',check.english);english.lang='en';english.className='hz-listening-transcript-english';transcript.append(english);
 }
 panel.append(transcript);field.append(panel);
 return ()=>{transcript.hidden=false;};
}

// Private self-practice. Writing remains in the browser and microphone
// recordings are kept locally as object URLs until the lesson is closed.
export function renderPracticeLab(target,unit){
 const tasks=Array.isArray(unit.practiceTasks)?unit.practiceTasks:[];
 if(!tasks.length)return ()=>{};
 const container=el('section');container.className='hz-practice-lab';
 container.append(el('h4','Speaking & Writing Workshop'));
 const note=el('p','These are self-guided activities. Use invented personal details. Drafts and voice recordings stay in your browser; they are not uploaded or AI-graded.');
 note.className='hz-practice-intro';container.append(note);
 const recorders=[],urls=[];
 const cleanup=()=>{
   for(const entry of recorders){
     if(entry.recorder?.state==='recording')try{entry.recorder.stop()}catch{}
     for(const track of entry.stream?.getTracks?.()||[])track.stop();
   }
   for(const url of urls)URL.revokeObjectURL(url);
   urls.length=0;
 };
 for(let index=0;index<tasks.length;index++){
   const task=tasks[index],card=el('article');card.className='hz-practice-task';
   const tag=el('span',(task.mode==='speaking'?'SPEAKING':'WRITING')+' · '+String(index+1).padStart(2,'0'));
   tag.className='hz-practice-kind';
   const heading=el('h5',task.title),instructions=el('p',task.instructions);
   instructions.className='hz-practice-instructions';
   card.append(tag,heading,instructions);
   if(task.mode==='writing'){
     const area=el('textarea');area.rows=4;
     area.placeholder='Write your own French response here. Use imaginary details.';
     area.setAttribute('aria-label','Your French response for '+task.title);
     area.className='hz-practice-textarea';
     const count=el('p','0 words · saved only in this browser tab');count.className='hz-practice-count';
     area.addEventListener('input',()=>{
       const words=area.value.trim()?area.value.trim().split(/\s+/).length:0;
       count.textContent=words+' '+(words===1?'word':'words')+' · not uploaded';
     });
     card.append(area,count);
   }else if(task.mode==='speaking'){
     const recording=el('div');recording.className='hz-practice-record';
     const status=el('span','Use the microphone to record and play back your answer. No automatic pronunciation score.');
     status.setAttribute('role','status');status.className='hz-practice-rec-status';
     const audio=el('audio');audio.controls=true;audio.hidden=true;audio.setAttribute('aria-label','Play your local recording');
     const mic=button('🎙 Record my answer',async()=>{
       const entry=recorders.find(x=>x.button===mic);
       if(entry?.recorder?.state==='recording'){
         entry.recorder.stop();mic.textContent='🎙 Record again';return;
       }
       if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
         status.textContent='Microphone recording is unavailable in this browser. You can still practise aloud.';return;
       }
       mic.disabled=true;status.textContent='Requesting microphone permission…';
       let stream;
       try{
         stream=await navigator.mediaDevices.getUserMedia({audio:true});
         if(!card.isConnected){stream.getTracks().forEach(t=>t.stop());return}
         const chunks=[],recorder=new MediaRecorder(stream);
         const existing=recorders.findIndex(x=>x.button===mic);
         if(existing>=0)recorders.splice(existing,1);
         const record={button:mic,recorder,stream};recorders.push(record);
         recorder.ondataavailable=ev=>{if(ev.data?.size)chunks.push(ev.data)};
         recorder.onstop=()=>{
           stream.getTracks().forEach(t=>t.stop());
           if(!card.isConnected)return;
           const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
           const old=audio.dataset.recordingUrl;
           if(old){URL.revokeObjectURL(old);const j=urls.indexOf(old);if(j>=0)urls.splice(j,1)}
           if(blob.size){const url=URL.createObjectURL(blob);urls.push(url);audio.src=url;audio.dataset.recordingUrl=url;audio.hidden=false;
             status.textContent='Recording ready. Play it back and compare with the French model.'}
           else status.textContent='No recording captured. Try again.';
         };
         recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());status.textContent='Recording failed. You can practise aloud instead.'};
         recorder.start();mic.textContent='■ Stop recording';status.textContent='Recording on this device…';
       }catch(e){stream?.getTracks?.().forEach(t=>t.stop());status.textContent='Microphone access was unavailable. Practise aloud without recording.'}
       finally{mic.disabled=false}
     });
     const row=el('div');row.className='hz-practice-record-controls';row.append(mic,audio);
     recording.append(row,status);card.append(recording);
   }
   if(Array.isArray(task.checklist)&&task.checklist.length){
     const label=el('p','Self-check before continuing:');label.className='hz-practice-check-label';
     const checklist=el('ul');checklist.className='hz-practice-checklist';
     task.checklist.forEach(item=>{const li=el('li');const input=el('input');input.type='checkbox';input.setAttribute('aria-label',item);
       li.append(input,document.createTextNode(' '+item));checklist.append(li)});
     card.append(label,checklist);
   }
   if(task.model){
     const detail=el('details');detail.className='hz-practice-model';
     detail.append(el('summary','Show an example answer after trying'));
     const sample=el('p',task.model);sample.lang='fr';detail.append(sample);
     const play=button('🔊 Hear example',()=>speakFrench(task.model,play,status), 'hz-practice-button is-secondary');
     const status=el('span');status.className='hz-practice-rec-status';
     detail.append(play,status);card.append(detail);
   }
   container.append(card);
 }
 target.append(container);
 // Guard against closing the academy panel while a recording is active.
 const observer=new MutationObserver(()=>{
   if(!container.isConnected){cleanup();observer.disconnect()}
 });
 observer.observe(target,{childList:true,subtree:false});
 return ()=>{cleanup();observer.disconnect()};
}
