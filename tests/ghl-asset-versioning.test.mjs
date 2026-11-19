import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync('ghl/loader.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(code,'GoHighLevel loader must have executable bootstrap code');
const SHA='0123456789abcdef0123456789abcdef01234567';
function mount(fetcher){
 const inserted=[];
 const host={dataset:{},textContent:'',isConnected:true};
 const context={
  document:{getElementById:id=>id==='hzad-academy-host'?host:null,
   createElement:tag=>({tagName:tag}),
   head:{appendChild:node=>{inserted.push(node)}}},
  fetch:fetcher,
  Date:{now:()=>1795120000123},
  encodeURIComponent,
  Error
 };
 runInNewContext(code,context);
 return {host,inserted,context};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('A published revision is used for BOTH CSS and JavaScript, with identical cache-busting URLs',async()=>{
 const fetched=[];
 const {host,inserted,context}=mount(async(url,options)=>{
  fetched.push({url,options});
  return {ok:true,text:async()=>SHA+'\n'};
 });
 await flush();
 assert.equal(fetched.length,1);
 assert.match(fetched[0].url,/BUILD_COMMIT\.txt\?check=/);
 assert.equal(fetched[0].options.cache,'no-store');
 assert.equal(host.dataset.hzadAssetVersion,SHA);
 assert.equal(inserted.length,2);
 assert.equal(inserted[0].tagName,'link');
 assert.equal(inserted[1].tagName,'script');
 assert.equal(inserted[0].href,'https://hzad123.github.io/hzad-french-academy/academy.css?v='+SHA);
 assert.equal(inserted[1].src,'https://hzad123.github.io/hzad-french-academy/academy.js?v='+SHA);
 assert.equal(inserted[1].async,true);
 runInNewContext(code,context);
 await flush();
 assert.equal(inserted.length,2,'Reinitializing the same GHL block must not duplicate loaders');
});
test('Cross-origin manifest restrictions still load fresh bundles via a non-cached fallback revision',async()=>{
 const {host,inserted}=mount(async()=>{throw Error('CORS blocked')});
 await flush();
 assert.equal(inserted.length,2);
 assert.equal(host.dataset.hzadAssetVersion,'refresh-1795120000123');
 assert.match(inserted[0].href,/academy\.css\?v=refresh-/);
 assert.match(inserted[1].src,/academy\.js\?v=refresh-/);
});
test('Invalid marker is rejected rather than interpolated into asset URLs',async()=>{
 const {inserted}=mount(async()=>({ok:true,text:async()=>'<script>alert(1)</script>'}));
 await flush();
 assert.equal(inserted.length,2);
 assert.match(inserted[1].src,/\?v=refresh-/);
 assert(!inserted[1].src.includes('<'));
});
test('The hosted release job checks the real TCF feedback, not just a successful build',()=>{
 const workflow=readFileSync('.github/workflows/pages.yml','utf8');
 assert(workflow.includes("js.includes('hz-tcf-speaking-scoreboard')"));
 assert(workflow.includes("js.includes('Your French · Corrections and better expressions')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-score-figures')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-original')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-better')"));
});
