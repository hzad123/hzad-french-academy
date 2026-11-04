import test from 'node:test';
import assert from 'node:assert/strict';
import {wireNavigation,recordView,recordHome} from '../src/ui/navigation.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Button extends EventTarget{disabled=false;setAttribute(){};click(){if(!this.disabled)this.dispatchEvent(new Event('click'))}}
function fixture(){
 const root=new EventTarget(),button=new Button(),status={textContent:''};
 root.querySelector=id=>id==='#hz-global-back'?button:status;
 wireNavigation(root);return {root,button,status};
}
test('Back restores the previous view with its latest lesson or tab state',async()=>{
 const {root,button}=fixture(),visited=[];
 assert.equal(button.disabled,true);
 recordView(root,'notebook',()=>visited.push('old filter'));
 recordView(root,'notebook',()=>visited.push('reviewed filter'));
 recordView(root,'lesson:a0-02',()=>visited.push('lesson'));
 button.click();await tick();assert.deepEqual(visited,['reviewed filter']);
 button.click();await tick();assert.equal(button.disabled,true);
});
test('Asynchronous assessment restoration ignores replay events and repeated Back clicks',async()=>{
 const {root,button}=fixture();let finish,calls=0;
 recordView(root,'final:id',async()=>{calls++;recordView(root,'replay-noise',()=>{});await new Promise(resolve=>{finish=resolve})});
 recordView(root,'tracker:mastery',()=>{});button.click();button.click();
 assert.equal(calls,1);assert.equal(button.disabled,true);finish();await tick();
 button.click();await tick();assert.equal(button.disabled,true);assert.equal(calls,1);
});
test('Signing out or switching accounts erases previous session routes',async()=>{
 for(const event of ['hzad-clear-lessons','hzad-nav-reset']){
  const {root,button}=fixture();let exposed=false;
  recordView(root,'private',()=>{exposed=true});recordView(root,'other',()=>{});
  root.dispatchEvent(new Event(event));button.click();await tick();
  assert.equal(exposed,false);assert.equal(button.disabled,true);
 }
});
test('Home is a real destination; session reset wins over a pending restoration',async()=>{
 const {root,button}=fixture();let finish,homes=0;
 root.addEventListener('hzad-nav-home',()=>homes++);
 recordView(root,'plan',()=>{});recordHome(root);button.click();await tick();
 button.click();await tick();assert.equal(homes,1);
 recordView(root,'slow',()=>new Promise(resolve=>{finish=resolve}));recordView(root,'next',()=>{});
 button.click();root.dispatchEvent(new Event('hzad-nav-reset'));finish();await tick();
 assert.equal(button.disabled,true);
});
test('A failed restoration reports an error without leaving navigation busy',async()=>{
 const {root,button,status}=fixture();recordView(root,'failed',()=>Promise.reject(Error('offline')));recordView(root,'next',()=>{});
 button.click();await tick();assert.match(status.textContent,/could not open/);assert.equal(button.disabled,false);
 button.click();await tick();assert.equal(button.disabled,true);
});
