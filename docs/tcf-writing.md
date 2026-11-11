# TCF writing — 20-paper module

**Current marking status:** enabled by the owner’s explicit activation instruction. One assessment of all three tasks costs **1 AI credit**; saved feedback is free. Uses the existing server-side OpenAI secret, with CAD $0.02 reserved per dispatch under the unchanged CAD $10 individual allowance and no shared cap. Earlier paused/unpriced release notes below are historical. See the activation record at the end.

## Deployment update — 9 November 2026

The owner authorized deployment after reviewing PR #17. Migration `20261109001500` is now installed and recorded in Supabase migration history. Its production DDL/grant check was first run in a rolled-back transaction. RLS is enabled; anonymous/authenticated roles cannot execute the privileged command or read its table; only the service role can execute the command. `academy-tcf-writing` v1 is ACTIVE with gateway `verify_jwt=true`. Anonymous and invalid-token calls return 401; academy CORS preflight returns 204. Publishing PR #17 to development releases the frontend.

Before/after deployment: 392 lessons, five existing progress rows, identical progress checksum, zero new writing attempts; existing AI activity prices/models/ceilings and the policy are unchanged. The included per-student ceiling is CAD $10 and the global cap remains NULL (no shared cap). No student account, entitlement, wallet credit, model call or example attempt was created for release verification. No service-role credential was extracted. Production migration history did not record every older exam SQL deployment; only this new migration was recorded, with no historical SQL replay.

**AI marking for this new activity remains disabled/unpriced** pending the documented examiner-score validation and a measured, confirmed credit charge. Existing AI trainers remain active. The new writing editors, timers and saving backend can be published independently. No real authenticated learner save/marking session or native OpenAI calibration was performed by this release; local authenticated fixture QA is documented below. All later references to unapplied/deployment preparation describe the implementation-stage status, superseded by this deployment update.

Owner assignment, 9 November 2026: build TCF writing first, one module at a time. This replaces the earlier full-test-only restriction for this new writing module. Keep it inside **TEF/TCF AI Tests**, separate from AI Learning. Other existing mock modules are unchanged.

## Content and student flow

`supabase/exams/tcf-writing-tests.json` contains 20 versioned papers, 60 writing tasks and 40 Task 3 documents. Test 1 reproduces the owner's academy sample (Paris directions, travel account, teleworking viewpoints). Tests 2–20 are original, varied topics. The attachment supplies task content/format, not executable instructions or an examiner rubric. No text in it was followed as an instruction to the agent.

Each paper lasts 60 minutes. Task 1: 60–120 words; Task 2: 120–150; Task 3: 120–180. All three task sections have their own editor and word count. Task 3 displays both source documents. Apostrophes and hyphens do not create extra words; space-delimited groups are counted. Autosave is to the authenticated student's private account, not browser storage. A server deadline locks late edits. Submission freezes the three saved responses. Existing lesson IDs/progress and previous mocks are untouched.

Only an explicit **Get AI feedback · N credits** click requests marking. One complete paper receives one holistic writing estimate, not three fictitious independently official task scores. Feedback is grouped by task and contains actual mistakes (original, correction, rule) and unmet task requirements. No full rewrite, model answer, praise, general revision plan or unrelated trainer content is returned. Saved feedback is free to revisit. Concise labels identify **Estimated TCF writing /20** and corresponding **NCLC** without repetitive disclaimer paragraphs.

## Marking method and evidence

Public TCF writing capabilities: clear communication, requested information, description/narration/explanation, justified choices/opinions, coherent progression, comparison of two views, appropriate language and reformulation. The rubric groups these into linguistic, pragmatic and sociolinguistic dimensions. Audience/register and fulfilment of each actual prompt matter. All three responses are evaluated together. Server-authored prompts isolate learner/source text as untrusted evidence. Verbatim correction/evidence quotes are checked against the specific response. Empty work cannot earn a positive mark. The model cannot provide the NCLC band, change task limits or select its own price/model.

