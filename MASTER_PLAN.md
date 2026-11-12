# HZad French Academy — Master Plan

> **Project source of truth for Codex, contributors, and future implementation work**  
> Owner/product: HZad Education / **HZad French Academy**  
> Repository: `hzad123/hzad-french-academy`  
> Active development and GitHub Pages deployment branch: **`development`**, not `main`  
> Last consolidated: **2026-11-04**  
> This document records the agreed product direction, constraints, priorities, and last-known implementation status. **Inspect current code, database, CI, and live behavior before treating a status statement as current.**

## 1. Mission and non-negotiable constraints

Build a high-quality, browser-based French-learning academy from **A0 through C2**, followed by original, full-length **TEF Canada** and **TCF Canada** preparation exams. Students should have a continuous experience covering lessons, listening, speaking, grammar, vocabulary, writing, reading, quizzes, placement, progress/mistake tracking, motivation, AI-assisted practice, and exam readiness.

**Product / UX principles**
- Brand: **HZad French Academy**; retain the HZad Education branding/logo when suitable assets are available. Use a restrained **blue, gold, and orange** visual identity.
- Works inside an existing **GoHighLevel (GHL) website**, on desktop and mobile. **Not a downloadable/mobile-native app.**
- GHL has **one Custom HTML/JavaScript editor**. The current accepted and deployed implementation is **one paste-once GHL loader** (`ghl/loader.html`) that loads externally hosted `academy.js` and `academy.css` from GitHub Pages. Preserve this arrangement unless explicitly approved; do not require students or the owner to paste multiple code blocks. The user's earlier single-file preference is satisfied operationally by one embed block, while source stays modular in GitHub.
- A0–C2 course navigation is centered, responsive, keyboard-friendly, and all seven cards say **“Available now.”** Students may choose any accessible level. Each opens the shared protected lesson viewer; there is a **“← All levels”** navigation control. This is **availability language**, not a claim of official CEFR accreditation or editorial completion.
- Lesson pedagogy: explanations in readable bullet points with helpful color hierarchy; translations for French expressions and mini-dialogues; avoid redundant “Goals” lines; avoid generic placeholder explanations.
- Quiz UX: **no “Submit quiz” button** for normal practice questions. Selecting an option immediately yields **green ✓ for correct** or **red ✕ for incorrect**, with a helpful explanation in **both cases** and the correct answer identified when needed. Secure scoring remains authoritative server-side.
- Prefer original, carefully authored reusable bulk curriculum and test content over hand-writing SQL one lesson at a time.

**Cost / AI policy**
- **No AI generation for routine lessons, ordinary quizzes, deterministic grading, or progress computation.** The core course remains usable when AI is off.
- Paid AI should be reserved for explicit tutor interactions, AI pronunciation feedback, conversational speaking, writing assessment/feedback, and appropriate mock-exam assessment.
- Every credit-consuming action must display its **exact HZad credit charge before starting**.
- Never expose AI-provider secrets, Supabase secret/service-role keys, privileged API credentials, or privileged logic in GitHub Pages/GHL/browser code.

## 2. Existing application and operational status (as last verified 2026-11-04)

**Repository and architecture**
- Public repository: https://github.com/hzad123/hzad-french-academy
- Primary source branch: `development`; GitHub Actions build/tests and GitHub Pages deploy from this branch.
- Current GHL loader fetches:
  - `https://hzad123.github.io/hzad-french-academy/academy.js`
  - `https://hzad123.github.io/hzad-french-academy/academy.css`
- Source: `src/entry.js`, `src/main.js`, `src/ui/template.js`, `src/dashboard/courses.js`, `src/learning/*`, `src/styles/academy.css`; build scripts and CI under `scripts/` and `.github/workflows/`.
- Supabase project reference: `ogntvgvzmjrnppcullsj`. This is an identifier, not a secret. **Do not paste credentials into this document.** Frontend uses a publishable key; privileged credentials are never client-side.
- Authentication uses confirmed email and authenticated sessions. The protected course viewer, quiz delivery/grading and progress workflows use Supabase RPCs; inspect `src/auth/*`, `src/learning/supabase-store.js` and existing migrations before modifications.
- The **secure WordPress purchase-verification webhook is still a planned integration** (unless confirmed implemented later). Existing test/admin access and entitlement checks are not a substitute for automatic verified purchase activation. Never trust students' claims of purchase. Verified purchases, refunds, expirations and revocations must be server-authoritative.
- Earlier admin-only testing granted a **180-day** temporary entitlement in Supabase. Never turn this into a general/public bypass.

