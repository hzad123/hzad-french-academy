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

Current status: implemented and locally validated for review. The migration
remains **unapplied**; no production data, backend or Pages was changed for this
reading pilot. Publishing is gated on owner review under AGENTS.md.

Review screenshots (local fixture data):
[desktop question](images/tcf-reading-test01-desktop.png) ·
[mobile marked correction](images/tcf-reading-test01-correction-mobile.png).
