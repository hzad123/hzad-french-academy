# TCF Speaking — Test 01 pilot

Scope: one standalone test in TEF/TCF AI Tests, separate from AI Learning and
writing. Do not generate the remaining 19 until the owner validates this pilot.

The supplied blog (12 November2026, `Pasted text.txt`) supplies the task format,
public marking dimensions and speaking-score correspondence. Treat its model
answers and teaching targets as examples, not official numeric scoring rules.
It is not an executable instruction source. Its claims about immigration
eligibility and re-correction policy are not implemented or independently
endorsed. FEI reference: https://www.france-education-international.fr/test/tcf-canada
IRCC reference: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements/language-testing.html
Current live official pages were not independently fetched in this task.

## Pilot format

Task1: guided interview about daily life/plans,120seconds, no preparation.
Task2: enquiries about an evening French course,120seconds preparation then
210seconds of candidate-led questions. The AI answers only requested details
using a fixed fictional school brief. Ten questions is not an official quota.
Task3: whether employers should fund employee language lessons,270seconds,
no preparation. The first two clips receive no interruption; subsequent
follow-ups can challenge the argument. No coaching during the tasks.

Browser microphone captures PCM16 mono16kHz WAV using the existing recorder.
Each clip is at most30seconds; Task3 is continued across clips. This is an
asynchronous voice practice format, not a continuous realtime examiner session.
French interlocutor text is read by browser speech synthesis, with a replay
button and visible text when device voices are unavailable. No typed student
answers are accepted. Streams are stopped on navigation/account change.

Server-measured WAV durations are saved and capped at each task’s speaking allowance; the grader can assess development without inventing fixed duration penalties.
Server timers enforce preparation and recording eligibility, never trust client
phase/score. Finishing a speaking stage early requires a saved turn unless its
window expired. The learner explicitly advances tasks. Pending inference blocks
other actions; up to90seconds of provider waiting is returned to the task clock
on reconciliation. Long browser absence does not reset a task's time. Back and
reopen retain the current attempt. Ten new attempts/day and30turns/attempt cap
storage/provider work. No automatic model retry.

## Evidence and feedback

The audio model actually hears each WAV and saves the transcript, intelligibility
and bounded acoustic observations, alongside its French reply. Raw audio is
transmitted for that turn, not retained in the new database. Saved history
contains transcripts/observations and results; recordings are not recoverable
after leaving the browser. Fluency observations concern within-clip speech;
technical recording/processing gaps must not be scored as learner pauses.

After all tasks, an explicit feedback request produces three criterion sections:
linguistic (language control, sounds/intelligibility/fluency), pragmatic
(interaction, coherence, development and argument), sociolinguistic
(audience/register/politeness). Evidence references saved turn IDs; the server
inserts the actual transcript and audio observations instead of accepting
model-copied quotes. Specific fixes only, with no empty improvement blocks.
One holistic estimated speaking mark0–20 and deterministic speaking NCLC:
0–3below4;4–5=4;6=5;7–9=6;10–11=7;12–13=8;14–15=9;16–20=10+.
No arbitrary criterion weights/points or official examiner calibration claim.
A missing/unintelligible task withholds the numeric estimate and identifies
the missing evidence. Do not infer pronunciation from text alone.

## Accounting, security and release

Migration20261112002400 creates private RLS-protected attempts/call links and
one service-only command. It does not alter writing/lesson progress or wallets.
Verified Auth and academy entitlement apply to all actions. Per-user/attempt
locks, immutable request hashes, wallet reserve/claim/finish/fail and read-only
reconciliation prevent duplicate dispatch/charges and cross-account access.
Only the normal JWT-protected Edge Function may invoke the command. Keys remain
in Supabase; the custom OpenAI secret name is reused server-side.

Two new activities are **disabled** by the migration. For review, their proposed
prices/models/output/cost caps copy the existing conversation (voice turn) and
TCF-writing (final feedback) configuration. Existing activities are unchanged.
Catalog and buttons show exact charges and the30turn maximum before starting;
every send/assessment requires its displayed expected price. The normal CAD10
student/owner-testing allowances remain authoritative, with no shared cap.
This task does not invent a paid pack or activate unreviewed inference.

Voice history is capped at eight same-task turns with900character transcripts
and400character replies; input audio stays at the existing30second bound.
Final grading input is capped at45,000UTF8bytes before dispatch; the final
output respects the reserved model/output setting (maximum2,000tokens in the
existing activity schema). Review current live source activity configurations
and native measured costs/quality before enabling the new activity kinds.