**Curriculum content**
- Last observed: **392 published lesson units**: A0 = 30; A1 = 49; A2 = 54; B1 = 69; B2 = 69; C1 = 61; C2 = 60. Counts are a snapshot, not a pedagogical target; quality/CEFR coverage matter more than arbitrary counts.
- The full A1–C2 dataset is available to entitled students. **Do not conflate published/“Available now” with fully reviewed, CEFR-certified, or complete instructional quality.**
- Six longer, original reading passages (one each A1–C2) were published into existing units `a1-001` through `c2-001`; the previous reading/section versions were backed up inside lesson JSON. Approximately **356 A1–C2 readings still need expansion** and editorial review.
- A separate Supabase publication replaced **1,810 generic expression explanations** with **441 distinct, sentence-specific explanations**, and revised **362 independent-practice prompts + 356 reading prompts**. Original sections are backed up under lesson JSON keys `usage_notes_backup_20261104` and `practice_usage_backup_20261104`. Respect those backups; do not naively overwrite nested `content.sections`.
- Some French source sentences still have accent/spelling or grammar mistakes. Correct them using an editorial audit that also checks related translations, audio and quiz answer/explanation consistency. Do not use blind global replacements.
- Existing quizzes use protected RPC logic. Do not reset student progress or regenerate lesson IDs to revise content.

**Recent releases / branch context**
- Centered, all-level navigation and “Available now” in the course viewer were merged into `development` via PRs **#5** and **#6**. GitHub Pages deployment was verified successful on 2026-11-04.
- Prior reading-workshop feature PR **#3** and explanation-source PR **#4** may remain **unmerged** even though related database content changes were already published. Their code/docs should be reviewed before reuse; do not assume their frontend source is live.
- Some older `docs/` notes refer to earlier A0-only preview stages and may be stale. Compare against current `development`, Supabase schema and the released browser interface.

## 3. Priority NOW — French placement test (first Codex assignment)

**Objective:** An authenticated, entitled student can take a reliable, progressively more challenging **French placement assessment**, receive an automatic **recommended starting level A0–C2**, and immediately open that level while retaining freedom to select any other course.

**Functional requirements**
1. Add an attractive, prominent **“Take French Placement Test”** entry in the existing centered course dashboard, consistent with HZad blue/gold/orange. Keep all seven “Available now” course cards.
2. Use an **original, pre-authored, versioned** question bank across progressive levels A0/A1/A2/B1/B2/C1/C2 and skills: **grammar, vocabulary, reading and listening**. Listening can use appropriately reviewed original audio/text-to-speech; availability of browser synthesis must be considered. Design accessible fallbacks.
3. **Do not use AI APIs** to generate questions, grade placement, or recommend levels. Scoring must be **deterministic, server-validated and testable**. Avoid a simplistic raw-percent-to-level mapping; account for increasing difficulty, prerequisite mastery, minimum items/evidence per level, weak/strong skill areas, ambiguous outcomes, and incomplete attempts.
4. Do not infer speaking or writing proficiency from multiple-choice performance. Explain that the result is a **recommended learning starting point**, not an official CEFR certificate or a substitute for a complete four-skill evaluation.
5. Support a thoughtful flow: brief instructions; question progression; accessible radio/keyboard/mobile controls; progress feedback; state preservation as needed; results page with recommended level, skill breakdown, actionable rationale and **“Start [level] lessons”** action.
6. Persist **assessment version, question/answer provenance as appropriate, attempt timestamp, skill scores, recommendation and prior attempts** in Supabase; do not erase previous attempts upon retake. Consider sensible retake limits/anti-abuse.
7. The **server** must control which questions are eligible, grade answers, derive results and enforce ownership. Do not expose answer keys or permit students to post a fabricated score/level. Implement suitable RLS/RPCs, quotas, transaction safety, input validation and replay/duplicate-submission safeguards.
8. Placement is **not** a new permission level. Completing a test never grants paid access, changes WordPress purchase verification or bypasses entitlement checks.
9. If database migration is needed, create a reviewed, versioned SQL migration and a safe rollout/rollback plan. **Do not apply destructive changes or deploy production until the changes are tested and reviewed.**
10. Run existing tests plus new tests for scoring boundaries, difficulty progression, score forgery, unauthorized access, account isolation, repeat attempts, unverified/expired purchases, partial attempts, keyboard/mobile usability and regression in normal lesson/quiz/progress flows.

