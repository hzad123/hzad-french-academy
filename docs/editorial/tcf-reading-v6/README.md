# TCF Reading Tests 01–06: final v6 review

**Status: unpublished. Do not apply the pending migration or merge this revision for deployment.** The owner explicitly requested a correction pass and a reviewable report before publication. PRs #64 and #68 were already merged before this continuation; the pending v6 work is a separate revision in [draft PR #72](https://github.com/hzad123/hzad-french-academy/pull/72).

The six papers preserve Questions 1–24, question weights, the 39-question format, 699-point maximum and 3,600-second duration. Every advanced item in Questions 25–39 differs from v5 in its passage, question, options and explanation. All 90 received source-first editorial decisions, 270 distractor checks and 90 explanation checks. Eight items then received further repairs during this continuation, all retaining their independently established answer letters.

## Read the review

- [Final correction report](final-correction-report.md): answer-key history, every rewritten item, eight further repairs, difficulty limitations, preservation scope and a 90-item appendix with exact answers, passage excerpts and reading demands.
- [Continuation changes](continuation-changes.json): structured record of the eight further repairs and distinction from the full 90-item rewrite.
- [Validation summary](validation-summary.json): machine-readable counts, complete bank hashes, publication state and current test/build/browser status.
- [Independent review fixture](../../../tests/fixtures/tcf-reading-v6-independent-review.json): all 90 decisions, exact evidence, 270 rejected-option rationales, blind-cue judgments, explanation checks and fingerprints of the complete reviewed questions.
- [Current banks](../../../supabase/exams/tcf-reading-v6): the six complete papers.
- [Local regression tests](../../../tests/tcf-reading-v6.test.mjs): content/evidence binding and PGlite version-routing, scoring and preservation checks.
- [Pending migration](../../../supabase/migrations/20261118210025_tcf_reading_01_06_close_reading_v6.sql): six immutable inserts and six guarded publication-pointer changes, still unapplied.

## Accuracy and provenance

The historical Test 01 Question 30 error was **C → B**. That correction was already present in v5; the v6 passage and independently recorded selection retain **B**. No additional key error was found in v6. The 65 letter differences from v5 reflect changed answer arrangements in rewritten questions, not 65 incorrect keys.

Reviewers first inspected questions/options without passages for giveaways, then selected answers from the passage before viewing stored keys or explanations. The owner had already supplied Test 01 Question 30 = B, so that one fact was known before inspection. Regression expectations were bound to the recorded decisions after editorial review. The automated checks verify consistency and preservation; they do not establish educational quality by themselves.

A workspace interruption required recovery. All six complete bank files match their previously recorded final SHA-256 hashes. The evidence fixture preserves earlier review judgments; recovery is not presented as a new blind review. No external AI API or review pipeline is required or added.

## Validation status

The prior completed run had **365 passing tests, zero failures**, and a successful production build. On the restored latest development base, the **complete automated suite passed all 370 tests, with zero failures**, the **nine targeted v6 regressions passed**, and the **production build passed again**. Local browser execution was blocked before page load by `socket() Operation not permitted`. The [hosted, read-only PR browser validation](https://github.com/hzad123/hzad-french-academy/actions/runs/44430397350) passed at 390×900 and 1440×900 after the checker was corrected to open the existing TCF module chooser. It verified all 90 advanced questions at each viewport, six saved/resumed/submitted/reopened papers per viewport, exact scores/corrections, and no overflow or page errors. The [GitHub full suite and build](https://github.com/hzad123/hzad-french-academy/actions/runs/44430397391) also passed. No production API was called or migration applied in this continuation.

These are editorial judgments, not learner-based psychometric calibration. The report identifies five moderate or comparatively direct items for monitoring and makes no claim of perfect difficulty or official TCF calibration.