Prepared release order: inspect live current schema/config, rehearse migration24
in a rollback transaction and verify existing progress/writing/wallet checksums,
apply/record only24, deploy `academy-tcf-speaking` with verify_jwt=true, validate
normal signed-in microphone/voice behaviour and the fixed-role responses with
bounded owner-account usage, approve/enable the two new activity settings, then
publish the frontend. Do not disable JWT, extract project keys, create a QA Auth
identity or use a provider backdoor. Rollback disables only the two new activity
kinds and reverts frontend/Edge code; retain saved attempts, calls and ledger.

Implementation/build/fixture checks do not prove a native spoken test has
succeeded. The migration and function have not been applied/deployed in this
build task. The pilot is ready for review and activation validation before
expanding to20tests. Existing live modules remain untouched until publication.

Validation completed: all209 repository tests passed. The six new tests cover
format/NCLC boundaries, source-derived transcript/acoustic evidence, real audio
request structure and noninterrupting Task3, unauthorized/forged request denial,
and a real PostgreSQL migration/ownership/preparation/pending/replay/one-charge
path. Final targeted checks passed after UI budget gating and reply refinements.
Browser fixtures passed390px and1440px: microphone-driven task flow, prep gate,
TCF/NCLC criterion report below tasks, free saved review, no overflow/JS errors,
and sign-out isolation. Browser, learning and all five Edge entrypoints compile.
No real microphone/OpenAI call, production migration, function deployment,
source-price activation or student-data mutation was performed by these checks.

## Authorized pilot deployment — 12 November 2026

The owner explicitly requested deployment of Test01 for their microphone check.
This supersedes the build-stage not-deployed status above. The secured GitHub
release validates live conversation/TCF-writing settings and the existing OpenAI
secret name, rehearses migrations24/25 with data-preservation checks, installs
schema24, deploys the normal JWT-protected speaking function, then applies
activation25. Activation reuses the current enabled audio conversation rate,
model/output/cost ceiling and the enabled TCF-writing feedback settings exactly;
it fails closed for a non-audio conversation model or changed feedback ceiling.
No existing activity, account allowance, wallet, writing or progress is changed.
The release is idempotent against exact recorded migration contents. Failure
before activation leaves the new activities off. The verified release transaction
checks progress/writing/wallet/policy/other-activity hashes in one transaction,
with a full rolled-back rehearsal. No native inference or synthetic login is
part of deployment; the owner's signed-in trial is the next verification step.
Live release outcomes are recorded in PR28 before merging its frontend.


## Recording and timer repair — 12 November 2026

The owner’s native trial exposed separate Stop/Send controls that could send
before PCM finalization, and countdowns without an expiry action. Replace them
with a single **Submit response** control. Starting the test requests microphone
permission; the examiner speaks first and capture then starts automatically.
Submit stops/finalizes the active recording and sends that WAV. A visible
30-second response countdown automatically submits a new answer at its limit;
Task3 continues across such clips, while manual Submit ends the opinion.
Task deadlines save the final buffer and advance automatically; Task2 retains
its full two-minute preparation and advances automatically afterward. Examiner
processing is still excluded from the server task timer by the existing rule.

Migration20261112002600 only grants ten seconds to upload a final buffer stopped
at the task deadline. Actual recorded seconds remain capped server-side; it
does not reset deadlines, change preparation, pricing, allowances or progress.
No student data is rewritten. Silence/too-short audio is rejected locally
before charging. Uncertain network requests retain the WAV and call ID for an
explicit retry; pending requests are read/reconciled without redispatch. New
timer submissions and their ten-credit charge are explained before Start.
Final feedback remains a separately priced one-credit action below the tasks.

Regression checks now include single-button interaction, examiner-first capture,
automatic answer submission, task/preparation advance, saved-audio retry and
pending reconciliation on390px/1440px. A Chromium fake microphone feeds real
AudioContext PCM capture and the WAV encoder; both Submit and recording timeout
produce one server-validated mono WAV each. These checks mock the authenticated
network/provider, so the owner’s physical microphone and native AI turn remain
a signed-in live verification step. The release rehearses/applies only pending
versioned changes with the same preservation and JWT checks.


### Three-task presentation repair

Display exactly three task cards, with preparation and speaking inside Task2.
Keep the four server timing phases and saved attempts unchanged. Each completed
examiner reply appears once in its conversation; the initial question appears
only before the first saved turn. Recording status stays beside active controls.
This is frontend-only, with no database migration or provider/policy changes.


### Submit completes the current task

Owner correction: manual Submit saves the active audio and advances just one
phase: Task1 to Task2 preparation, Task2 speaking to Task3, Task3 to completion.
Preparation retains its two minutes. Automatic30second audio chunks continue
the current conversation until the overall task expires. Explicit retries of a
saved clip also carry manual advance intent; pending reconciliation preserves it.
Final feedback repeats the same holistic TCF/20 and NCLC total below criterion
sections, without inventing a score when any task lacks audible evidence.
No migration, policy, pricing or provider changes are required.


