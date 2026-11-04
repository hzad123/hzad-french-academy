# Gamification and A0–C2 completion certificates

Adds **Achievements** and **Certificates** inside the existing Progress Tracker. The top-right tracker button, seven available course cards, GHL loader, placement, instant quiz feedback and personal notebook are retained. No payment integration, AI API, credit charge or new course-access bypass is introduced.

## Gamification rules

- A server-owned, append-only XP ledger awards **50 XP once per completed lesson**, **10 XP once per corrected notebook question**, and **200 XP once per passed level/assessment-bank version**. Unique `(user_id,event_key)` keys prevent retry or retake farming. Rank starts at 1 and advances every 250 XP; it is a learning rank, not a French proficiency level.
- Daily streaks require meaningful saved activity: a completed lesson quiz (retakes count as practice), a correct due/previously missed notebook revision, or a completed final assessment. Opening a page or claiming attendance never creates a study day. One calendar day is recorded per learner in their saved IANA time zone.
- A streak remains current through yesterday, becomes zero after a missed day, and retains its longest historical run. Future dates after a time-zone change do not inflate the current streak. Time-zone changes are limited to once in 30 days after study activity; recorded calendar days are not rebased.
- Previously completed published lessons receive their one-time XP when the learner opens the app. Old streak days are **not invented**. Progress updated after the feature’s enable time can recover a missed reward/day if optional reward recording failed. Existing progress rows are not rewritten by backfill.
- Ten server-validated achievements cover first/5/25 lessons, 3/7/30-day longest streaks, first/10 corrected questions, first certificate and all seven distinct certified course levels. Earned badge history is retained; badges are cosmetic and do not replace credential verification.
- Rewards are cosmetic study titles: French learner (0 XP), Dedicated learner (250), French explorer (1,000), Learning champion (2,500). A private function validates an unlock before saving a selected title. XP and badges cannot be exchanged for money, AI credits, exam credits or paid access.

Additive triggers on authoritative lesson progress and notebook evidence record rewards. They do not modify grading or completion. A reward-recording failure logs only its SQLSTATE and does not abort a normal lesson save; snapshot backfill can recover lesson XP. Profile initialization runs after a verified access check and uses the browser’s time zone once; later requests cannot silently change the saved zone.

## Certificate requirements

Each of A0, A1, A2, B1, B2, C1 and C2 has an original, versioned **12-item final assessment**, with three items each for grammar, vocabulary, reading and listening. The 84-item source bank is `supabase/assessments/finals-v1.json`; its seed is maintained by `scripts/generate-final-seed.mjs`. It is never imported into the browser. Existing placement items are not reused as the final test.

Eligibility and grading are entirely server-validated:

1. Confirmed email and the existing active, verified academy entitlement are required.
2. Every currently published lesson in that level must be completed with a best quiz score of at least **70%**. The server freezes the required lesson IDs and certificate holder name at assessment start and rechecks those completion records before finishing.
3. Answer all 12 server-selected questions. There is no early stop. Passing requires **80% overall** (at least 10/12) and **two-thirds correct in each assessed skill**. A strong total cannot mask a weak skill. The thresholds are instructional course-completion criteria, not validated CEFR proficiency cut scores.
4. One active attempt per learner/level; resume within seven days. At most three new attempts per rolling 24 hours across levels. Attempts and their answer provenance are retained. An attempt row lock serializes submissions; identical retries are idempotent, changed prior answers and ineligible questions are rejected.
5. A pass inserts one immutable certificate per learner/level/bank version, referencing its assessment and curriculum snapshot. Retakes cannot mint duplicate certificates or duplicate XP. Revoked certificates are never silently reinstated. A new course publication after an attempt starts does not rewrite the frozen completion snapshot or older certificates.

Unlike normal practice quizzes and notebook revisions, final assessments do not expose correctness while answering. Student RPCs deliver only the next eligible item, never its answer key. Scores, eligibility, certificate numbers, issue dates and XP are never accepted from client claims.

### Listening and accessible scope

Audio mode uses a French device speech-synthesis voice. No external paid speech or AI service is called. Where audio is unavailable or inaccessible, learners can use text-supported mode or switch a listening item to transcript support. Once any transcript support is used, the attempt is permanently recorded as text-supported: the three listening items count as reading, so the assessed domains are grammar (3), vocabulary (3), reading (6). Passing still requires 80% overall and two-thirds within every measured domain.

Certificates explicitly print the actual scope. They do not imply assessed listening in text-supported mode, or speaking/writing in either mode. Device voice quality and self-reported audio delivery cannot provide invigilated examination integrity. Independent French editorial/audio review and learner calibration remain release checks. Source-bank keys are visible to repository maintainers, so this is not a high-stakes or source-inspection-resistant exam.

### Issuance, printing and verification

The printable award reads **HZad French Academy — Certificate of Course Completion** with the course level, learner-supplied name, required lesson count, final score, assessed scope, issue date, opaque certificate UUID and bank version. It prints to one landscape A4 page or can be saved as PDF through the browser. Unicode names are rendered as text, not HTML. No official authority, director signature or accreditation is fabricated.

