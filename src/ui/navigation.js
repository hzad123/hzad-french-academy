// In-app history is session-only and cleared with authentication state.
export const recordView=(root,key,restore)=>root.dispatchEvent(new CustomEvent('hzad-view',{detail:{key,restore}}));
export const recordHome=root=>recordView(root,'home',()=>root.dispatchEvent(new CustomEvent('hzad-nav-home')));
export function wireNavigation(root){
 const back=root.querySelector('#hz-global-back');
 const status=root.querySelector('#hz-navigation-status');
 let stack=[],replaying=false,epoch=0;
 const home=()=>({key:'home',restore:()=>root.dispatchEvent(new CustomEvent('hzad-nav-home'))});
 const update=()=>{back.disabled=replaying||stack.length<2;back.setAttribute('aria-label','Go back to the previous view')};
 const reset=()=>{epoch++;replaying=false;stack=[home()];if(status)status.textContent='';update()};
 root.addEventListener('hzad-view',event=>{
  const next=event.detail;if(!next?.key||typeof next.restore!=='function')return;
  if(replaying)return;
  if(stack[stack.length-1]?.key===next.key)stack[stack.length-1]=next;
  else{stack.push(next);if(stack.length>60)stack.splice(1,1)}
  update();
 });
 async function goBack(){
  if(replaying||stack.length<2)return;
  const ticket=epoch;stack.pop();const target=stack[stack.length-1];replaying=true;if(status)status.textContent='';update();
  root.dispatchEvent(new CustomEvent('hzad-route-reset'));
  try{await target.restore()}catch{if(ticket===epoch&&status)status.textContent='The previous page could not open. Please retry from All levels.'}finally{if(ticket===epoch){replaying=false;update()}}
 }
 back.addEventListener('click',()=>{void goBack()});
 root.addEventListener('hzad-navigate-back',()=>{void goBack()});
 root.addEventListener('hzad-clear-lessons',reset);
 root.addEventListener('hzad-nav-reset',reset);
 reset();
}
