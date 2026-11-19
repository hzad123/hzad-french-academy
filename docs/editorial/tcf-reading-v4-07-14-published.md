# TCF Reading Tests 07–14: production publication record

**Published November 19, 2026.** This document records an already-applied Supabase production migration; merging this file does NOT itself need to rerun it.

- Supabase project: `ogntvgvzmjrnppcullsj` (HZad French Academy).
- Applied migration: `20261119215858_tcf_reading_07_14_close_reading_v4_owner_approved`.
- Source of reviewed banks: PR #75, immutable commit `ef152df7d4a977532c24ff5261db3c710f69b4db`; earlier editorial pass covered 120 advanced questions, changed 63 distractors and aligned 27 explanations, with the recorded limitations of key-visible review.
- Released version: `tcf-reading-2026-11-close-reading-v4`.
- Active tests: `tcf-reading-07` through `tcf-reading-14`, 39 questions each, 699 points and 3,600 seconds per test.
- Other versions preserved: Tests 01–06 still v6; Tests 15–20 still v3.
- Historical reading banks increased from 53 to 61 (eight immutable inserts).
- Existing student attempts: 17 before and after, same stable MD5 fingerprint `c49cff1e44bcbd900f2bacd9f28b21a5`.
- Post-commit production checks confirmed eight v4 publication pointers and all 20 catalog entries. Production migration includes pre/post guards, preserves Questions 1–24, and asserts no unrelated pointer, historical bank, or student attempt changes.

**IMPORTANT**: Draft PR #75 still contains an outdated 14-bank migration (`20261119180000_tcf_reading_07_20_close_reading_v4.sql`). **DO NOT MERGE OR EXECUTE THAT MIGRATION AS WRITTEN** now that 07–14 have been published. Before releasing 15–20, split and rewrite its pending migration to include ONLY Tests 15–20, validate against these eight already-published v4 banks, and rerun the relevant tests on that exact commit. Do not touch student attempts.

The migration in this release record is retained for reproducibility and audit, not for reapplication to the same production database.