Every certificate states that it is **not an official CEFR, TEF or TCF qualification**, and that speaking/writing were not assessed. A course availability label is not used as evidence of official accreditation. Learner-supplied display names are not verified legal identities. A later name change applies only to future certificates; correction of an issued record requires administrator review.

Public verification requires both an unpredictable certificate UUID and the printed holder name. It returns only valid/invalid plus the printed level, issue date, scope, score, lesson count, bank version and issuer for a match, so altered printed grades can be detected; it never reveals the holder name, email, answers, user ID or certificate list. A revoked or mismatched record returns invalid. The standalone verification page is built to `dist/certificates/` and is linked from the printable award. Verification is also available on the app’s sign-in screen and Certificates tab.

Owners can retrieve their existing certificate after purchase expiry with a verified identity; expiry does not revoke a previously earned award or grant access to lessons. Certificates are retained unless an administrator revokes them or their account is deleted under the existing account-retention policy. No student endpoint edits or deletes issued awards.

## Schema and security

`supabase/migrations/20261104_achievements_certificates.sql` creates private `academy_achievements` tables for configuration, profiles, XP, study days, badges, assessment bank, attempts and certificates. All tables enable RLS and deny direct student/anonymous table access. Public RPC wrappers are security invokers. Private security-definer implementations use empty search paths, narrowly granted execution and ownership/access checks. Only certificate verification is anonymous; its private function is the only implementation granted to `anon`. Keep the private schema **outside** the exposed Data API schemas.

The migration only adds objects and two reward triggers. It does not replace the installed quiz grader, alter lesson IDs or update historical student progress. Existing tracker/placement migrations are prerequisites. Production metadata was inspected read-only while implementing: the live lesson ID constraint uses two digits for A0 and three for A1–C2, unlike the older initial repository migration. Isolated tests mirror the live naming convention; no production constraint was changed.

The schema keeps assessment/certificate provenance, freezes bank versions and preserves history. Never edit a bank version already used for an issued certificate. Add a new reviewed version and explicit rollout if content or criteria change.

## Verification commands and limits

Use Node 22 in the existing checkout; cloud tasks are already isolated and need no worktree.

```sh
npm install --no-package-lock
npm test
npm run build
node scripts/generate-final-seed.mjs --check
node scripts/validate-curriculum.mjs curriculum/a0-batch-01.json
# Python Playwright and Chromium are needed for optional local browser QA.
python3 scripts/test-achievements-browser.py
python3 scripts/test-tracker-browser.py
python3 scripts/test-placement-browser.py
```

Database tests execute the real migrations in local PostgreSQL/PGlite with synthetic Auth users and purchases. They cover all seven levels, 75% failure / balanced 83% pass / unbalanced 83% failure, prerequisites, incomplete attempts, expiration, course changes mid-attempt, replay, quotas, cross-account reads, direct-write/XP forgery, private bank access, revocation, name verification, purchase/email expiry, time-zone/streak behavior, legacy XP recovery, optional reward failures and data-preserving rollback.

Browser QA uses the actual UI modules and isolated mocked transport, blocks external traffic, checks mobile/desktop controls, locked rewards/assessments, settings, all 12 questions, resume, text scope, Unicode certificate rendering, one-page PDF output, public verification and stale-response clearing. Screenshots and PDFs are generated in ignored `dist/achievements-qa/`. Existing tracker, notebook, placement and quiz/progress browser regressions run separately. This does not establish real staging PostgREST, authenticated production browser, screen-reader, audio pronunciation or independent-session concurrency coverage.

## Rollout — review first

1. Review XP/reward rules, certificate language, final items/keys, completion thresholds and speech output. Obtain independent French editorial/audio and issuer approval before certificates can be issued.
2. On staging, back up configuration and confirm the existing academy/placement/tracker migrations and live constraints. Apply the new migration **once** using normal reviewed migration recording; it is transactional. Keep its schema out of Data API exposure settings.
3. Test two entitled accounts and anonymous/expired/unverified callers, normal quizzes and notebook updates with/without optional rewards, duplicate requests on independent database sessions, calendar-boundary/time-zone behavior, all certificate gates and anonymous verification privacy. Confirm automatic XP never blocks a normal lesson save.
4. Separately authorize production application and merge/deployment after review. Merging to `development` can deploy Pages. Preserve all student progress and use rollback-only synthetic writes for production smoke checks when appropriate. No production write, migration, merge or deployment was performed during this implementation task.

Rollback: `supabase/rollbacks/20261104_disable_achievements.sql` detaches reward triggers and revokes new earning/assessment-write endpoints without deleting XP, days, attempts or certificates. Ordinary quizzes continue unchanged. Existing certificate owner reads and public verification stay available. Retain the `dist/certificates/` verifier when restoring older frontend assets so printed verification links continue to work.

Remaining release checks are independent editorial/audio review, real staging Supabase/PostgREST and separate-session concurrency, authenticated browser/assistive technology QA, hosted CI and human approval of issuance/deployment. The migration remains unapplied.