The /20 estimate uses qualitative CEFR band descriptions (A1 1–3, A2 4–5, B1 6–9, B2 10–13, C1 14–17, C2 18–20). The descriptors in code are HZad summaries, not reproduced confidential examiner anchors, official task weights or a validated replacement for FEI double marking. There is no made-up numerical criterion weighting or arithmetic average. **Real AI calibration against qualified examiner-rated samples has not been performed.** Before release, assess benchmark scripts at multiple levels, borderline bands, off-topic/incomplete/copy-heavy responses and correct French variants. Inspect systematic bias and error inventing as well as numeric agreement.

Public FEI guidance says a paper *could* receive “A1 non atteint” if tasks are missing, off-topic or do not respect word lengths. It does not supply a public numerical deduction rule. This implementation therefore shows the concrete requirement failures and withholds the TCF/NCLC estimate for such papers; it does not fabricate an exact penalty. Normal in-range performance still receives evidence-based holistic scoring.

TCF expression écrite → NCLC: 0–3 below NCLC 4; 4–5 = 4; 6 = 5; 7–9 = 6; 10–11 = 7; 12–13 = 8; 14–15 = 9; 16–20 = 10+. The top band is not extrapolated to NCLC 11/12. Never reuse this conversion for reading/listening (different score scales), or for TEF.

Sources and verification:

- Owner-provided `TCF Writing Test 1_ (1).docx.pdf`, two pages, received 9 November 2026. Extracted completely; Test 1 content and all three ranges match.
- Owner-provided FEI TCF Canada page text, received earlier in this thread: section timings/ranges, writing capabilities and “A1 non atteint” conditions. This is available evidence, not independently fetched during this task.
- FEI public reference: https://www.france-education-international.fr/test/tcf-canada and its evaluation/results resources.
- IRCC expression-score correspondence reference: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements/language-testing.html
- Live FEI fetch was attempted 9 November 2026 and denied by the environment domain policy. The attached sample contains **no examiner marking/scoring guide**. The NCLC correspondence is encoded as the published writing-scale mapping with every boundary tested; its current official page and the full examiner guide must be checked during release review. No claim is made that restricted examiner material was obtained.

## Backend and cost controls

New JWT-verified `academy-tcf-writing` Edge Function authenticates the bearer with Supabase Auth and uses the verified ID for every command. Only the existing privileged runtime credential is used server-side. No credential is read, printed or returned. Existing custom OpenAI secret naming is preserved.

Migration `20261109001500_tcf_writing.sql` is additive. It adds a private RLS-enabled draft table and service-only command function. No public/client table access. Verified entitlement, ownership, optimistic revisions, immutable submission, 60-minute server deadline, replay-safe starts, one active draft per paper (resumed on reopening) and 50 genuinely new starts/day are enforced. Up to 50 recent writing attempts are listed; stored attempts are not erased. Inputs are bounded to three strings, 3,500 characters each / 6,500 total and a 40 KB HTTP body. Browser drafts remain in session memory until saved; no student writing goes in localStorage. Account switches/sign-out clear private UI and memory. Revision conflicts retain unsaved text and require an explicit choice rather than silent overwriting.

A separate `tcf-writing` activity reuses the existing atomic AI wallet, CAD $10 included per-student ceiling, purchased-budget handling, daily AI limit, append-only ledger and reserve/claim/finish/refund RPCs. No shared spending limit is added. Attempt ID is the immutable request ID, preventing a fresh charge on submission replay. Submitted text/version is fingerprinted. The activity's frozen model and maximum output tokens control the one OpenAI request. Automatic paid retries are prohibited. Provider/output failure refunds credits through the existing wallet; an uncertain finish returns processing for read-only reconciliation. Each task accepts up to six genuine corrections and four requirement issues, within the reserved token limit. UI loading/account changes cannot trigger a provider call.

The **new activity defaults disabled with NULL credits/model/ceiling**. Existing trainer prices are not changed; the fixture's 3-credit charge is only a test value. This paper has different input/output requirements and needs a measured cost ceiling and owner-confirmed price before activation. Do not assume a normal short writing-review price pays for this full paper. Benchmark the actual prompt, up to 6,500 characters of responses, 2,000 output tokens and FX buffer. Use `OPENAI_API_KEYfrench` via server secrets only. No native inference was run or billed during implementation.

