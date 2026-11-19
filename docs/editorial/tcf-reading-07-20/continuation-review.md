# TCF Reading Tests 07–20 — continuation review and release readiness

**Status: editorial revision in progress; do not merge or activate on Supabase yet.** This is the recovered work from the interrupted review, not a new set of tests.

## Recovered work
- Fourteen distinct versioned paper banks, `tcf-reading-07` through `tcf-reading-20`.
- All 210 advanced Q25–39 rewritten, with 336 earlier Q1–24 unchanged, 39 questions and 699 possible points per test, 3,600 seconds per test.
- Initial objective audit in `preliminary-audit.md`; guarded migration and PGlite rollback/preservation regression.
- PR #75 originally failed CI: Tests 07–11 Q25–34 had been edited in fixtures but not reflected in migration. Exactly **50 records were out of sync**. The pending migration was synchronized to match all fourteen latest fixtures.

## Continuation
- Read every available advanced passage, stem and all four choices across 210 items. For Tests 08–20 Q25–38, selected the best source-supported answer before opening the saved answer keys. All 182 of these key comparisons agreed; no additional wrong key was identified in that subset. Tests 07 Q25–38 were reviewed with the saved key already visible, so these 14 cannot be called blinded. All Q39 keys were already visible when the final questions were rewritten; those are not blinded either.
- Rebuilt **all fourteen Q39 cases** for more demanding close reading: alternative explanations, qualified findings, timing, resource limits, and evidence-based conclusions. Also rebuilt Test 07 Q35 around comparable waste-prevention versus composting measurements. Kept their source-supported key letters; expanded stem, passage, alternatives and rationale.
- Removed uniquely-longest-correct-option tells introduced during Q39 rewrites.
- Saved the 210-item answer/option record in `continuation-answer-record.json` with explicit methodological limits. The record is an accountability artifact, **not** an independently calibrated difficulty study, and does not claim that a known answer was blind-reviewed.
- Replaced a tautological `assert.equal(guess===q.correct,guess===q.correct)` regression with checks against the recorded selected answer and exact option meaning for each of four alternatives. This verifies bank-to-review consistency but **does not constitute live server grader testing**.

## Validation completed so far
- The first corrected bank/migration synchronization passed full Build and test and the existing v6 UI workflow:
  - [Build and test](https://github.com/hzad123/hzad-french-academy/actions/runs/44607930830)
  - [Existing v6 UI workflow](https://github.com/hzad123/hzad-french-academy/actions/runs/44607930762)
- The subsequent full Q39 editorial rebuild also passed these workflows:
  - [Build and test](https://github.com/hzad123/hzad-french-academy/actions/runs/44608882324)
  - [Existing v6 UI workflow](https://github.com/hzad123/hzad-french-academy/actions/runs/44608882229)
- The last review-record regression change needs its **own final CI confirmation**. The existing v6 UI workflow does not verify Tests 07–20 on a browser.

## Outstanding release gates
1. Conduct a harder second-pass distractor and difficulty review of Q25–38 across Tests 07–20: several remaining options are markedly implausible or repeat the passage too closely. Source/key agreement is **not proof of suitable advanced difficulty**. Resolve any ambiguities before final signoff.
2. Upgrade to actual server scoring checks for all 14 exams, in addition to the currently present bank assertions and local PGlite migration-preservation tests.
3. Obtain passing full CI/build on the final review-record commit and a hosted browser validation **specifically for Tests 07–20**, including resume/submit/results.
4. Confirm production preflight and historical attempts before applying the **unapplied** v4 migration; only then merge/release upon authorization.

The reviewed changes are confined to the pending 14-bank migration and test/review artifacts. **No production database migration was applied, no existing student record was edited, and Tests 01–06 remain untouched.**

## Resumed release-gate work after the interrupted 210-item review
- Recovered the 210-item source/key review record and the previously synchronized fourteen-paper v4 migration on PR #75.
- A second objective sweep caught **107 additional answer-position clues**: the correct answer was the only *shortest* choice. The prior regression only rejected the only *longest* correct choice. Correct-choice wording was revised and subsequently language-polished without changing the intended source-supported letters. A complete 210-item sweep now finds **0 uniquely shortest** and **0 uniquely longest** correct choices.
- Added a new regression asserting both length extremes are rejected for every Q25–39. The original 210-item review record was updated to the exact current correct answer text and choice lengths, and every updated bank was synchronized to the guarded SQL publication migration.
- Added `tests/tcf-reading-v4-rpc.test.mjs`: it creates the real reading schema using the historical migrations in a local PGlite database, keeps a previously started v3 attempt, rolls the new migration back once, applies it once, and exercises all fourteen v4 banks through the real authenticated `academy_tcf_reading_command` RPC. It verifies 39 correct choices/699 points and 15 intentionally incorrect advanced responses per paper, saved state and reopened results, old-attempt preservation and immutable-version reapplication rejection.
- The first run of the new RPC test caught a **test-code bug** (`LETTERS.find` used on a string); fixed to `[...LETTERS].find` before further acceptance. Final CI on the latest reviewed bank snapshot must still complete successfully before merge.
- **Editorial caution:** balancing answer length removes a mechanical guessing cue, but does not by itself guarantee difficult, plausible distractors. The key-accuracy record is not a substitute for independent passage-based difficulty calibration against real learners. Q25–38 remain comparatively more direct than the strongest v6 cases and must be assessed before release.

**Release decision remains blocked.** Do not merge this draft PR or execute the unapplied v4 migration until its final review, RPC/build CI and v4 browser workflow pass on the *same* commit. Do not edit historical student attempts, auth, progress, wallet or Tests 01–06.
