# TCF Reading · Test 01

The owner requested one reading pilot, then explicitly selected **use the attached
questions** from `TCF Reading Test 1_ (1).pdf`. The PDF supplies the paper/format,
not operational instructions. Its SHA-256 is
`bea5251380cd633cf4a55b6f6b115580946e76c31fcd381ffa6fcba414f852c7`.

## Content and scoring

All 39 passages, question order and four-option structure are retained. Layout
watermarks, repeated running headers and PDF line wraps are removed. Two minimal
editorial changes avoid penalizing a defensible answer:

- Q2 option D: “Une prolongation automatique de tous les prêts” overlaps the
  announced extension. It becomes “Une prolongation sans date limite de tous les
  prêts”; the passage explicitly gives 10 January. Correct choice remains B.
- Q12 option D: “Les élèves iront dans un autre établissement” incorrectly implies
  all pupils. It becomes “Certains enfants pourront être accueillis à l’école
  Voltaire sous conditions”, matching the childcare exception. Correct choice D.

The supplied PDF has no answer key. Each selected key and French explanation
was checked against its passage. The versioned private bank is
`supabase/exams/tcf-reading-test01.json`; the migration freezes the same content.
No answers are generated or marked by OpenAI. Public FEI format was fetched on
12 November 2026 and confirms 39 four-choice questions, one correct choice and
60 minutes: https://www.france-education-international.fr/test/tcf-canada .

The PDF's per-question point bands are retained: Q1–4=3, Q5–10=9, Q11–19=15,
Q20–29=21, Q30–35=26, Q36–39=33. They sum to **699**. Show the number correct
out of39 and **practice** points out of699, with zero for incorrect/blank answers.
This sample-weighted practice sum is not an equated official TCF scaled score;
no unsupported official CEFR/NCLC conversion is inferred from it.

## Student flow

One entry in TEF/TCF AI Tests, separate from AI Learning. Start/resume a 60-minute
server-timed attempt, navigate all39questions and select/change one answer each.
Selections save immediately; correctness is withheld until submission or expiry.
Submit asks for confirmation and reports unanswered questions. The completed
answer sheet marks every response correct/incorrect/unanswered, highlights the
correct option, distinguishes the learner's wrong selection, explains the answer
from the passage, and ends with the total. Saved review is read-only.

Transport failures preserve a pending choice for explicit retry. A lost reply
is reconciled against saved state. Competing-tab revisions require explicit
“Save my choice instead” or “Use saved answer”; never silently overwrite.
Navigation keeps pending work in account-scoped memory, and beforeunload warns
if a choice is not saved. Signout/account switch clears it and the current UI.
The database clock survives reopening and automatically marks only saved work
at expiry. No daily starts quota. Retakes retain earlier results.

## Persistence and access

Additive migration `20261112204911_tcf_reading_test01.sql` creates a private
RLS-protected paper/attempt schema, owned-history index and one-active-attempt
index per account. It does not modify any existing academy table, price, wallet,
allowance, entitlement, progress, writing/speaking attempt or authentication flow.
The standalone deterministic pilot has no AI action/credit charge; existing paid
four-skill mocks and AI activity charges remain unchanged.

The authenticated RPC derives `auth.uid()` itself, rechecks verified academy
access on every action, checks ownership, validates a frozen paper/version,
serializes starts per account, guards revisions, rejects score/identity/choice
forgery and derives totals from the private server key. Only sanitized questions
are returned while active. Private tables/helper have no public/student/service
privileges; the public wrapper grants execute only to authenticated. The
security-definer wrapper uses an empty search_path, fully qualified objects and
no dynamic SQL/user identifiers. It is the narrow access boundary over the
private schema; browser callers cannot supply an identity or result.

## Validation and rollout

All224 repository Node tests and the build pass (217 baseline). Seven new tests cover source/bank/version/scoring bounds, perfect/blank/
mixed totals, sanitized active output, end-only correction release, timer expiry,
resume/replay, stale revisions, duplicate submit, frozen completed answers,
unauthenticated/unverified/revoked/cross-account denial, input tampering, session
transport, migration rollback and prepared release idempotency/preservation.
Chromium fixtures at390px/1440px use the **actual PostgreSQL RPC in PGlite** with
fixture Auth identities. They cover keyboard/option editing, navigation, save
failure/lost reply/competing tabs, original deadline on reopen, confirmation,
correct/wrong/blank corrections, bottom total, saved review, automatic timer
completion, account switch and signout. They perform no production login or
provider call. These tests do not prove a live Supabase integration has run.

The prepared release reuses `release-tcf-marking.yml` and its existing
SUPABASE_ACCESS_TOKEN helper, via the explicit `release/tcf-reading-test01`
branch only. Feature pushes and PRs run CI without a production release.
`python3 scripts/release/tcf-reading.py --apply` rehearses in a rolled-back
transaction, verifies hashes of all existing progress, auth, entitlements,
wallets, ledger, policy, activities, testing grants and exam/writing/speaking
history, then applies/records this migration. Reruns preserve reading results
and require exact migration/bank contents. No Edge deployment/key retrieval or
inference is required. After backend checks, merge reviewed frontend into
`development`, verify Pages and live GHL assets, then a normal entitled sign-in.
Rollback removes the frontend entry/reverts UI while retaining saved data.

Publication authorized on12November2026 under the owner’s standing instruction
to publish tested changes without further confirmation. Local tests/build and
desktop/mobile fixtures pass. Backend/Pages release outcomes and live-verification
evidence are recorded in PR35 after publication.