AI Learning filters this distinct activity out of its history/cards, keeping all TCF test content in its requested area. The existing AI wallet state still returns the authenticated account's activity metadata; it grants no new client privileges.

## Release and rollback

Prepared, **not applied/deployed** in this task:

1. Review content, official current score correspondence, rubric/calibration and PR.
2. Inspect current production grants, dependencies and pending migrations. Apply only `20261109001500_tcf_writing.sql`, in its transaction; do not apply the unrelated deferred maintenance migration.
3. Deploy `academy-tcf-writing` with `verify_jwt=true`; retain Auth verification in its handler. Anonymous requests must be 401. Verify an entitled test account and cross-account denial.
4. Check real provider output validity, score calibration and worst-case costs with explicitly bounded benchmark calls. Record measured usage and approved credit/ceiling settings, then enable only this new activity. Do not modify existing wallet balances, included caps or pricing.
5. Merge the frontend PR into development and verify Pages/GHL on desktop/mobile. Test a real private saved draft and assessment under an authorized test account, with a before/after ledger check.

`supabase/rollbacks/20261109_disable_tcf_writing.sql` disables new marking while preserving all drafts, results, ledger entries and existing course progress. UI/Edge can be reverted separately. Never drop retained student response tables as rollback.

## Validation

- 167 Node tests pass, including 20 new content/rubric/handler/database tests. Existing tests/build were run before implementation; the initial sandbox run had transport/resource failures. The complete serial run outside that socket restriction passed.
- Browser bundle, original learning bundle and all four Edge entrypoints compile. Server bank/rubric modules are excluded from the public app bundle.
- Desktop 1440×1000 and mobile 390×844: 20 papers, three editors/source documents, word counts, autosave/reopen, keyboard task jump, mistake correction, TCF/NCLC output, one charge/free review, explicit save and cross-tab conflict recovery, in-flight double-click prevention, global Back, AI Learning separation, sign-out/account-switch isolation and no overflow/JS errors pass against real UI/handler with isolated provider/database fixtures.
- Real provider behavior, live Supabase migration and deployed dashboard are not verified by these fixtures. Production is untouched.

## Connection repair — 9 November 2026

The first signed-in catalog load failed in `academy_tcf_writing_command('list')`: its SQL alias `r` conflicted with the PL/pgSQL record variable `r`, raising PostgreSQL 42702 (`r.id` ambiguous). This was a backend query defect, not a missing frontend deployment or a cache issue. Previous fixture QA used a mocked command adapter and missed the valid-user list branch; unauthenticated gateway/asset checks did not exercise that branch either.

Forward migration `20261109001600_fix_tcf_writing_history.sql` replaces only the function definition, qualifying the history join with a distinct `history_request` alias. The original applied migration stays unchanged. No table, attempt/response, progress, credit, policy, model or price is updated, and existing function grants are retained. The migration is applied and recorded in production. The failing production query was reproduced before repair, verified with the new definition in a rolled-back transaction, and repeated successfully after application. Diagnostic output returned only the JSON result type; no learner identity/text or privileged credential was extracted. Before/after progress, writing-response and wallet checksums, activity settings and execution grants matched. Student/anonymous callers remain unable to invoke the privileged function directly.

169 tests pass. The new database coverage includes both empty and populated entitled-user histories and a complete catalog GET through the real handler and real PostgreSQL RPCs, returning all 20 papers without an AI call. Browser and all Edge builds pass. No frontend bundle or Edge redeployment is required for this query-only repair. A real authenticated browser session was not available for the repair verification; production function execution and the local authenticated handler/database path are the verified evidence. AI marking remains paused as before. A learner already on the error screen must go Back and reopen TCF Writing to make a fresh request.


## Reopening and paper switching repair — 9 November 2026

Production contained three active copies of Test 1. Every card click previously allocated a fresh attempt, and a three-open-draft guard then blocked all papers. While AI marking is paused, students cannot clear those drafts by completing an assessment, making that guard inappropriate for the free writing/editing flow.

