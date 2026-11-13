# Listening Test 01 — scoring and format upgrade

## Published scope: provisional result estimate

The original v1 Test01 remains immutable, with the same 39 recordings, correct
answers, fixed 35-minute test clock, server grading, and saved attempt results.

After server grading, a **clearly labeled non-official TCF practice estimate**
may be derived from the 39 ordered `isCorrect` rows by the audited pure JS
`src/exams/tcf-listening/scoring.js` helper.

Formula (illustrative learning aid; no FEI calibration):

- Difficulty proxy weight at position n: `1 + 0.8 * (n - 1) / 38`.
- Estimated score: `round(100 + 599 * weighted_correct / weighted_total)`,
  limited to 100–699.
- Indicative range: estimate +/- 50 points, clipped to 100–699.
- Official IRCC **listening** NCLC thresholds are applied *to this proxy only*.
  Ranges can cross multiple NCLC bands.
- The result labels the model as unvalidated; it is **not** an official TCF
  score, an immigration score, or a substitute for a calibrated test.

This is not psychometric calibration. Relative question position is an imperfect
substitute for empirically measured item difficulty. Exact score and estimated
NCLC should not be used to advise immigration eligibility. A truly defensible
predictive score requires enough paired HZad and official scores to validate and
update the estimator, with error and calibration reporting.

Source for official conversion cutoffs:
https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/entree-express/documents/examen-linguistique.html

## Authored but NOT released: Test01 v2 scenario changes

`curriculum/tcf-listening-test01-v2-draft.json` contains eight complete original
replacement scripts with distinct genres:

- Q15 local radio news; Q18 telephone customer-service call
- Q23 multi-person panel; Q25 television report
- Q29 debate; Q31 standalone academic lecture
- Q34 multi-person roundtable; Q38 public lecture

These are **draft scripts**; they are deliberately not in the currently
published bank and must not be paired with v1 audio. Before v2 activation:

1. Independently review French language and question/answer alignment.
2. Produce **new prerecorded audio** for each changed script, including actual
   distinct speaker timbres for multi-person conversations. Verify licensing of
   all new voices; avoid faking multi-speaker discussions with the same voice.
3. Listen to all recordings, inspect unnatural pauses/pronunciations, verify
   scripted question placement and source-to-audio SHA hashes.
4. Recalculate all 39 time slots to exactly 2,100 seconds, preserving enough
   response time after the longer recordings. Replace any clips exceeding budget.
5. Publish a **new immutable paper/version** in private Supabase, and new
   versioned media paths under `assets/tcf-listening/v2`. Never overwrite v1.
6. Ensure existing active and completed v1 attempts replay the original audio
   and grade using their stored v1 paper. New starts use v2 only after launch.
7. Run browser and database tests on desktop/mobile, resume/autoadvance,
   save and result history, and update only the Test01 selector.

No new student AI credits are charged for deterministic receptive scoring.
