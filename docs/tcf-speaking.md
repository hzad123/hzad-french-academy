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