Forward migration `20261109001700_resume_tcf_writing_drafts.sql` is applied/recorded. Under the existing per-user lock, a start now finds the active draft for that paper before checking new-start quota or inserting. Reopening preserves ID, responses, revision and original deadline. For legacy duplicates, a draft containing writing is preferred over an empty duplicate, then the newest is chosen; no previous attempt is deleted or modified. Students can switch between all 20 papers. There is no three-paper barrier. Fifty genuinely new attempts per day remain the storage/abuse bound; resuming still succeeds at that limit. Submitted/expired attempts remain saved and immutable, and a new timed attempt after expiry is still a new start. This does not change AI prices, budgets, access, timing or marking availability.

The frontend labels an active paper **Resume Test** and brings operational errors into view instead of leaving them below the 20 cards. Older already-loaded clients also benefit from the server fix immediately: their existing Start action returns the active draft.

172 tests and all builds pass. Added real PostgreSQL coverage for repeated Test 1 open/list/reopen cycles, all 20 papers, timer/text preservation, legacy duplicates and resume at the daily quota. Desktop/mobile browser checks repeat both global Back and the internal catalog button, verify no duplicate creation, switch papers while AI is paused, and check saved text and timers. Production verification replaced the function and exercised resume plus another-paper start inside a rolled-back transaction against the affected three drafts. The temporary new paper was rolled back. After applying the function-only migration, existing response/progress/wallet checksums, activity settings and execution grants matched; no grading was called and no previous record was removed. Actual production browser authentication was not available for verification; the exact production database path and local authenticated UI/handler/database tests are the checked evidence.

## Task 2 sample correction — 9 November 2026

The owner rejected varied Task 2 genres/requirements and supplied the sample again. All 20 revised Task 2s now use separate **Sujet :** and **Consigne :** blocks, followed by **(120 mots minimum / 150 mots maximum)**. Each sujet sets a blog context where readers recount an experience. Each consigne asks for a message recounting a past experience, including place, activities and impressions, then explaining why it was important. Test 1 uses the owner's exact travel sujet and consigne. Tests 2–20 change the content/topic while retaining that structure, without adding a recommendation, review, advice, critique or different audience/genre. Task 1 and Task 3 are unchanged. The owner preference is recorded in AGENTS.md and MASTER_PLAN.md.

The current bank is `tcf-writing-2026-11-v2`; the immutable original bank is retained in `tcf-writing-tests-v1.json`. Migration `20261109001800` expands the allowed paper versions without changing existing rows. The command starts/resumes the specifically requested version (with v1 as the backward-compatible default), includes version in history, and preserves the resume/quota fixes. Updated clients request the revised catalog with `?format=sample-v2` and explicitly send its version when starting. Already-loaded older clients receive a matching v1 catalog and retain coherent v1 starts until refreshed. A previous attempt is always returned with its actual original paper, and assessment uses that saved paper version rather than the latest question bank. Earlier drafts remain accessible as **Previous paper**; current cards start/resume the corrected paper version. Existing saved answers are never silently moved under a changed question.

177 tests pass, including all 20 Task 2 instruction/word-limit patterns, exact Test 1 wording, immutable Task 1/3, old/new catalog compatibility, retained-paper delivery and saved-response/version isolation through real PostgreSQL. Desktop 1440px/mobile 390px checks inspect the Sujet/Consigne/word-range layout on every one of the 20 new papers, as well as earlier navigation/save/resume/feedback privacy regressions. Browser, learning and all Edge builds pass.

Deployment: academy-tcf-writing v2 is ACTIVE with verify_jwt=true; migration 20261109001800 is applied/recorded. A rolled-back production check verified earlier responses remain v1 and a corrected v2 paper can start/resume independently; temporary probe attempts were rolled back. Existing writing/progress/wallet checksums, activity settings and grants matched before/after. No AI call, student progress reset, old-attempt rewrite or pricing/marking activation occurred. Frontend publication via this correction PR supplies the new layout and catalog-version request. Native examiner calibration and authenticated production browser marking are not claimed; marking remains paused as documented above.


