import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/entry.js'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'dist/academy.js',minify:true});
const version=process.env.GITHUB_SHA||Date.now().toString(36);
const css=await readFile('src/styles/academy.css','utf8');
await writeFile('dist/academy.css',css);
await writeFile('dist/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HZad French Academy - Preview</title><link rel="stylesheet" href="./academy.css?v=${version}"></head><body><div id="hzad-academy-host"></div><script src="./academy.js?v=${version}"></script></body></html>`);
console.log('Built academy preview in dist/');
