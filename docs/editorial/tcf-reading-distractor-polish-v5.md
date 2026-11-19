# Targeted TCF Reading distractor cleanup (28 items only)

**Scope:** existing 20 published TCF Reading tests (780 questions). Only 28 conspicuously weak advanced items were selected: two each in Tests 07–20. Tests 01–06 and the other 752 questions are left untouched.

**Editorial changes:** only three incorrect alternatives and the matching explanation for each selected question. Original source passage, question stem, original correct answer letter AND text, points, timing, order and UI remain unchanged.

**Source of truth:** 2026-11-19, development branch version tcf-reading-2026-11-close-reading-v4; publish immutable new version tcf-reading-2026-11-distractor-polish-v5. This preserves all earlier versions, attempts and student progress.

**Release in three guarded batches:** `scripts/release/tcf-reading-distractor-polish-v5-07_10.sql`, `scripts/release/tcf-reading-distractor-polish-v5-11_14.sql`, `scripts/release/tcf-reading-distractor-polish-v5-15_20.sql`. Each transaction inserts immutable paper versions, changes only specified publication pointers and verifies untouched paper content, other pointers and student attempts. Do not use direct updates to historical paper records.

**Key safeguards:** all 14 banks have exactly 39 questions, 3600 seconds and 699 points. Selected questions preserve the original correct option and text; no uniquely shortest/longest correct choices were introduced. Test17 Q36 (a negative-stem question) now has three legitimate non-misleading measures and one misleading measure (D).

**Review limits:** This is a source-informed targeted cleanup, NOT full re-review, formal blinded key examination or empirical psychometric difficulty calibration. Automated tests check structural invariants, exact SQL payloads and rollback-safe database behavior. Only release after green CI.

**Per-item change record:** `docs/editorial/tcf-reading-distractor-polish-v5-changes.json`.

## Production release confirmation (November 19, 2026)

**All three batches successfully applied and verified.** The exact applied Supabase migrations are:

- `20261119230057_tcf_reading_distractor_polish_v5_07_10`
- `20261119230109_tcf_reading_distractor_polish_v5_11_14`
- `20261119230122_tcf_reading_distractor_polish_v5_15_20`

The complete, already-applied SQL is also archived in `supabase/migrations/` using those exact generated version numbers. **Do not execute these transactions a second time.** Their preflight checks intentionally reject repeat deployment.

Database post-check: 20 reading tests published; Tests 01–06 remain `tcf-reading-2026-11-close-reading-v6`; Tests 07–20 use new immutable `tcf-reading-2026-11-distractor-polish-v5`; bank history increased from 67 to 81 entries (no overwrites); student attempts remained 20 before and after with unchanged fingerprint `8f5c98b2902630737168ea5703457a6f`. These verification counts reflect the database at release time, not a promise that new attempts will not arrive later.

The source-based structural, content and PGlite rollback tests passed in the GitHub full Build and test workflow for the candidate release commit `a2ba2aa38b7ee72c4776797a411ad3d5fcf22662`: Actions run `44633589432`. Only distractor options and their explanations were changed.