## Live marking activation — 9 November 2026 (Winnipeg)

The owner explicitly directed activation using the already-configured OpenAI key. Migration `20261109001900_activate_tcf_writing.sql` is applied/recorded. Only the tcf-writing activity is enabled/configured: model gpt-4o-mini, **1 credit for all three responses**, 2,000 maximum output tokens and a 20,000 micro-CAD (CAD $0.02) worst-case hold per dispatch. All existing activities/prices, student records, wallets, policy and grants remain intact. Policy is enabled, the included cap remains 10,000,000 micro-CAD per learner, global cap is NULL, and all otherwise-verified entitled learners are eligible. No card payment or wallet refill is introduced. The existing disable-TCF-writing rollback remains available without deleting work.

The custom secret name was verified through metadata only; no OpenAI key value, broad service credential or learner Auth session was retrieved. `academy-tcf-writing` v3 is deployed with verify_jwt=true. Feedback is kept compact (up to three important error patterns per task, repetitions grouped) so the complete JSON can fit the reserved output limit. Corrections/criteria quotes are still checked against the learner text. The normal wallet reserve/claim/finish/refund path controls all live calls; one attempt ID prevents a second charge and revisiting results is free. The button and quote use singular **1 credit** correctly.

`npm run check:tcf-budget` now runs during the build. It checks all 40 current/retained papers against a conservative worst-case input bound (6,500 JSON-escaped response characters, UTF-8 bytes as a token upper bound, plus 1,024 framing tokens). Largest input bound: 46,500 tokens; with 2,000 output tokens, reference gpt-4o-mini pricing of USD $0.15/M input and $0.60/M output, and CAD 2/USD FX buffer, the upper estimate is 16,350 micro-CAD. The reserved 20,000 micro-CAD is greater. These are explicit reference-price/FX assumptions and an **analytical bound**, not invented measured provider usage or a fresh pricing quote. Existing ordinary writing already uses the same model, one-credit charge, 2,000-token maximum and CAD $0.02 ceiling.

178 tests and all builds pass. A database activation regression loads the current nullable-global-cap wallet implementation and verifies active authenticated state, the one-credit reservation, frozen model/output limit, one charge on replay, a capped learner being denied while another learner remains eligible, and unchanged course progress. Desktop/mobile fixture QA checks the enabled one-credit button, feedback and TCF/NCLC display, one charge, free review, Back/resume and account isolation. Production activation was rehearsed in a rolled-back transaction and then applied; existing progress/response/wallet checksums, policy and other activity settings matched before/after.

**Verification limit:** this session did not run a fresh native OpenAI assessment or a signed-in production browser submission. The real secret's presence, deployed function, live activity/policy and authenticated state RPC were verified; provider-format/feedback behavior was tested with fixtures. No learner was billed for release validation. Examiner-rated sample calibration and independent editorial quality work remain follow-up evaluation; the UI continues to label the holistic TCF/NCLC writing result as an estimate, without claiming confidential examiner weights or official certification.

## Native grading failure diagnosis — 9 November 2026 (Winnipeg)

The owner reported a real refunded assessment failure after activation. The stored request is failed; the failure took approximately 5.5 seconds and no usage/failure detail survived the original catch path. Only timing/model and input lengths were inspected, not the learner's writing. These facts do not establish whether OpenAI rejected the call or generated feedback failed validation. **No root-cause fix or successful native assessment is claimed yet.**

The normal JWT-protected backend now classifies provider HTTP status/allowlisted error codes, network failures, truncation, invalid JSON, invalid score, unverifiable evidence and malformed feedback. The authenticated failed response includes a sanitized `failure` object; logging uses the same bounded metadata. Provider error messages/bodies, keys, headers and learner text are never logged or returned as diagnostic details. Diagnostic reporting cannot prevent the existing credit refund. The full suite passed 180 tests and builds, and targeted provider/privacy regressions passed after adding the response metadata. The original failure remains saved/refunded; no learner response, wallet policy, price, score or permission was changed by diagnostics.

