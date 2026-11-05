# TEF Canada / TCF Canada mock exams — work in progress

The owner requested one full mock for each exam, with strong AI feedback tied to assessment criteria. This branch is **not a complete mock examination product** and must not be published as two full exams yet.

## Completed independent work

- Server-only, immutable state transitions for four skills, paid-access provenance, section deadlines, timed speaking preparation/responses, resumed attempts, reading revision, answer eligibility and account isolation.
- Objective answer keys, explanations and listening transcripts are withheld from active delivery and available in completed review. Reading/listening scores stay deterministic. No invented raw-percent-to-official-scaled-score conversion is introduced.
- Task-owned speaking recording references, per-turn duration bounds, idempotent recording IDs and cumulative limits. The future storage adapter must verify uploaded file ownership and actual durations; the domain engine does not trust browser assertions.
- Detailed feedback contracts covering task fulfilment, coherence, vocabulary, grammar, register, interaction, fluency and pronunciation. Every positive criterion rating needs an excerpt from the learner's response; corrections cannot invent original text. Feedback requires three actionable priorities and targeted practice. Speaking assessment refuses transcript-only evidence.
- Original draft productive tasks: two TEF writing/two TEF speaking tasks and three TCF writing/three TCF speaking tasks, with scenario facts and role constraints for an AI interlocutor. These are **authored drafts**, not official provider questions, and their format/timing/word ranges remain unverified.

Files are in `supabase/functions/academy-exams/` and `supabase/exams/`. They are not imported by the released browser bundle or deployed as a new API. No current student balances, progress, exam attempts, production schema or model settings were changed for this task.

## Source-access blocker

Current exam formats and public assessment criteria must be checked against:

- CCI Paris Île-de-France / Le français des affaires: https://www.lefrancaisdesaffaires.fr/tests-diplomes/test-evaluation-francais-tef/tef-canada/
- France Éducation international: https://www.france-education-international.fr/test/tcf-canada

Both requests return a proxy tunnel **403 Forbidden**. The current enforced network policy does not include those sites. A network-only environment draft has been saved adding both provider domains (www and bare hostnames), while preserving the existing allowed hosts. Saving the draft does not apply it: it requires review/save/publication in environment settings.

`source-verification.json` records this accurately. The bank validator prevents an unverified or incomplete bank from starting. This follows `MASTER_PLAN.md` Phase E: reverify current official exam formats rather than relying on preliminary question counts/timings. It also prevents falsely presenting a short sample as a full exam.

## Remaining work after official sources become accessible

1. Record current section structures, item/task counts, durations, navigation/audio rules, writing constraints and published assessment dimensions with dated source provenance. Align the draft productive tasks and feedback dimensions to those sources.
2. Author the complete original reading and listening banks, including representative task types/difficulty, authoritative keys/explanations and private French audio assets. Review language and audio quality.
3. Add persistent private exam storage/RPCs, server-owned signed audio upload/delivery, AI interlocutor turns, per-attempt inference budgets and exactly-once credit charging for full exam access. Preserve the live **CAD $10 per-student allowance and no shared limit**. Model fees and full-exam credit prices need benchmarking before activation.
4. Build the actual student exam centre inside AI Learning: full section flows, timers, audio controls, autosaved writing, oral interactions, resume, detailed completed review and retained feedback without another access charge.
5. Run full database, browser, ownership, timeout, credit/replay and grading tests; open the finished PR for review. No deployment/production migration is authorized by merely marking this foundation complete.

## Validation

Ten focused tests cover the independent engine and feedback contracts. The standard existing suite and build run separately. Tests use a deliberately tiny synthetic specification; that fixture is not a TEF/TCF bank and does not establish current official format alignment. No live OpenAI inference or native examiner interaction was tested for this new module.
