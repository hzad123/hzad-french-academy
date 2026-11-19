import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code=readFileSync('src/bootstrap.js','utf8');
const SHA='0123456789abcdef0123456789abcdef01234567';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function mount(fetcher){
 const inserted=[];
 const host={dataset:{},textContent:'',isConnected:true};
 const context={
  document:{getElementById:id=>id==='hzad-academy-host'?host:null,
   currentScript:{src:'https://hzad123.github.io/hzad-french-academy/academy.js'},
   createElement:tag=>({tagName:tag}),
   head:{appendChild:node=>{inserted.push(node)}}},
  fetch:fetcher,
  Date:{now:()=>1795120000123},
  encodeURIComponent,Error
 };
 runInNewContext(code,context);
 return {host,inserted,context};
}
test('Existing GHL Custom HTML continues using the stable academy.js asset without a manual paste',()=>{
 const ghl=readFileSync('ghl/loader.html','utf8');
 assert(ghl.includes("https://hzad123.github.io/hzad-french-academy/academy.js"));
 assert(ghl.includes("https://hzad123.github.io/hzad-french-academy/academy.css"));
 const build=readFileSync('scripts/build.mjs','utf8');
 assert(build.includes("outfile:'dist/academy-app.js'"));
 assert(build.includes("writeFile('dist/academy.js',await readFile('src/bootstrap.js'"));
});
test('Stable bootstrap loads versioned JS AND CSS from the latest published revision',async()=>{
 let call;
 const {host,inserted,context}=mount(async(url,options)=>{
  call={url,options};return {ok:true,text:async()=>SHA+'\n'};
 });
 await flush();
 assert.match(call.url,/BUILD_COMMIT\.txt\?check=/);
 assert.equal(call.options.cache,'no-store');
 assert.equal(host.dataset.hzadAssetVersion,SHA);
 assert.equal(inserted.length,2);
 assert.equal(inserted[0].tagName,'link');
 assert.equal(inserted[1].tagName,'script');
 assert.equal(inserted[0].href,'https://hzad123.github.io/hzad-french-academy/academy.css?v='+SHA);
 assert.equal(inserted[1].src,'https://hzad123.github.io/hzad-french-academy/academy-app.js?v='+SHA);
 assert.equal(inserted[1].async,true);
 runInNewContext(code,context);await flush();
 assert.equal(inserted.length,2,'No duplicate initialisation if GHL retries the same snippet');
});
test('Cross-origin manifest restrictions fall back to unique cache-busting app URLs',async()=>{
 const {host,inserted}=mount(async()=>{throw Error('CORS blocked')});
 await flush();
 assert.equal(inserted.length,2);
 assert.equal(host.dataset.hzadAssetVersion,'refresh-1795120000123');
 assert.match(inserted[0].href,/academy\.css\?v=refresh-/);
 assert.match(inserted[1].src,/academy-app\.js\?v=refresh-/);
});
test('Malicious or malformed manifest is never interpreted as an asset URL',async()=>{
 const {inserted}=mount(async()=>({ok:true,text:async()=>'<script>alert(1)</script>'}));
 await flush();
 assert.equal(inserted.length,2);
 assert.match(inserted[1].src,/\?v=refresh-/);
 assert(!inserted[1].src.includes('<'));
});
test('GitHub Pages verifies the published bootstrap AND detailed TCF feedback code',()=>{
 const workflow=readFileSync('.github/workflows/pages.yml','utf8');
 assert(workflow.includes("['BUILD_COMMIT.txt','academy.js','academy-app.js','academy.css']"));
 assert(workflow.includes("bootstrap.includes('academy-app.js')"));
 assert(workflow.includes("js.includes('hz-tcf-speaking-scoreboard')"));
 assert(workflow.includes("js.includes('hz-tcf-speaking-correction-card')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-score-figures')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-original')"));
 assert(workflow.includes("css.includes('hz-tcf-speaking-better')"));
});