Automatic approval review rejected a proposed short-lived native QA identity because the fix request did not explicitly authorize production Auth user/identity/profile, test entitlement/wallet and up to CAD $0.06 of OpenAI usage. The rejected command did not run. No workaround, service-role key extraction, JWT bypass or provider wrapper was used. Exact bounded plan prepared at `/tmp/tcf-native-qa-plan.md`: one unprivileged synthetic login, 15-minute test access, three test credits with a CAD $0.06 cap, at most three explicit native calls, followed by revocation/ban and removal of its sessions/test response content. No real student's data is to be changed. This native test is **awaiting explicit owner approval**. Local fixture tests cannot establish the cause of the original native provider failure.

## Saved feedback retry and owner testing budget — 11 November 2026

The owner authorized a CAD $100 total academy AI testing ceiling for the
existing owner account. The verified account identifier stays outside source.
Migration `20261110002000_owner_testing_budget.sql` adds a private audited testing
grant, guarded by service-only execution, existing verified academy access and
private operator membership. It adds the difference from the existing CAD $10
cap (normally 4,500 credits at CAD $0.02 reserved per credit), including usage
already consumed within the CAD $100 total. A repeated grant cannot refill it.
Available credits increase once; used/reserved amounts, purchased budget and
original expiration remain intact. No purchase receipt is invented. Ordinary
learners remain at CAD $10 and the shared cap stays NULL. This academy allowance
does not fund the OpenAI billing account or change its provider-side limits.

Migration `20261110002100_tcf_saved_assessment_retry.sql` adds a nullable latest
review ID without rewriting earlier responses. An explicit **Retry saved feedback
· 1 credit** action allocates a new server-side review only after the preceding
review has failed. Responses, paper version, original timer and submission are
frozen. Concurrent/replayed retries share the new review ID and normal atomic
reserve/claim/finish/refund logic; completed feedback remains free to reopen.
Opening a test never calls the provider. Failed retries persist bounded,
allowlisted failure codes/status/numeric usage only, so subsequent inspection
can distinguish provider rejection from malformed feedback without storing keys,
provider messages or learner text in diagnostics.

Validation: all 183 tests passed, including real PostgreSQL owner-only budget,
idempotency, ordinary student limits, saved retry ownership, frozen answers and
one-charge checks. Desktop 1440px and mobile 390px browser fixtures passed the
full 20-paper navigation/editing flow plus failed feedback, refund, saved retry,
TCF/NCLC display, unchanged timer and no duplicate paper. Browser/learning/Edge
builds and the analytical cost check passed. Provider responses in these tests
are fixtures; a successful native OpenAI assessment is still unverified.

**Release blocked:** the previously configured Supabase management credential now
returns HTTP 401 `Invalid access token` for both function metadata and database
queries. Cloud readiness reports the secret bound, but fresh service requests
reject it. Neither new migration nor the owner grant has been applied, and the
updated Edge Function has not been deployed. Keep this frontend change unmerged
until the backend dependencies are live. Replace `SUPABASE_ACCESS_TOKEN` in the
cloud environment's HTTP secret settings for `api.supabase.com`; do not put a
key in chat, source or frontend code. The existing OpenAI inference secret is a
separate credential and should not be changed on this evidence.

Release order once management access is restored: compare deployed definitions
with migrations 018/019; snapshot progress, writing responses, wallets, policy
and activity prices; rehearse 020/021 and the single private owner grant in a
rolled-back transaction; apply/record only these two migrations; grant the owner
CAD $100 once and verify all other wallet/progress/response data unchanged;
deploy the normal JWT-protected `academy-tcf-writing` function; merge after CI
and verify hosted assets. Then the owner can explicitly retry their saved
assessment and its safe failure reference can establish the native failure.
Do not create Auth identities, extract privileged project keys, mint user tokens
or bypass normal authentication. Rollback: disable only TCF writing if needed,
restore the previous frontend/Edge code, retain all attempts and accounting.
The additive columns and grant audit should remain; never erase consumed usage
or revoke a reservation as part of a code rollback.

### GitHub deployment fallback — 11 November 2026