Review screenshots (local fixture data):
[desktop question](images/tcf-reading-test01-desktop.png) ·
[mobile marked correction](images/tcf-reading-test01-correction-mobile.png).

## Twenty-paper expansion — 12 November 2026

The owner authorized Tests02–20 with different topics/themes and the same format,
plus publication under the standing instruction. The approved PDF-based Test01
and all existing paper/attempt/result records remain unchanged.

Nineteen original frozen papers live in `supabase/exams/tcf-reading-v2/`, version
`tcf-reading-2026-11-original-v2`:741new questions,780total. Every paper has39
questions, four choices each,3600seconds and the original699practice-point bands.
Each new question has a distinct passage and a passage-based explanation. Notices,
messages, practical articles and more analytical final texts cover housing/work/
travel/environment/culture/food/health/science/education/solidarity/rural life/
digital tools/media/consumption/heritage/generations/landscapes/energy/daily life.
The new answer positions are varied and balanced; no runtime content generation
or AI marking is introduced. Practice sums remain distinct from official equated
TCF scores; no unsupported NCLC conversion is added.

The shared selector shows each paper and its theme. Saved history identifies its
test number. Starting another paper can create a separate unfinished attempt;
returning resumes only the selected paper/version with its own original clock.
Pending unsaved choices require explicit recovery before starting another paper.
All20 use the same answer controls, confirmation, end-only marked answer sheet,
right/wrong/unanswered explanations and bottom totals.

Migration `20261112212313_tcf_reading_twenty_tests.sql` inserts only19new banks,
changes the active-attempt uniqueness from per-account to per-account/paper/version,
and updates the existing authenticated RPC to validate against the private bank.
It adds immutable saved identity and immutable paper triggers. Existing tables,
Test01 content, results, answers, revisions and deadlines are not rewritten.
Authentication/entitlement/ownership, private RLS tables and narrow function
permissions remain. No price, credit, wallet, cap, access or other module changes.

All230 Node tests and build pass (224baseline). Six new tests cover780unique
passages, all formats/seeds, all20 server-selected prompt/answer keys and perfect
scores, sanitized active outputs, concurrent paper resumption/fixed clocks,
identity/score forgery, cross-account and revoked/unverified denial, timer expiry,
Test01 rollback/preservation, immutable identities/banks and exact idempotent
release transactions preserving both old and new results. Existing reading
mobile/desktop acceptance checks also run against the actual PostgreSQL RPC in
PGlite. The additional all20 browser suite verifies both widths, independent
unfinished attempts, selection, fixed clocks, original-paper reopening, marked
right/wrong/blank rows, scores and account changes. Browser Auth/users remain
fixtures; a live entitled-account walkthrough is not part of these checks.

Release reuses `release-tcf-marking.yml` with the explicit
`release/tcf-reading-twenty-tests` branch and `scripts/release/tcf-reading-twenty.py`.
It rehearses the additive migration under rollback and checks hashes of all
existing reading attempts/Test01, auth, entitlements, progress, other exams,
wallets, requests, ledger, grants and settings before committing/recording it.
It verifies all20deployed banks against the exact repository content, without
printing student data or creating a synthetic account. Reruns preserve results.
Then merge into development and verify Pages plus live GHL assets. No new Edge
function or provider credential path is required. Keep the additive schema and
all bank versions on rollback; revert frontend/RPC only with version support for
saved new attempts. Deployment outcomes are recorded in the release PR.

### Reference-length correction — 12 November 2026

The owner identified that Tests02–20 were much shorter than Test01, particularly
at the end, and requested numbered labels without theme names. The selector now
reads `Test 01` through `Test 20`. Questions show `Texte :`, the passage in
paragraphs, the question and four selectable answers; review preserves paragraphs.

New immutable banks in `supabase/exams/tcf-reading-v3` revise all741 passages,
retaining their distinct topics and original question/answer evidence. Each
passage is checked against the same position in Test01, using whitespace-delimited
word counts with a tolerance of10% or5words, whichever is larger. The final four
passages are120–151words, comparable to Test01's129–137words. Added material
provides concrete situations, explanations and contrasting perspectives specific
to the passage. Existing options, keys, explanations, points and timing remain.

Migration `20261112222727_reading_reference_length.sql` adds19revised banks and a
private RLS publication map selecting exactly20current papers. It replaces only
the authenticated reading RPC's catalog/start routing. Test01 and all19v2banks
remain immutable; saved attempts keep their original text, answers, results,
version and deadline. Old versions can be reopened by their owning attempt ID,
but new attempts use the published version. An unfinished v2attempt and a new
v3attempt have distinct identities and retain their own clocks.

Four additional Node tests cover every revised length, unique passages, exact
migration seeds, all20perfect-score runs, key hiding, publication/legacy routing,
rollback, preserved original banks/attempts/results, RLS and exact idempotent
production transactions. The all20browser suite loads the current publication
map and checks exact numbered labels at390px and1440px, plus independent clocks,
answer selection, marked corrections and saved-paper reopening. The existing
recovery/timer/account-isolation suite also uses the new migration.

Publication uses the explicit `release/tcf-reading-reference-length` branch and
`scripts/release/tcf-reading-reference.py`. It rehearses under rollback, checks
existing data/settings/attempt hashes and every historical bank, commits the
exact reviewed migration, then compares all39bank versions and20published papers
with repository JSON. No student account creation or credential extraction is
used. Database rollback should restore the previous RPC/publication mapping
while retaining all bank versions needed by saved attempts. Live release and
verification evidence is recorded in the PR; signed-in production student flows
are tested using local Auth/entitlement fixtures rather than real credentials.