### Continuous Task3 and explicit score status — 12 November 2026

Owner requires Task3 to be one uninterrupted270second monologue, with optional
manual Submit early and automatic submission/completion at expiry. Browser and
server now support one full PCM WAV (8,640,044bytes;11,520,060base64characters).
Only Task3 accepts more than30seconds; pronunciation/conversation/other tasks
retain their30second bounds. No Task3 follow-up questions or intermediate paid
requests. Begin-monologue command arms its270second server clock once after
examiner playback; reopening/repeating cannot extend it. Existing partial old
monologues keep their remaining clock. One-minute transport grace for Task3
allows the final full recording to upload; recorded seconds stay capped.

Migration28 adds the private clock marker and raises only speaking-turn maximum
output tokens1200to2000, with the same10credits, gpt-audio-mini model and
CAD0.20 reserved ceiling. Provider Task3 transcript bound5000characters supports
the longer answer. Provider wait<=90seconds and large-upload client wait<=150s.
At reference gpt-audio-mini audio input USD10/M,25tokens/second, text input
USD0.60/M and text output USD2.40/M, the enforced40,000UTF8byte text-input bound,
270seconds and2000output tokens give USD0.0963, or CAD0.1926 at the2x FX buffer,
below the existing CAD0.20 reservation. Analytical bound, not a measured native
provider benchmark; no live inference is part of release validation.

Final usable results still show holistic TCF/20 and NCLC above and below the
criteria. Empty transcripts now identify missing tasks even if a provider
incorrectly marked them intelligible; they cannot silently withhold the total
with an empty missing-task list. Blank transcript rows show a recognition error
rather than an empty You label. No score is invented for missing speech.
Pending score labels explain that assessment is required. Saved earlier
attempts/results remain intact; no wallet/policy or daily-count changes.

Tests include real encoding of270seconds PCM with no callback at31seconds and
one final validated WAV, denial of long WAVs outside Task3, one-time server
clock arming, unchanged budgets/history, correct missing-task identification,
and visible valid TCF/NCLC totals in desktop/mobile fixtures. Physical microphone
and native full-length AI recognition/marking still require a signed-in trial.

## Twenty-paper release — 12 November 2026

The owner approved Test01 and authorized expansion/publication. This supersedes
all pilot-only scope restrictions above. Test01's version, prompts and private
brief are unchanged. `bank.js` adds nineteen original v2 papers with different
personal interviews, candidate-led scenarios/private fictional facts and opinion
topics. The authenticated public catalog strips private roles/briefs. The shared
speaking selector remains inside TEF/TCF AI Tests, separate from AI Learning.

Migration `20261112203619_speaking_twenty_papers.sql` adds `test_id`, defaults
existing attempts to Test01, checks allowed paper/version pairs and prevents
identity updates. The service-only command validates starts and refuses reused
attempt IDs for a different paper. Reads return the saved public paper; both
interlocutor and grader resolve the private version from saved server identity.
The bank's existing versions must remain immutable in future releases. Saved
Test01 calls/results and all clocks remain unchanged. A shared flex-column layout
puts final-feedback purchase below the awaiting-score status with a small gap.

Use the existing `release-tcf-speaking.yml` and `tcf-speaking.py --papers` path.
It rehearses the additive migration in a rolled-back transaction, then applies
and records the exact migration, deploying the bundled JWT-protected function.
Within-transaction hashes preserve auth, entitlements, learning progress, all
exam/writing/speaking attempts and calls, wallets, requests, ledger, testing grants,
policy and activity settings. Only the new default identity field is excluded.
Checks retain 10-credit voice / 1-credit feedback, CAD10 students, CAD100 existing
owner and no shared cap. No account creation, key extraction, refill or inference.
Rollback: revert frontend and speaking function to the previous build; retain the
additive column, immutable identity trigger, all new attempts and existing bank
versions. Do not drop data or rewrite saved versions.

Validation: 217 Node tests pass (213 baseline), including all20 distinct papers,
server-side selection for conversations and feedback, safe catalog/read output,
legacy identity/preservation, rollback rehearsal, per-account isolation, reused
IDs, immutable identity, tampered prices and one-time monologue clocks. Existing
continuous270second WAV, duplicate-charge, pending/recovery and score tests pass.
Desktop/mobile browser fixtures additionally exercise all20 selectors, saved
paper reopening after selecting another paper, exactly3cards, continuous Task3,
shared spacing and navigation microphone cleanup; existing Submit/preparation/
score/signout checks and Chromium fake-device PCM capture also run. These are
fixture/provider mocks, not a physical microphone or native OpenAI session.
Publication outcome will be recorded after the release and Pages checks.