Because the chat environment's editor/publication remains blocked, the owner
requested another way to release quickly. The tightly scoped **Release TCF
marking backend** workflow runs only on pushes to the reviewed feature branch,
never on pull requests/forks. It reads the repository Actions secret
`SUPABASE_ACCESS_TOKEN`, runs tests/builds, bundles the normal function, then runs
`scripts/release/tcf-marking.py`. No OpenAI key or service-role key is requested
from GitHub; the existing Supabase-hosted inference secret remains server-side.

The release script validates the live command against migration 018, checks
recorded migration contents for idempotency, rehearses only migrations 020/021
and the audited grant inside a rolled-back transaction, and checks data
preservation before committing. It selects the sole existing private audio
operator previously verified as the affected owner; ambiguous membership or
missing prior failed TCF request aborts instead of guessing an account. It does
not publish user identifiers in source or logs. Existing attempts, ordinary
wallets, progress, policy and prices are checksummed inside the transaction;
the owner retains expiry/used/reserved/paid accounting. The function is deployed
with `verify_jwt=true`. No native grading, synthetic login or payment occurs.

A missing/invalid GitHub token fails clearly. Add/update the repository secret
securely at GitHub Settings → Secrets and variables → Actions, then re-run the
failed release job. This avoids the broken chat environment editor. Merge the
frontend PR only after the backend release succeeds. A completed release job is
not evidence of a native marking success; that still requires the owner's
explicit retry of saved feedback and inspection of the sanitized result/code.

## Native INVALID_FEEDBACK repair — 11 November 2026

After the successful PR23 backend/frontend release, the owner reported native
retries failing with **INVALID_FEEDBACK**. This establishes feedback validation
as the failure category; it does not identify which field failed. The previous
provider requested `json_object`, which enforces JSON syntax but does not enforce
the task/criterion schema required by the validator. The prompt also omitted the
validator's numeric string limits, allowing an otherwise relevant long excerpt
or explanation to reject the whole assessment.

The provider now requests strict structured JSON with all required task,
criterion, evidence and correction fields, explicit types/enums and no extra
properties. The prompt spells out existing length limits and prohibits no-op
corrections. The same model, one-credit charge, 2,000-token output ceiling,
exact-quote verification, integer score, word limits and deterministic NCLC
mapping remain. There is no automatic paid retry or relaxed evidence check.
The cost bound includes schema bytes as well as messages.

Migration `20261111002200_tcf_feedback_diagnostic_codes.sql` extends only the
private sanitized failure-code allowlist. It records fixed categories for
fields, bounds, task/criterion structure and unchanged corrections rather than
collapsing them into INVALID_FEEDBACK. No raw provider response, error message,
learner content, identity or key is retained in diagnostics. Existing failure
codes remain readable. Release uses the already configured GitHub repository
management secret and JWT-protected function; previous grants are idempotent
and no wallet refill or Auth account creation occurs.

Native success must be verified by a normal signed-in retry after deployment;
fixture tests and schema conformance alone do not establish examiner accuracy
or eliminate semantic validation errors.

## TCF criterion feedback and saved-result upgrade — 11 November 2026

The owner confirmed native marking now succeeds, then requested examiner-criteria
feedback instead of general French commentary. The result page now places the
**total estimated TCF writing score /20** and **NCLC equivalent** prominently
above three fully visible sections: linguistic competence (language control),
pragmatic competence (consigne fulfilment/coherence/argument), and sociolinguistic
competence (audience/register/conventions). Each includes verbatim task evidence,
its effect on the estimated band, and a concrete criterion-specific change to
that response. No arbitrary criterion scores, official weights, task-score
averages or exact point deductions are invented.

The strict provider schema requires a criterion `improvement` field. The prompt
connects it to each actual task: Task1's communicative purpose/information,
Task2's past experience/impressions/personal importance, and Task3's reformulation
of both documents, comparison and justified opinion. Generic study advice,
praise and full rewrites remain excluded. Empty improvement means no supported
criterion-specific correction; no flaw is fabricated. New normalized feedback
has rubricVersion v2. Older stored results remain readable and opening them is
free. The same score/NCLC conversion and requirement checks remain: incomplete,
off-topic or out-of-range work receives specific requirement feedback rather
than an invented numerical penalty.

