import {build} from 'esbuild';
import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const browser=await build({entryPoints:['src/entry.js'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'dist/academy-app.js',minify:true,metafile:true});
// The existing GHL embed still requests academy.js. Keep that URL stable as
// a tiny manifest-aware bootstrap; put the actual compiled app behind an
// immutable per-release query parameter to avoid stale browser caches.
await writeFile('dist/academy.js',await readFile('src/bootstrap.js','utf8'));
if(Object.keys(browser.metafile.inputs).some(path=>path.startsWith('supabase/')))throw Error('Server-only question keys or privileged modules entered the browser bundle.');
const version=process.env.GITHUB_SHA||Date.now().toString(36);
const css=(await readFile('src/styles/academy.css','utf8'))+'\n'+(await readFile('src/styles/practice-studio.css','utf8'))+'\n'+(await readFile('src/styles/learning-insights.css','utf8'));
await writeFile('dist/academy.css',css);
await writeFile('dist/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HZad French Academy - Preview</title><link rel="stylesheet" href="./academy.css?v=${version}"></head><body><div id="hzad-academy-host"></div><script src="./academy.js?v=${version}"></script></body></html>`);
console.log('Built academy preview in dist/');
await mkdir('dist/certificates',{recursive:true});
await build({entryPoints:['src/achievements/verify-entry.js'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'dist/certificates/verify.js',minify:true});
await writeFile('dist/certificates/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify an HZad Certificate</title><link rel="stylesheet" href="../academy.css"></head><body><main id="hzad-french-academy"><div class="hz-shell"><section class="hz-panel" id="certificate-verification"><a class="hz-global-back" href="https://www.teftcf.hzadeducation.org/hzadfrenchacademy">← Back to academy</a><h1>HZad French Academy</h1><p>Verify an HZad course-completion certificate using its ID and printed holder name.</p></section></div></main><script src="./verify.js"></script></body></html>');

await cp('assets/tcf-listening','dist/assets/tcf-listening',{recursive:true});
await cp('assets/tef-listening','dist/assets/tef-listening',{recursive:true});