**Codex implementation protocol for this feature**
- Work from `development` into a separate `feature/placement-test-...` branch.
- First inspect current code, Supabase SQL/migrations and any existing placement logic to avoid duplicate systems.
- Implement actual functional code, original question content and tests; **do not stop at a plan or placeholder screen**.
- Run `npm test` and `npm run build`, document SQL migration steps, then open a PR against `development`.
- Do not merge, publish on GitHub Pages, or alter live student data without user review/approval.
- The placement-test recommendation is advisory: never automatically lock students out of other A0–C2 levels.
- When ready, include acceptance checklist and screenshots/preview evidence where available.

## 4. Product roadmap after placement test

### Phase A — Core curriculum quality and verified commerce
- Full independent editorial QA: A0–C2 grammar, vocabulary, irregularities, translations, correct usage, listening pronunciation, reading coverage, speaking/writing tasks and quiz explanations.
- Expand remaining short A1–C2 reading passages; use genuinely suitable CEFR progression and authentic task lengths instead of inflated word-count-only targets. Address lesson-level consistency and prevent repeated filler.
- Verify learning materials across alphabet, numbers, pronunciation, essential words/phrases, conjugations, dialogues and advanced linguistic/academic themes.
- Complete secure **WordPress purchase-confirmation webhook**, verified-purchase email matching, idempotency, renewal, refund/revocation and expiry handling; preserve administrative test-access controls.
- Ensure all paid lessons are delivered through authenticated/entitled server checks, not just hidden frontend markup.
- No student data loss; use incremental, reversible content changes.

### Phase B — Personalized learning intelligence and motivation
- **Placement testing** (Phase NOW), skill-specific mastery dashboards, progress trends, weaknesses and strengths.
- **Personalized daily study plans** based on level, completed content, skill performance and time available.
- **Mistake notebook** collecting missed concepts/questions, explanations and targeted spaced review; avoid leaking full protected answer banks.
- Gamification: streaks, badges, meaningful milestones, motivation without encouraging unproductive grinding.
- End-of-level assessments and **HZad completion certificates**, clearly distinguished from **official CEFR/TEF/TCF certification**. Certificates require defensible, verified assessment criteria.
- These are mostly deterministic / non-AI features.

### Phase C — HZad AI credit wallet (build before paid AI actions)
- **Six months of included student AI credits**, tied to verified purchase/access terms; user intent is to keep the **maximum included AI provider cost at CAD $10 per student** during the included period, with billing/provider cost monitored.
- Display **per-activity credit charges before the student starts**, including messages, voice/pronunciation, conversational sessions, writing feedback and full mock tests.
- Charge and **reserve sufficient credits server-side**, and prevent negative balances and race conditions. Use append-only/auditable transactions, idempotency, usage limits and cost reporting.
- After included credits are exhausted, prompt for **paid credit top-ups** rather than incurring unbounded expenses.
- Price credit packs and activity charges using measured API/audio/scoring/delivery costs, with target **approximately 50% gross margin before payment/other fees**. Proposed prices are **not final** until benchmarked.
- Admin dashboards: student-level usage, aggregate model costs, margin, throttling, suspicious use, hard budget limits and operational alerts. Never bill based on untrusted client-reported token use.

### Phase D — Optional AI tutor and productive-skill coaching
- Floating **bottom-right text/voice French tutor** that can answer questions and inspect a minimal, authorized summary of a student's mastery/mistakes.
- Pronunciation evaluation, guided **French conversation speaking practice**, feedback on written answers and realistic correction/explanation.
- The AI tutor should be accessible by explicit action, with clear per-action credit cost, privacy controls, spending caps and server-side AI keys.
- Browser speech synthesis for routine listening can remain non-AI. Avoid external links for core listening/speaking where native web features are feasible.
- The non-AI course and ordinary quizzes must still work if tutor balance reaches zero.

### Phase E — Original TEF Canada / TCF Canada mock examination centre
- Original **full-length** mock exams aligned with the **current official exam formats**, sections, difficulty and timing. Reverify official section lengths/question counts at implementation time; don't rely on preliminary/example counts without checking.
- Include reading, listening, writing and speaking; original reading passages, realistic audio, task instructions, timers, test integrity, feedback and progress analytics.
- Scores are clearly labeled **unofficial estimates**, not official TEF/TCF results.
- **All TEF Canada and TCF Canada mock tests consume HZad credits for full test access**, not just speaking/writing AI grading.
- Before an attempt begins, **show the full credit charge**, check balance on the server, reserve sufficient funds atomically and provide a **top-up prompt if insufficient**.
- Only set final mock-test credit prices after cost benchmarking: delivery, audio, AI evaluation, infrastructure and desired margin.
- Results and completed-test review should be available without charging the student again merely for revisiting an already paid attempt, unless a new paid analysis is explicitly requested.

