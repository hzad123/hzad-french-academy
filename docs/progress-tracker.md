# Student Progress Tracker

Combines three non-AI features: a personalized daily learning plan, an evidence-based French mastery dashboard and a personal mistake notebook. Built from `development` at `fad836c` on `feature/student-progress-tracker`. The one-block GHL loader, placement assessment, course access and normal quiz-completion authority are retained.

## Student experience

- **Daily plan:** save a 10-, 20- or 30-minute goal and optional study-level override. Without an override, use the latest completed placement result, then recent saved lesson activity, then A0. Prioritize due mistakes, the next unfinished lesson (or a low-scoring completed lesson), and focused practice for the weakest measured skill. Suggested activities never exceed the chosen time budget. Longer lessons can span sessions; estimated time is not a completion claim. All accessible courses remain selectable.
- **French mastery:** show real published lesson counts and completion across A0–C2. For each of grammar, vocabulary, reading and listening, show latest checked practice-answer evidence when at least three distinct questions exist; otherwise use a placement sample with at least two items. Less evidence is explicitly insufficient. Strength (80%+), developing (70–79%) and review (<70%) are instructional labels, not externally validated proficiency cut scores. Sources and denominators are visible. General/unlabelled questions are reported separately. Speaking/writing ability is never inferred.
- **Mistake notebook:** automatically retain missed normal quiz answers, the last incorrect selection, the server-returned correct answer/explanation, question identity, miss count and timestamps. Replay the question with current lesson options and server grading, or open its exact lesson. Correct revisions retain history and schedule the next review at 1, 3, 7, then 14 days; a later error makes it due immediately. Identical repeated answers within 12 hours do not inflate evidence or spacing. Answers and preferences are stored per account in Supabase, not browser localStorage.

Plans recompute on opening, refreshing or saving preferences, using the server snapshot timestamp and current evidence. They are suggestions, not access rules or an automatically graded study timer. Guided exercises are self-practice; they never claim a completed lesson or assessed speaking/writing score. Refresh or reopen the tracker after studying to reflect the saved quiz receipt.

## Database and authorization

`supabase/migrations/20261104_student_progress_tracker.sql` adds private `academy_tracker.preferences` and `academy_tracker.evidence` tables. RLS is enabled with no student table privileges or policies. Do not include this schema in Supabase Data API exposed schemas. Narrow public invoker RPCs call private definer implementations with empty search paths, verified email, existing purchase entitlement and `auth.uid()` ownership checks on every operation. No client-supplied user ID, score, mastery level, completion or due date is accepted.

To collect evidence from the existing normal quiz path without duplicating grading logic, the migration **moves the currently installed** `academy_check_answer(text,text,integer)` implementation into the private schema as `grade_answer`, revokes student access to it and installs an identical-signature public wrapper. The wrapper calls the preserved grader, records only its trusted feedback, then returns the original response. An atomic upsert serializes answer evidence. This is a change to a production-sensitive RPC and requires staging/security review before applying. The normal `academy_submit_quiz` logic, lesson IDs, purchase rows, placement attempts and saved completion records are unchanged. Direct legacy calls to `academy_submit_quiz` still save completion but do not reconstruct individual mistake evidence; the normal browser flow calls `academy_check_answer` first.

Snapshots include sanitized published lesson metadata, the caller's existing progress, latest completed placement, aggregate skill evidence and only previously missed questions. They never disclose keys for questions the student has not missed. Notebook entries return the same answer/explanation already disclosed by normal feedback. No full quiz keys are selected into the response. Removed/unpublished questions are excluded from the notebook. Notebook retrieval is paginated in groups of 200 with 20 visible items per page; review filters apply to the loaded group and the UI labels those counts. Original mistake text remains a historical answer; retry options reflect the current question.

Skill labels use explicit assessment-domain/question-skill metadata or declared listening checks. Untagged `choice` questions remain general practice. **No past incorrect answers are fabricated from historical best scores.** Evidence starts when tracking is enabled, and future content metadata work may be needed to increase skill coverage. The live database/schema was not inspected or changed during implementation.

## Validation

```sh
# Node 22, existing checkout; no separate worktree required.
npm install --no-package-lock
npm test
npm run build
node scripts/validate-curriculum.mjs curriculum/a0-batch-01.json
# Optional local browser acceptance: Python Playwright + Chromium required.
python3 scripts/test-tracker-browser.py
python3 scripts/test-placement-browser.py
```

Database tests execute the actual migration in local PGlite PostgreSQL with synthetic users, verified purchases, curriculum and placement attempts. Coverage includes anonymous/unverified/expired/revoked access, per-user isolation, blocked table writes and raw grader calls, answer validation, original grading compatibility, wrong-answer capture, skill counts, duplicate answers, spaced revisions, preference isolation, placement selection, notebook offsets and data-preserving rollback. Plan tests cover time budgets, empty/completed catalogs, weak evidence, level selection and due dates.

Browser acceptance uses actual tracker, placement, course navigation and protected lesson modules with a local mocked transport; all external requests are blocked. It exercises 390px/1280px layouts, keyboard radios, preferences, all three views, exact lesson deep links, original instant-feedback/completion behavior, placement navigation, error handling and stale-response clearing. Screenshots are generated in ignored `dist/tracker-qa/`. This is not a live Supabase, screen-reader or independent-session concurrency test.

## Review and release — nothing applied automatically

1. Confirm the existing academy/secure-quiz/instant-feedback and placement migrations are installed in **staging**. Inspect the installed grader and schema, preserve its definition/grants, and review the new SQL and private-schema exposure settings.
2. Back up staging and apply the new migration once, under normal migration recording. It is transactional and adds no historical progress changes. Supabase schema reload is notified after the new public API is registered.
3. With two real staging users, verify account isolation, active/expired/unverified access, preference persistence across devices, normal quiz feedback/save, notebook creation/revision/spacing, current content options and placement result selection. Test simultaneous identical and different answers on separate PostgreSQL sessions and check timestamp/timezone display. Confirm a microphone/audio interaction is not required for the tracker itself.
4. Verify CI, then obtain human review of the RPC change. Separately authorize any production migration, merge or Pages deployment. A merge to `development` can deploy automatically. No payment integration, new entitlement bypass, AI API or credit pricing is part of this feature.

For an authorized rollback, restore previous frontend assets separately, then apply `supabase/rollbacks/20261104_disable_progress_tracker.sql`. It revokes new student APIs and restores the original grader by moving its original function object back. Tracker preferences and mistake history remain intact; no course progress is reset. The rollback is tested locally and is not automatically executed against any remote database.

Remaining release checks: real staging Supabase/PostgREST, independent-session concurrency, screen-reader review, hosted CI and human approval. Production Supabase data and deployment are untouched.
