# Agent instructions — HZad French Academy

**Before making any changes, read [MASTER_PLAN.md](./MASTER_PLAN.md) in full.** It records the project's owner-approved requirements, current release architecture, strict security/cost constraints and roadmap.

## What to do first
1. Confirm you are working from the **`development`** branch; `main` is not the live application source.
2. Inspect current code, tests, Supabase migration files and existing GitHub PRs rather than assuming old documentation is current.
3. **Current highest-priority feature:** implement the **non-AI A0–C2 French placement test**, automatically recommend a student's starting level, save results and allow immediate navigation to that level. Use the detailed specification in `MASTER_PLAN.md`.
4. Make a separate feature branch. Run `npm test` and `npm run build`. Open a pull request against `development`; do not merge or deploy without user review.

## Guardrails
- Preserve the one-block GHL loader and hosted `academy.js`/`academy.css`, existing Supabase login/email verification, WordPress purchase entitlements, secure lesson RPCs, instant-feedback quizzes, student progress and responsive A0–C2 course navigation.
- Treat all seven course cards as **Available now**; do not relabel them “Early-access drafts.” That wording does **not** establish certified CEFR proficiency or finished editorial QA.
- Placement scoring, normal quizzes, core curriculum and progress must be deterministic/non-AI. Do not expose scoring keys, privileges, credit logic or secrets to frontend code.
- Never put Supabase `service_role`/secret keys, AI keys or webhook secrets in public code. Use identity-based data protection (RLS/RPC/ownership) and server-side purchase validation.
- Do not modify production Supabase data, run destructive migrations, merge to `development` or change pricing/credit costs without explicit authorization.
- Avoid resetting students' progress or changing existing lesson IDs. Keep any SQL changes versioned and reversible.
- If repository docs and the actual database disagree, inspect and document the discrepancy before editing.

## Reporting
For each task, state exactly: what was implemented, what was tested, what was not verified, which database changes remain unapplied, PR link, and whether production was touched. Never call a draft, code-only change or merely published lesson an officially CEFR-certified course.

## Owner interface preferences
- Keep student-facing copy concise and focused on actions. Do not add repetitive
  disclaimer paragraphs about cosmetic rewards, legal identity, CEFR status,
  inferred skills, or implementation constraints. Keep operational errors and
  factual requirements clear. Use accurate positive labels such as “HZad
  Certificate of Course Completion”; do not invent accreditation claims.
- Keep Progress Tracker as the top-right dashboard button, not a central promo.
- Provide top-left Back navigation across app views, preserve saved progress,
  and clear navigation history when the account/session changes.
- Use distinctive achievement artwork and modern certificate presentation.
