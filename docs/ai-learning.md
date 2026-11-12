# AI Learning: pronunciation, conversation and writing

The authenticated dashboard has a separate **AI Learning** button at the top right. Its studio contains three level-aware trainers (A0–C2), credit charges before each action, saved feedback, and the existing top-left Back navigation. Ordinary lessons, quizzes, placement, progress, badges and certificates keep their deterministic server workflows.

## Learner experience

- **Pronunciation:** listen to a French example, record up to 30 seconds, play the recording back, then request AI feedback. An audio-capable OpenAI model receives the actual PCM recording plus the reference sentence. Feedback includes audible strengths, French sound/rhythm focus, articulation tips and a practice phrase. No phoneme scores or numeric proficiency grades are invented from transcript matching.
- **Conversation:** choose a scenario (café, travel, daily life, work, interview or debate), start a French exchange, and answer by typing or recording. Each generated partner reply has English help, useful corrections and suggested French replies. French playback uses the device's French voice. Server-owned conversation history resumes without another charge. Each conversation supports twelve generated replies; another scenario starts a new conversation.
- **Writing:** submit up to 4,000 characters and receive corrected French, explanations of errors and concrete improvements. The text remains editable, with drafts kept only in the current signed-in page. Feedback is rendered as text, never model-provided HTML.

Opening the studio, recording, playing examples and revisiting saved feedback do not call OpenAI. The exact configured credit charge appears on the action button. A stale or forged displayed price is rejected before reserving funds.

## Implementation

`src/ai/` provides the studio, authenticated edge transport and native microphone recording. Audio is captured through Web Audio, downsampled to mono 16 kHz PCM WAV, and checked again server-side for format, duration and audibility. Tracks, AudioContext nodes and playback URLs are released on navigation, sign-out and account changes. Recordings are not stored in Supabase or localStorage. A pending request may temporarily retain its recording in page memory for an explicit same-ID retry; signing out clears it.

`supabase/functions/academy-ai/` contains a dependency-free Edge Function entry, request handler, OpenAI adapter and strict input/output validation. The handler checks the JWT with Supabase Auth, then uses server-only RPCs to reserve/claim/settle activity. Provider keys and privileged Supabase keys never enter the browser. The fixed OpenAI endpoint is `/v1/chat/completions`, with `input_audio` for native audio inputs, text-only output, bounded output tokens and `store:false`. Device speech synthesis reads conversation replies without an additional provider charge.

Models must be selected from OpenAI's currently supported Chat Completions models. Pronunciation and conversation need a model that accepts native WAV input and text-only output; writing can use a text model. Text-only transcription is deliberately not used as a pronunciation assessment. A live provider smoke test and model-quality review are still required before activation. The API adapter is tested against mocked provider responses; it has not been tested with a live key.

## Credits, budgets and data

The additive migration creates a private `academy_ai` schema. RLS and revoked direct grants protect wallets, conversations, requests, policy and an append-only-by-permission ledger. Authenticated learners can only read their own state, requests and conversations through checked RPCs. Only `service_role` may reserve, claim, finish, fail, maintain or reconcile paid top-ups; the Edge Function derives the user ID from verified Auth, never request data. Purchase checks match the installed `academy_has_access` predicate and also require confirmed email.

The included period starts at the earliest currently active verified full-academy purchase and lasts six months; wallet creation and subsequent visits do not reset it. Renewals do not automatically refill an existing wallet. Credits and AI eligibility remain separate from course entitlement. After the CAD $10 included allowance is used, further AI practice requires a verified paid credit top-up. A service-only reconciliation RPC records a unique verified payment reference, credits, additional provider budget and expiry; it never trusts a student payment claim. Duplicate receipts cannot add credit twice. Automatic checkout is not configured; the academy can verify payments manually. `topup_url` can point to an owner-approved hosted checkout, otherwise the learner is directed to contact the academy. Existing course access is unchanged.

The policy starts **disabled**, with no included-credit quantity, no activity prices/models/ceilings and a zero global spending cap. These are deployment configuration decisions requiring review; test fixture prices are not proposed production prices. The included provider-cost cap is **CAD $10**. Additional budget can be funded only through a verified paid top-up; it never silently refills the included allowance. Daily AI request/test-start counts were removed by owner instruction on 12 November 2026; existing per-action credits and total wallet budgets remain authoritative.

Each activity requires a reviewed worst-case provider-cost ceiling in micro-CAD, including its maximum text/context/audio inputs, output limit, current provider rates, currency conversion, rounding and a safety margin. Native audio conversation and pronunciation must be benchmarked separately from text writing. Configure model/output limits and the ceiling together. The entire ceiling is reserved atomically before dispatch and conservatively consumed afterwards, including provider failures/timeouts that might still be billed. This intentionally overcounts provider spend to protect the budget; recorded token usage supports later benchmarking. Do not enable a model until its configured ceiling demonstrably bounds accepted requests. Also set a provider-side project spending limit; database accounting cannot compensate for an incorrectly configured provider price ceiling or a leaked provider key.