An explicit **Update TCF feedback · 1 credit** action upgrades older completed
feedback using the same frozen responses. Migration20261111002300 replaces only
the owned command function: a new review is allocated only when the caller's
quoted source review matches the current completed review. Replays/concurrent
clicks share the new review ID, even if it has already completed. Old requests
and results are retained; original paper version, text, deadline and submission
are unchanged. GET/read never regrade or charge. Failed updates use the same
saved-answer retry/refund path. No new attempt or timer reset is needed.

The owner authorized continued publication and the existing secured GitHub
release route is reused. No new secret, Auth identity, payment or student
allowance change is required. The analytical input bound including schema is
50,456 tokens; reference pricing and FX assumptions yield CAD0.017537 below the
unchanged CAD0.02 hold, with 2,000 output tokens. Output is kept compact with two
important error patterns and one requirement issue per task, plus concise
criterion reasons/actions. These are analytical assumptions, not a new live
usage measurement or examiner calibration.

Validation for this release: all196 tests passed, including real database
reassessment ownership/source replay, retained previous results and one-charge
handling. Desktop1440px/mobile390px browser checks passed visible criterion
actions, total/NCLC, no overflow, legacy free viewing and explicitly updating a
saved result without a new attempt. The result appears before the saved response
editors so the total and criterion breakdown are immediately accessible. Builds
and the updated analytical budget check passed. Local provider output is still
fixture data; the owner's preceding successful native marking verifies the live
provider path, while this richer native feedback remains to be checked after
release. Migration23 and the updated function are applied by the reviewed
GitHub release before frontend merge; release status is recorded in its PR.

## Grounding feedback in saved text — 11 November 2026

The owner reported **UNVERIFIED_QUOTE** after the criterion-feedback upgrade.
That category covers both an excerpt not found exactly in its cited response
and missing evidence for a positive score; the stored fixed code cannot tell
which occurred. Requiring strict JSON did not prevent a model from changing a
quote's wording/typography or omitting a citation. Repeating the same paid
request is not a durable repair.

Native feedback now cites server-created source IDs instead of reproducing
learner quotes. Each saved response is split into bounded, exact passages with
stable task-local IDs. Those passages replace the raw response strings in the
prompt rather than duplicating the student's text. The strict native schema
limits citations and corrections to the supplied IDs. Each criterion requires
one source reference; empty papers use a special no-evidence marker accepted
only with zero score and entirely blank writing. The server inserts the original
saved text and task number into the result, then runs the existing evidence,
score, criterion and correction validation unchanged. A correction referencing
another task, an unknown ID or raw quote fallback is rejected. Minimal corrected
French and explanations remain model-generated; no unverified paraphrase is
presented as the learner's original writing.

The report retains its three TCF criterion sections, concrete improvements,
one holistic estimated /20 score and deterministic NCLC equivalent. Saved
feedback/results/responses, wallet prices/caps, Auth/RLS and ordinary quizzes
are unchanged. No new SQL migration is required. The function is deployed
through the existing reviewed GitHub release using its existing secret, with
JWT verification retained; no automatic paid call or native QA identity is
introduced. The owner can explicitly retry the existing failed saved review.

Validation: all203 tests passed. New provider/source regressions cover exact
Unicode/whitespace preservation, repeated passages, bounded chunks, strict
source enums, required positive-score evidence, partial/blank tasks, wrong-task
and unknown IDs, rejected raw-quote fallbacks, unchanged-correction rejection,
private diagnostics and one provider call. The analytical input bound includes
the actual dynamic schema and additional worst-case source metadata:54,557
tokens, CAD0.018768 at the documented reference prices/FX buffer, below CAD0.02.
All builds passed. These are isolated native-transport fixtures, not a new live
OpenAI assessment. Publication is recorded in the PR; the owner must explicitly
retry their existing saved attempt to verify the changed native transport.
