# French placement assessment v1 — review and rollout

This feature branches from `development` at `67c0d65bd5ac0d84154f107a16429b38faf8ef41`.
It adds an advisory A0–C2 learning starting point; it does not certify CEFR proficiency, assess speaking/writing, grant access, or change lesson progress. No AI services or credits are used.

## Assessment and scoring

The original bank is `supabase/placement/bank-v1.json`, version `fr-placement-2026-11-v1`. Each of seven stages has eight items: two each for grammar, vocabulary, reading and listening. Questions progress from recognition and everyday tasks to complex inference, argument and register. The database chooses the next eligible item and accepts only an option index, item ID, attempt ID and delivery mode. No score or recommendation is accepted from the client.

A stage is mastered with at least 6/8 correct **and** at least 1/2 correct in every skill. A weak skill therefore cannot be hidden by stronger skills. The next stage opens only after this evidence is met. The first unmastered stage is the recommended starting point; passing C2 still recommends C2. Scores one item below the threshold, or uneven skills near that threshold, receive a conservative boundary explanation. These are explicitly chosen instructional thresholds, not externally calibrated CEFR cut scores.

For listening, students explicitly play a French browser/device voice. A transcript is available for hearing accessibility, missing French voices or playback failure. Transcript answers are stored with their provenance and excluded from listening scores. If either listening item in a stage uses a transcript, stage progression uses the other six items, requiring 5/6 and at least 1/2 in each of the three measured skills. The recommendation is prominently provisional. Individual measured listening responses remain visible in the skill breakdown but do not imply full listening evidence. Device synthesis and self-reported delivery mode cannot enforce invigilated listening integrity; the assessment is advisory.

The bank and speech output need independent French editorial/audio review and learner calibration before release. C1/C2 multiple-choice evidence alone must never be described as full C1/C2 proficiency. Never mutate a bank version already used by students: add a new version and retain the old questions for provenance.

## Persistence and security

- Private, non-Data-API schema `academy_placement`: immutable versioned bank, attempt ownership, start/completion times, answers and delivery modes, stored result, stage evidence and skill scores. Tables have RLS enabled, no student policies and no direct student table grants.
- Public **security invoker** RPC wrappers call narrowly granted, private **security definer** implementations with an empty search path and fully qualified application objects. Do not add `academy_placement` to Supabase's exposed schemas.
- Every entry point checks `auth.uid()`, confirmed email in `auth.users`, and existing `academy_has_access()` (verified, started, unexpired, active academy entitlement). Ownership is checked before reading or answering an attempt. Existing entitlement authority is reused; placement never writes entitlements.
- Start/resume uses a per-user transaction advisory lock and a unique active-attempt index. At most three new attempts per rolling 24 hours; partial attempts resume for seven days, then expire without a recommendation. History is retained; the UI shows the latest 20 attempts.
- Answers acquire an attempt row lock. Only the next question is eligible. A replay of the same answer is idempotent; changing an accepted answer is rejected. Invalid option indexes/modes, cross-account IDs and direct score/table writes are rejected. There is no per-item correctness oracle in student RPC responses.
- Sanitized delivery contains the current question only, never grading keys. Browser code imports neither the bank nor scoring implementation. As with any open-source assessment seed, repository maintainers can read SQL/bank keys; this is not a high-stakes examination or a defense against source inspection. A future high-stakes bank must be provisioned privately.
- Attempts are stored only in Supabase, with no student answers or result cache in browser localStorage. Closing/reopening resumes the server attempt. Sign-out invalidates pending UI responses and clears the placement view.

## Local checks

Use Node 22 and the existing checkout (cloud tasks are already isolated; no worktree is required).

```sh
npm install --no-package-lock
npm test
node scripts/generate-placement-seed.mjs --check
node scripts/validate-curriculum.mjs curriculum/a0-batch-01.json
npm run build
```

`npm test` includes a local PGlite PostgreSQL database with synthetic Auth/users and purchases. It executes the actual existing entitlement migration and new placement migration, then tests progression, boundaries, partial evidence, transcript mode, access/ownership, replay, attempts and quota behavior. This is database validation, not a claim to have tested a deployed Supabase/PostgREST instance or concurrent independent PostgreSQL sessions.

Browser acceptance uses the actual template, course cards and placement controller with an isolated mocked transport; it blocks all non-local requests:

```sh
# Requires Python Playwright and a Chromium installation.
python3 scripts/test-placement-browser.py
# Optional binary override: CHROMIUM_PATH=/path/to/chromium
```

It checks desktop (1280px), mobile (390px), native radio keyboard controls, retry/resume, transcript fallback, result display, selected-level navigation event, all seven Available now cards, unauthorized responses and stale responses after sign-out. Screenshots are generated in ignored `dist/placement-qa/`; they show synthetic data. Existing tests protect normal lesson/quiz/progress behavior. Real French speech output, a screen-reader audit and staging Supabase integration remain review checks.

## Rollout — manual, after approval only

1. Review the diff, French bank and thresholds; inspect the staging schema and confirm `academy_has_access()` matches the current verified-purchase rules. The actual production schema was **not** inspected or changed in this task. Repository migrations are the implementation contract used for local tests.
2. Back up existing configuration and take the normal database backup. Apply `supabase/migrations/20261104_french_placement.sql` **once to a staging Supabase project** after the existing academy migrations. It adds only new placement objects/data, not lesson/student updates. Its transaction rolls back on failure. Do not blindly reapply an already recorded migration.
3. Keep the private schema out of Data API exposed schemas. Verify anon cannot execute RPCs, students cannot read either private table, and only the three invoker wrappers are public API. Check RLS and grants against Supabase defaults. Reference: [Supabase database functions](https://supabase.com/docs/guides/database/functions) and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
4. With staging accounts, test verified/active access, unverified email/purchase, future/expired/revoked purchase, two-user isolation, refresh/resume, concurrent duplicate answer requests, quota and a complete assessment including real French speech. Check auth, all levels, lesson instant feedback and saved progress.
5. After human security/content review and successful staging checks, separately authorize the production migration and merge/deployment. Merging to `development` can trigger Pages deployment. **This task does not authorize or perform any of these production steps.** The one-block GHL loader and hosted asset names are unchanged.

## Rollback without data loss

If the feature must be disabled after a future release, first restore the previously reviewed frontend assets by the normal deployment process. With administrator approval, execute `supabase/rollbacks/20261104_disable_placement.sql` to revoke the new student entry points. It retains questions, attempts and history. Do not drop tables or reset progress/entitlements. Re-enable only the exact grants from the forward migration after review; do not rerun the complete create migration over existing data.

## Acceptance checklist

- [x] Required development files verified; both instruction files read completely.
- [x] Baseline existing tests and build pass.
- [x] Non-AI versioned A0–C2 bank and private deterministic scoring.
- [x] Saved attempt history, progressive evidence, transcript fallback, advisory results and level navigation.
- [x] Local migration, security and browser acceptance checks.
- [ ] Independent editorial/audio review and assessment calibration.
- [ ] Real staging Supabase/PostgREST integration and independent-session concurrency checks.
- [ ] Human review, CI verification, production migration and deployment (not authorized here).
