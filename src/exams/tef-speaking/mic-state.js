// TEF microphone UI state is derived from actual recording status, not from
// browser microphone permission or whether the AI voice has finished playing.
export function tefMicrophoneControls({recording=false,starting=false,busy=false,pending=false,captured=false,allowed=false,timeLeft=0}={}){
 const blocked=busy||pending||captured||!allowed||timeLeft<=0;
 return {
  maySend:!blocked&&recording&&!starting,
  mayStart:!blocked&&!recording&&!starting,
  state:recording?'recording':starting?'starting':timeLeft<=0?'expired':'ready'
 };
}