## 5. Architecture, privacy and security guardrails

1. **Never break working authentication or existing WordPress entitlement/access checks.** Enrollment/purchase verification must be from trusted backend/webhook data, not self-reported student input or editable `user_metadata`.
2. Use Supabase Auth, verified email, secure session handling, **RLS on exposed tables**, per-user ownership checks and carefully scoped RPC privileges. Existing protected lesson data and answer keys stay behind entitlement checks.
3. Never store `service_role`, OpenAI/provider keys, private webhooks or secrets in frontend bundles, public GitHub commits, GHL blocks, console logs or this plan. A Supabase **publishable** key may be used in the frontend with proper RLS; that does not grant entitlement.
4. Keep answer keys and official-style assessments server-side where necessary. Client-side marking effects are UX; authoritative grading stays protected.
5. Preserve lesson IDs, quiz IDs, attempt history, completion state and student data during migrations and content updates. Use additive changes, transactions, data backups and rollback checks.
6. Protect against account enumeration, SQL injection, quota bypass, replay, client score/credit tampering, unauthorized cross-user reads, and concurrent double-charging.
7. Keep learning access available for the purchased period; separately enforce six-month included AI credit eligibility. Do not conflate the two entitlements.
8. Check current Supabase documentation/security guidance for new schemas/functions. `SECURITY DEFINER` RPCs require special scrutiny, limited `EXECUTE` grants and internal ownership/entitlement validation.
9. Student-generated AI data and logs should be minimized and protected, with retention/privacy policies chosen intentionally; do not send raw student records unnecessarily to AI providers.
10. Existing GHL hosted loader and production auth/quiz paths are a strict regression surface. Changes must remain mobile responsive and keyboard accessible.

## 6. Definition of done / release policy

- **For code:** reviewed feature branch + PR, `npm test`, `npm run build`, migration/security validation, successful CI and protected authorized/unentitled browser QA. Check a real mobile viewport and keyboard navigation.
- **For curriculum:** factual French/English correctness, pedagogical coherence at target level, no templated filler, sufficient example variety, answer/explanation alignment, and explicit draft-vs-validated status internally.
- **For placement:** deterministic versioned scoring, no leaked answer keys, enough evidence, explainable recommendations, retake persistence and no unauthorized results access.
- **For AI wallet:** atomic credit accounting, visible activity costs, top-up flow, tested price/cost assumptions, CAD $10 included provider-cost ceiling enforced operationally.
- **For mock exams:** authentic original content, current spec verification, credit reservation, consistent grading labels and result-review behavior.
- **For launch:** protect data, verify CI **and** deployed Pages, then inspect the actual GHL page. Changes to `development` can trigger production GitHub Pages deployment, so **review before merging**.

## 7. How Codex should use this file

1. Read **`AGENTS.md`** and **`MASTER_PLAN.md`** at repository root, then inspect relevant source, tests, migrations and live deployment configuration.
2. Treat this file as the **agreed product intent**, not as proof a feature is already deployed. Status must be verified from current GitHub/Supabase before implementation.
3. Prioritize the **French placement test** now. Do not jump to AI wallets, exams or tutors without a subsequent user request.
4. Prefer non-AI, versioned, original content and deterministic logic; keep costs and authorization server-controlled.
5. Keep code modular in GitHub while preserving the **single GHL paste-once loader** and existing deployment.
6. Report exactly what changed, how it was tested, what remains, which migration is needed, and whether anything is actually live.
7. Ask for human review of high-impact security, payment, account migration, pricing or production deployment steps; do not claim unreviewed code or curriculum is finished.

---

**Scope reminder:** The next assignment is the **A0–C2 placement test** with automatic recommended starting level. Everything else remains in the master roadmap until separately scheduled.


## Latest owner assignment — AI Learning (2026-11-04)

