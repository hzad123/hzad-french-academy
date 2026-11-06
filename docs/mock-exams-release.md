# TEF Canada / TCF Canada mock exams

Published baseline: PRs #13 and #14 delivered the exam centre, owner-only audio setup and four-section navigation. Migrations `20261105001200`–`20261105001400` are applied. Student exam access remains disabled/unpriced pending audio review, editorial sign-off and real-provider pricing benchmarks. The new content-review/reference-guide revision is documented in [exam-content.md](./exam-content.md). No student balances, progress, lesson IDs or purchase entitlements are changed by it.

## Implementation

The exam centre opens inside **AI Learning**. It contains one original four-skill TEF Canada bank and one original four-skill TCF Canada bank. Counts and timings match the provider-page material supplied by the owner on November 5, 2026:

| Exam | Reading | Listening | Writing | Speaking |
| --- | --- | --- | --- | --- |
| TEF Canada | 40 MCQs / 60 min | 40 MCQs / 40 min | 2 tasks / 60 min (25 + 35) | 2 tasks / 15 min (5 + 10) |
| TCF Canada | 39 MCQs / 60 min | 39 MCQs / 35 min | 3 tasks / 60 min | 3 tasks / 12 min including 2 min preparation |

All **158** comprehension questions have original passages/scripts, four choices, authoritative keys and rationales. Ten original productive tasks include scenario facts, interlocutor roles, TEF word minima and TCF overall word ranges. The supplied page does not establish TCF task-3 sub-part ranges; none are enforced. `source-verification.json` records owner-supplied source provenance, including the attachment hash. The environment-publication issue no longer blocks implementation.

The server freezes each attempt's bank/version, price, models and budget. It controls section/task clocks, TEF writing task deadlines, TCF preparation, answer eligibility, deterministic objective scoring and review. Resume never resets time. Reading and TCF writing support revision within the current section; listening is forward-only. Active delivery withholds keys, rationales and listening transcripts. The UI reveals listening questions after playback. Refreshing a consumed listening question permits answering without replay; signed URLs expire after two minutes but cannot prevent copying audio already delivered to a device.

Writing autosaves and counts words. Speaking accepts validated native 16-kHz mono WAV turns up to 30 seconds, saved by the service under an owned task path. The audio-capable AI interlocutor stays in role and returns actual transcript/acoustic observations; browser French synthesis can read the reply. The TCF sustained monologue suppresses replies. Missing analysis can be recovered from the saved clip, and persisted model results are rehydrated after disconnects without redispatch or another charge.

Completed review includes correct/incorrect answers, rationales and listening transcripts. Productive feedback gives HZad 0–4 analytic ratings, genuine response excerpts, strengths, actions for improvement, explained corrections, improved French, three priorities and targeted practice. Dimensions cover task fulfilment, coherence, grammar, vocabulary, register, interaction, fluency and pronunciation as appropriate. Invented quotations/errors and unsupported positive ratings are rejected. Speech requires acoustic observations. Writing omissions and range violations are flagged separately. No official proprietary weights, calibrated TEF/TCF scores, CEFR levels or NCLC conversions are fabricated.

## Persistence, credits and security

`20261105001200_mock_exams.sql` adds private catalog/attempt/model-call/ledger tables. Full-test access is charged **once at the exact displayed server price**, including feedback. It atomically reserves sufficient provider budget against the existing student wallet. Every dispatch consumes its reviewed worst-case ceiling before the model call, including failures/timeouts. Inference never retries automatically. Access/call IDs are idempotent; optimistic revisions prevent stale answer overwrites. Reviews remain free. Closing preserves saved results and releases unused provider budget, without refunding full-test access credits. One open attempt and three starts per day bound abuse.

The migration reconciles source with the already-live nullable global cap. It preserves the **CAD $10 included provider-cost ceiling per student** and verified paid top-ups, with **no shared site-wide cap**. Exam reservations/usage appear in existing wallet totals. Reserved credits stop a top-up replacing a wallet with an open exam hold.

`20261105001300_exam_audio_storage.sql` creates private listening/recording buckets. A restrictive policy protects them even if an existing permissive storage policy is broad. Browsers cannot read raw exam state or call privileged RPCs. The exam Edge gateway uses `verify_jwt = true` and independently verifies the actual user through Supabase Auth. Data operations check verified entitlement and ownership. CORS retains existing academy origins. Provider secrets stay server-side. The browser build rejects dependencies from `supabase/`.

## Release gates and rollout

The feature remains **disabled and unpriced**. It is not a complete live mock release until these steps are done:

1. Independently review the French, question difficulty, distractors, keys/rationales and task realism. The full content is authored, not independently signed off.
2. Generate/record and listen-review **79 private audio assets**. `node scripts/prepare-exam-audio.mjs` writes an offline plan without paid calls. `--render` explicitly makes paid TTS calls using a securely supplied operator key. The owner-only Exam audio setup tool now generates these recordings using the existing Supabase secret; no key has been extracted. Generation/review counts must be checked live rather than inferred from this document. `node scripts/check-exam-audio.mjs <private-directory>` validates matching hashes/reviewer sign-offs. Silent test clips must never become live recordings.
3. Benchmark native examiner turns and final feedback using fixed writing/audio examples across performance levels, including blank, short, off-topic and unclear audio. Review fidelity, French, evidence, timing and actual costs. Set exact full-exam credits and conservative per-call/attempt ceilings from those measurements. Up to 64 calls (including recovery/failures) must fit the reserve. The 50-credit fixture price is synthetic, not a launch price; migration prices/budgets are null.
4. Retain the applied migrations and private recordings. Do not rerun existing exam/AI/lesson migrations. The content-review revision needs no SQL migration; deploy its tested Edge bundle with gateway JWT verification retained. Do not import curriculum, reset IDs, alter entitlements or enable maintenance cron.
5. Use an authorized test account for real-provider QA, complete the price review, and enable only reviewed catalog rows. Merge to `development` only when live release is authorized, because Pages deploys from it. Verify the actual GHL page and existing quizzes afterward.

`supabase/rollbacks/20261105_disable_mock_exams.sql` stops the feature without deleting attempts, answers, feedback, credit history or student progress. It revokes the exam service RPC until execution permission is restored; saved data remains in place.

## Validation

The content revision passes all 147 Node tests. The suite covers full bank counts, task clocks, objective scoring, hidden keys, ownership, prepaid access/replay, stale revisions, independent wallet caps, failure costs and private storage under a broad legacy policy, plus existing course/quiz regressions. Local desktop (1440 px) and mobile (390 px) checks passed for start, answer/save/resume, previous/next, one-play listening, writing autosave/TCF task revision, TCF preparation/recorded turns and feedback, with no horizontal overflow or JS errors. They use test doubles for Auth, DB, audio, AI and prices; they do not verify live provider quality or production behavior. Browser and all three Edge bundles compile successfully; `git diff --check` passed.

Run `npm test`, `npm run build`, and, with a checkout-only localhost server on port 8765, `python3 scripts/check-exam-ui.py`. Node 22 is the prepared runtime. Test workers and Chromium may need normal sandbox approval. Native exam feedback quality/cost remains unverified. Owner-triggered TTS has produced recordings; its saved status and listening review are tracked separately. Authenticated live content review requires the owner’s actual session.