One global row lock serializes all budget reservations. Wallet balances cannot become negative; one activity per student may be in flight. The server freezes credits, model and output limits on reservation. Reusing an ID with different input is rejected; claiming the same ID twice cannot make a second provider call. Completed same-ID retries return saved results. A lost response never automatically triggers another model request. A provider failure refunds student credits while retaining a dispatched call's budget ceiling. A lost settlement response stays pending for checking/reconciliation instead of repeating inference.

Audio is never persisted. Feedback/writing corrections and conversation text have a 90-day content retention window. The service-only maintenance RPC refunds stale holds after fifteen minutes, conservatively counts dispatched cost ceilings, and clears content older than 90 days while retaining wallet/usage accounting. Schedule maintenance every five minutes before activation. Do not log request bodies, learner text, recordings, tokens, keys or raw provider errors. OpenAI provider retention is separate; review the chosen project's data controls before enabling it for students.

## Verified environment and rollout

Read-only production inspection on 2026-11-04 found no `academy_ai` schema, Edge Functions or configured project secret names. The installed access function matches the entitlement predicate in this migration. No production data, secrets, migrations or functions were changed while building this feature.

1. Review the migration, provider/model behavior, credit quantities/prices, worst-case cost ceilings, privacy settings and budget configuration. Preserve current backups and test on a separate staging project.
2. Apply `supabase/migrations/20261105001000_ai_learning.sql` on staging with normal migration recording. Keep `academy_ai` outside Data API exposed schemas. Do not expose its tables or relax RPC grants. The default migration cannot spend AI funds.
3. Put `OPENAI_API_KEYfrench` (the owner-selected name) in **Supabase Edge Function secrets**, not GitHub Pages, GHL, a public repository or chat. The Edge Function uses Supabase's injected `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` on the server. A local `.env` file must stay untracked.
4. Deploy the function to staging using `supabase functions deploy academy-ai --project-ref YOUR_STAGING_REF`. Gateway JWT verification is enabled, and the handler independently performs mandatory Auth verification; keep both checks. CORS allows only the academy and GitHub Pages origins; add an explicitly reviewed staging origin if needed.
5. Benchmark accepted maximum inputs and output limits against current OpenAI rates. Configure private activity rows and policy using administrative SQL, then enable only the reviewed activities. Set a provider project spending cap. Check the exact price shown in the UI and stale-price rejection, insufficient/expired credit behavior and ordinary course access.
6. Schedule service-only `public.academy_ai_maintenance()` every five minutes through the staging scheduler. Inspect private request/ledger summaries for pending work and aggregate costs; do not expose an administrative key to students.
7. Test two real staging accounts and separate concurrent sessions, authenticated/expired/unverified access, genuine microphone recordings, French feedback quality, provider refusals/429/timeouts and interrupted responses. Confirm the configured ceiling covers actual provider usage and no duplicate call is made.
8. After owner approval, apply the reviewed migration and configuration to production, deploy the function, merge the frontend PR into `development`, and verify CI/Pages and the actual GHL page. Production activation requires the provider key, approved credit settings and budgets; this PR alone is not a live activation.

Rollback: `supabase/rollbacks/20261104_disable_ai_learning.sql` pauses earning model calls by disabling policy and revoking reserve/claim RPCs. It preserves credits, saved results, conversations and the ledger. Settlement/refund/maintenance remain available to reconcile in-flight requests. Existing educational features require no rollback.

## Validation

```sh
npm test
npm run check:ai
npm run build
python3 scripts/test-ai-browser.py
python3 scripts/test-tracker-browser.py
python3 scripts/test-achievements-browser.py
python3 scripts/test-placement-browser.py
```

AI tests exercise real isolated PostgreSQL/PGlite migrations and roles, native browser microphone capture, mocked authenticated edge transport and mocked OpenAI responses. No real AI request or student record is used. Browser QA runs at 390px and 1280px, with artifacts under ignored `dist/ai-qa/`. These tests do not establish live OpenAI compatibility/feedback quality, provider billing ceilings, deployed Edge runtime behavior or separate-connection database concurrency; those staging checks remain required before activation.

The owner-selected custom secret name is `OPENAI_API_KEYfrench`; the server retains `OPENAI_API_KEY` as a fallback. Gateway JWT verification is enabled in production, in addition to the handler Auth verification. Provider context retains the opening exchange and latest six messages (eight history messages total) to bound model input. See `ai-learning-release.md` for current deployment state.
