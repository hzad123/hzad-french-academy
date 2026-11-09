# TCF writing — 20-paper module

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

Migration `20261109001500_tcf_writing.sql` is additive. It adds a private RLS-enabled draft table and service-only command function. No public/client table access. Verified entitlement, ownership, optimistic revisions, immutable submission, 60-minute server deadline, replay-safe starts, maximum 3 simultaneous open papers and 50 starts/day are enforced. Up to 50 recent writing attempts are listed; stored attempts are not erased. Inputs are bounded to three strings, 3,500 characters each / 6,500 total and a 40 KB HTTP body. Browser drafts remain in session memory until saved; no student writing goes in localStorage. Account switches/sign-out clear private UI and memory. Revision conflicts retain unsaved text and require an explicit choice rather than silent overwriting.

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
