#!/usr/bin/env node
// Review source-only TCF Reading banks. This is a diagnostic tool, NOT a substitute
// for independent French-language editorial review or blind model evaluation.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i < 0 ? fallback : process.argv[i + 1];
};
const version = arg("--bank", "v3");
const strict = process.argv.includes("--strict");
const noPassage = process.argv.includes("--blind-export");
const paths = version === "v3"
  ? ["supabase/exams/tcf-reading-test01.json",
    ...Array.from({length: 19}, (_, i) => `supabase/exams/tcf-reading-v3/test-${String(i + 2).padStart(2, "0")}.json`)]
  : Array.from({length: 20}, (_, i) => `supabase/exams/tcf-reading-${version}/test-${String(i + 1).padStart(2, "0")}.json`);
const clean = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");
const words = (s) => new Set(clean(s).match(/[a-z]{4,}/g) || []);
const lexicalOverlap = (text, passage) => {
  const tw = words(text), pw = words(passage);
  return tw.size ? [...tw].filter(w => pw.has(w)).length / tw.size : 0;
};
const extreme = /\b(jamais|toujours|impossible|aucun|aucune|tous|toutes|uniquement|exclusivement|compl[eè]tement|garanti(?:e|s|es)?|automatiquement)\b/i;
const pointBand = (n) => n <= 4 ? 3 : n <= 10 ? 9 : n <= 19 ? 15 : n <= 29 ? 21 : n <= 35 ? 26 : 33;
const errors = [], warnings = [], blind = [], perTest = [];
const corpus = new Set(), counts = {A:0,B:0,C:0,D:0};
let total = 0, tiedLongest = 0, tiedShortest = 0, flagged = 0;
for (const file of paths) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { errors.push(`Missing file: ${file}`); continue; }
  let paper;
  try { paper = JSON.parse(fs.readFileSync(full, "utf8")); }
  catch(e) { errors.push(`Invalid JSON: ${file}: ${e.message}`); continue; }
  const positions = {A:0,B:0,C:0,D:0}, problematic = [];
  if (paper.questions?.length !== 39 || paper.seconds !== 3600 || paper.maxPoints !== 699) {
    errors.push(`${file}: not 39 items / 3600 seconds / 699 points`);
  }
  if (!Array.isArray(paper.questions)) continue;
  if (new Set(paper.questions.map(q => q.number)).size !== 39) errors.push(`${file}: repeated question numbers`);
  if (paper.questions.reduce((s,q)=>s+Number(q.points||0),0) !== 699) errors.push(`${file}: invalid points sum`);
  for (const q of paper.questions) {
    total++;
    const i = "ABCD".indexOf(q.correct);
    if (q.number < 1 || q.number > 39 || q.points !== pointBand(q.number)) errors.push(`${file} Q${q.number}: incorrect number/point band`);
    if (i < 0 || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o=>typeof o!=="string" || !o.trim())) {
      errors.push(`${file} Q${q.number}: invalid answers`); continue;
    }
    positions[q.correct]++; counts[q.correct]++;
    if (new Set(q.options.map(clean)).size !== 4) errors.push(`${file} Q${q.number}: duplicate options`);
    const pair = clean(q.passage) + "|" + clean(q.question);
    if (corpus.has(pair)) errors.push(`${file} Q${q.number}: repeated passage/question`);
    corpus.add(pair);
    if (!q.passage || !q.question || !q.explanation) errors.push(`${file} Q${q.number}: missing source/prompt/explanation`);
    const lengths = q.options.map(o=>o.trim().length);
    if (lengths[i] === Math.max(...lengths)) tiedLongest++;
    if (lengths[i] === Math.min(...lengths)) tiedShortest++;
    const nearZero = q.options.filter((o,j)=>j!==i && lexicalOverlap(o,q.passage)<0.1).length;
    const extremes = q.options.filter((o,j)=>j!==i && extreme.test(o)).length;
    const lengthCue = lengths[i] === Math.max(...lengths) && lengths[i] > 1.6*Math.min(...lengths);
    const signals = [nearZero >= 2 ? "two-off-topic-lexical" : null,
      extremes ? "extreme-language" : null, lengthCue ? "longest-correct" : null].filter(Boolean);
    if (signals.length >= 2) flagged++;
    if (signals.length) {
      problematic.push({number:q.number, signals, lengths, correct:q.correct, question:q.question,
        options:q.options, passage:q.passage, explanation:q.explanation});
    }
    if (noPassage) blind.push({test:paper.id, number:q.number, question:q.question, options:q.options});
  }
  if (Math.min(...Object.values(positions)) < 7 || Math.max(...Object.values(positions)) > 12)
    warnings.push(`${paper.id}: uneven answer positions: ${JSON.stringify(positions)}`);
  perTest.push({id:paper.id, count:paper.questions.length, positions, warnings:problematic.length, items:problematic});
}
const report = {generatedBy:"Local deterministic bank audit; semantic judgments are not automated",
  bank:version, papers:perTest.length, questions:total, tiedLongest, tiedShortest, multiSignalFlags:flagged,
  answerPositions:counts, structuralErrors:errors, warnings, perTest};
const output = arg("--out", "");
if (output) fs.writeFileSync(output, JSON.stringify(report,null,2)+"\n");
if (noPassage) {
  const target = arg("--blind-out", "tcf-reading-blind-only.json");
  fs.writeFileSync(target, JSON.stringify(blind,null,2)+"\n");
}
console.log(JSON.stringify({bank:version,papers:report.papers,questions:total,
  tiedLongest,tiedShortest,multiSignalFlags:flagged,positions:counts,
  errors:errors.length,warnings:warnings.length,report:output||undefined},null,2));
if (errors.length) { for (const e of errors.slice(0,50)) console.error("ERROR",e); process.exitCode=1; }
if (strict && (warnings.length || flagged || tiedLongest > total*0.40)) process.exitCode=1;