The owner has now requested an AI pronunciation trainer, interactive French conversation simulator, and AI writing trainer under a separate top-right **AI Learning** button, and selected **OpenAI**. Implementation and rollout instructions are in `docs/ai-learning.md`. This assignment includes the server-side credit/budget foundation needed for optional AI actions. It does not authorize payment checkout or invent production credit prices. The owner subsequently supplied `OPENAI_API_KEYfrench`, authorized publishing, and changed the included AI budget to CAD $10 per student, followed by paid top-ups. Deployment status is recorded in `docs/ai-learning-release.md`; spending remains paused until provider checks and launch settings are cleared. Existing course progress and access must be preserved. Student-facing copy follows the concise-copy preferences in `AGENTS.md`.


## Latest owner assignment — TCF writing first (2026-11-09)

Build one module at a time under **TEF/TCF AI Tests**, outside AI Learning. The
owner supplied an academy TCF writing sample and requested 20 papers with varied
topics, three individual response editors per paper, saved responses and AI
feedback on mistakes only, plus the corresponding estimated TCF/NCLC writing
result using the applicable examiner criteria and scoring guide. This authorizes
a standalone writing module in addition to earlier full timed mocks. For later
TCF modules, retain this marking requirement while verifying each skill's own
scale/conversion; do not infer other skills or invent hidden examiner weights.
Implementation, source evidence, limitations, validation and the additive release
plan are in `docs/tcf-writing.md`. No other new module is requested yet.


### TCF Task 2 correction — 2026-11-09

Across all 20 papers, retain the supplied **Sujet → Consigne → 120–150 mots**
structure. Task 2 consistently asks for a message recounting a past experience,
with place/activities/impressions and an explanation of why it was important.
Only topics and content vary. Do not substitute recommendations, criticism,
advice or a different communicative genre. Keep the sample’s first Task 2
wording verbatim; preserve saved responses against their original paper version.


### TCF writing AI activation — 2026-11-09 (Winnipeg)

The owner explicitly instructed live AI marking using the existing OpenAI key.
TCF writing marking is enabled at **1 AI credit for all three tasks** using the
existing gpt-4o-mini model, 2,000 output tokens and CAD $0.02 reserved cost. Saved
feedback remains free; CAD $10 per student and no shared cap are unchanged.
The earlier pause is superseded by this activation. See the analytical cost
bound, tests, deployed settings and native-verification limitations in
`docs/tcf-writing.md`. Do not reset work, retrieve server keys into clients,
auto-retry paid inference or fabricate official examiner calibration.

### Owner AI testing allowance and saved TCF retries — 2026-11-11

The owner authorized a **CAD $100 total testing cap for their existing account**,
including previously recorded usage. This exception does not increase the normal
CAD $10 student allowance, create a shared spending cap, reset expiration, or
record a fabricated payment. Identify the existing account privately and apply
an audited, idempotent administrative grant; never commit its email or user ID.
Permit explicit, visibly priced retries of failed TCF feedback against the same
saved responses and original paper. Never automatically repeat paid inference.
See `docs/tcf-writing.md` for implementation and deployment blockers. This
authorization does not authorize creating synthetic Auth identities.

### TCF criterion feedback — 2026-11-11

The owner confirmed native TCF marking works and requested feedback organised
around exam marking criteria. Display the total estimated TCF writing mark /20
and its NCLC equivalent prominently, with separate visible linguistic,
pragmatic and sociolinguistic sections. Each section must connect actual task
evidence to what limits the band and a concrete change to make. Keep the total
holistic; do not invent official criterion weights or numerical deductions.
Existing completed results stay free to read. Offer an explicit one-credit
update using their frozen responses so older generic feedback can be upgraded
without retyping or resetting the test. See `docs/tcf-writing.md`.

### TCF Speaking Test01 pilot — 2026-11-12

The owner now requests standalone TCF speaking tests, starting with **one**
AI-interactive test; expand to20only after successful pilot verification. Follow
the supplied blog's three-task timing/roles and public linguistic, pragmatic,
sociolinguistic criteria, then report holistic estimated TCF speaking /20 and
its speaking NCLC equivalent. Hear actual student audio for pronunciation/
fluency, use concrete evidence and keep feedback below all tasks. Preserve
accounting, writing/results/progress and server-side secrets. Pilot details,
validation and additive release/activation requirements: `docs/tcf-speaking.md`.

### AI usage limit correction — 12 November 2026

Owner explicitly removed daily AI request/test-start counts for all students.
Per-action credits, total CAD10 student budgets and the existing CAD100 owner
testing cap remain authoritative. Preserve balances/spend/history, no shared
cap, no payment fabrication or allowance refill. This supersedes earlier daily
AI limits. Non-AI placement/certificate assessment rules are outside this change.
