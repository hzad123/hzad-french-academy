# Listening answer authoring and independent evaluation

This protocol applies to Tests 01–20 (780 questions), including the actual
spoken choices in the first eight questions. It runs offline during authoring;
student playback, scoring, credits and saved examination versions do not call AI.

The retired generators hard-coded irrelevant/extreme distractors, explicitly
encouraged mismatched alternatives, and greedily assigned the least-used answer
letter. Length checks alone missed sensible/qualified wording reserved for keys.
Do not regenerate or publish banks with those historical scripts.

Run the `Independently repair and evaluate all listening answer choices`
workflow on the reviewed feature revision. The trusted runner uses the existing
server-side OpenAI configuration through a private, JWT-protected authoring
function plus a dedicated authoring token. Neither credential is sent to the
model, browser, reports or artifacts. The workflow does not modify examination
publication pointers or student records.

Each item must pass:

1. Three fresh, independently shuffled blind evaluations. Each request contains
   exactly the question and four choices. Any conspicuous alternative, even a
   wrong one, rejects the draft. The evaluator honestly guesses; guessing the
   key correctly by chance alone does not reject an item.
2. Independent stimulus validation without the author's key or explanation.
   Exactly one answer must be supported, and each distractor must have a
   specific, plausible misunderstanding with verbatim recording evidence.
   Picture items require the actual rasterized image. Ambiguous replies fail.
3. A complete 39-item paper audit for recurring wording, distractor design,
   length advantages and answer-position patterns.
4. After all drafts are frozen, a fresh held-out blind experiment. These
   guesses are never fed to the author or used to keep only wrong guesses.
   Written choices require at least 100 measurements, with a one-sided
   binomial test against 25% at 1%. Spoken/picture diagnostics are separate.
   Length, qualification and question-overlap attacks are measured too.

The 25% benchmark is a statistical acceptance check, not proof of exact equality
or permission to force uniform probabilities. Natural variation in wording and
length is required. A failed held-out experiment blocks the cohort; it must not
be edited into a passing report.

Prompts/model policy, every exact question, image, key, paper and held-out
receipt are bound to the evidence. The release check recomputes the cohort
statistics. Changed content or reused/stale responses cannot pass.

The bounded repair loop saves failed drafts and actual provider receipts.
Resuming continues rejected drafts, preserving already accepted work. Provider
errors do not cause automatic paid retries. The authoring ledger reserves a
conservative request ceiling before each call and enforces a USD35 batch cap
(including saved expenditure from earlier runs).
This uses no student wallet or testing-budget reset.

Only a completely accepted cohort proceeds to offline Piper recording in new
immutable `-v4` versions. Changed spoken choices/questions require matching new
audio. Complete speech plus the existing response window must fit every
historical slot; clips are never truncated and clocks are never redistributed.
The renderer checks every MP3's decode, duration, source and bytes.

Verify an exact recorded bank with:

```sh
node scripts/check-listening-answer-quality.mjs \
  --bank supabase/exams/tcf-listening-test01-v4.json
npm test
npm run build
```

`reports/listening-answer-qc-latest` contains diagnostic candidates and actual
evaluation results, including failures. A report or model call is not itself a
published test. Existing unrelated originality, recording/editorial findings
remain release requirements; rewriting choices does not erase those findings.
Publication must preserve historical banks, attempts, scores and deadlines.
