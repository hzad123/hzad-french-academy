import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('dist/a0-preview',{recursive:true});
await build({entryPoints:['src/learning/preview-entry.js'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'dist/a0-preview/learning.js',minify:true});
await writeFile('dist/a0-preview/learning.css',await readFile('src/styles/learning.css','utf8'));
await writeFile('dist/a0-preview/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HZad A0 Learning Preview</title><link rel="stylesheet" href="./learning.css"></head><body><div id="hzad-a0-preview"></div><script src="./learning.js"></script></body></html>');
