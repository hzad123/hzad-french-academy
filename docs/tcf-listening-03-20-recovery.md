# Listening Tests 03–20: recovery checkpoint, not a completed release

## Later owner instruction: activate Tests03–06 for checking

After the code/media deployment, the owner explicitly requested: “do 3 to 6 and
i will check”. This authorizes publishing the existing four v3 review candidates
while their broader editorial issues remain open. It does not certify them as
fully reviewed or authorize activating Tests07–20.

Migration `20261114002258_tcf_listening_03_06_owner_review_v3.sql` inserts the exact
four immutable v3 banks and publishes only their pointers. Its transaction checks
the historical per-question format, preserves all existing papers and attempts,
and compares snapshots of Auth, entitlements, progress, other exams and credits.
It leaves the examination RPC and RLS unchanged. After this migration, the
published catalogue is Tests01–06, with03–06 on v3. The pre-release status table
and withdrawal notes below describe the earlier checkpoint.

Rollback `supabase/rollbacks/tcf_listening_03_06_owner_review_v3.sql` hides only
these four v3 pointers and preserves every bank, saved attempt and score.
Local PostgreSQL tests cover rollback, idempotency, private keys, all39 forward
transitions and final scoring for all four papers. The full suite has274 tests;
the media's271 deployed files match their repository hashes. Authenticated native
browser checking and final editorial acceptance are left to the owner's review.

## Original recovery checkpoint

The eighteen-test assignment is **incomplete**. No corrected examination is
certified ready or activated by this branch. Keep Tests03–20 withdrawn.
The current work is saved on `feature/tcf-listening-03-20-reviewed`.

## Existing work recovered

- Started from `development` at `90cadb37e2e11d79a84abbf01f0abe78b037835c`.
  Read `AGENTS.md`, `MASTER_PLAN.md`, listening implementation, scoring,
  versioned banks, authoring/render/release tools, migrations and tests.
- PR45 is merged. Its old 18-paper authoring scripts substitute a theme/context
  into a shared set of39 question generators. Its image generator varies labels
  and colors on four shared compositions. These versions remain historical only.
- PR46 is merged and supplies the independently authored Test03 v2 and media.
- PR47 is still open. Incorporated its answer-length improvements from
  `4897b91a3f861829db14a900f35214f72fd3659d` without assuming its keys were correct.
- Merged the existing `feature/tcf-listening-04-20-original-v2` branch,
  `4c80b34`, retaining Tests04–06 banks/media and Tests07–08 authored sources.
  It has no completed revised Test07/08 media or authored Test09–20 successors.
- Merged `fix/tcf-listening-unique-content-distractors-qa`, then improved its
  audit. The original audit examined only unsuffixed v1 files, compared passages
  only at the same number and used shared words as a semantic-quality proxy.

## Per-test status

Every existing bank and every retained authored source has39 items. A count of39
is not a completion claim. Media counts below refer to the selected candidate;
archived v1 recordings still exist separately for saved historical attempts.

| Test | Current production | Best existing work on this branch | Candidate audio / pictures | Release status |
|---|---|---|---|---|
| 01 | Published | Original unchanged | 39 / 4 | Existing release; untouched |
| 02 | Published | Original unchanged | 39 / 4 | Existing release; untouched |
| 03 | Withdrawn | v3 corrections to retained v2 | 39 / 4 | Unpublished; editorial work remains |
| 04 | Withdrawn | v3 corrections to retained v2 | 39 / 4 | Unpublished; editorial/visual work remains |
| 05 | Withdrawn | v3; all124 written options revised | 39 / 4 | Unpublished; originality/topic work remains |
| 06 | Withdrawn | v3; all124 written options revised | 39 / 4 | Unpublished; originality/topic work remains |
| 07 | Withdrawn |39 authored v2 source items retained | 0 / 0 | Revise content, then create media |
| 08 | Withdrawn |39 authored v2 source items retained | 0 / 0 | Revise content, then create media |
| 09 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 10 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 11 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 12 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 13 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 14 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 15 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 16 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 17 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 18 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 19 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |
| 20 | Withdrawn | Defective historical v1 only |39 / 4 archived | Needs independent replacement |

## Concrete corrections already made

Tests03–06 have new, unpublished v3 banks and separate media paths. Original v1
banks/media and retained v2 banks/media are preserved. Test01/02 files, engine,
access, credits, scoring algorithm and historical attempts are not rewritten.

- **Test03 Q24:** the speaker surveyed successful app registrants, but v2 marks
  the answer about excluding appointments made months earlier. Both the v2 bank
  and authoring source have that wrong mapping. v3 selects the evidence-bearing
  answer by its text before reshuffling. Its unchanged interview is retained.
- **Test03 Q7/Q9:** shortened complete spoken scripts and regenerated their MP3s
  rather than changing question timing. New durations are18.521s and20.663s,
  fitting the historical32s and38s slots with more than12s for responding.
- **Test04 Q9:** replaced unsupported weekday names with *demain*; the recording
  never identifies the current weekday. Its room and nine-o'clock start remain.
- **Test04 Q13:** distinguishes the school grade *troisième* from a group
  numbered *trois*. Distractors concern the actual activities in the recording.
- **Test04 Q35:** gives exactly one proposition challenged by the speaker. Some
  previous distractors were also claims contradicted by the same recording.
- Removed outdated source-order ordinals from several explanations after
  verifying that the spoken choices had been shuffled.
- **Tests05–06 Q9–39:** individually rewrote all248 written options against their
  retained recordings, using relevant misconceptions and comparable structures.
  These choices are not spoken, so their edits do not require rerecording.
- **Test06 Q19:** the stimulus describes a farm, while the old question named a
  market. Corrected and rerecorded the spoken question. The clip is24.007s in its
  unchanged40s slot.
- **Tests03–06 Q23/Q29/Q34:** regenerated12 panel/debate/roundtable clips using
  explicit stable speaker profiles, separating female hosts from female guests
  and keeping returning male speakers consistent. Test06 Q23 gives the parent a
  distinct male profile. The previous renderer chose alternate timbres by turn
  index, which could merge participants or change voices when turns varied.
- Restored every v3 question's exact historical v1 `slotSeconds`. The inherited
  v2 renderer had redistributed slots despite preserving the2100s total.
- Preserved Q1–8 choice order/keys to retain valid spoken alternatives. Shuffled
  the remaining balanced answer multiset once across each paper. The inherited
  greedy least-used-letter algorithm forced one of each A–D in almost every
  four-question block, making the last letter in a block guessable.

The four v3 banks contain156 recordings: **141 retained,15 newly synthesized**.
They reuse16 illustrations. No new illustration is claimed complete. Offline
Piper1.8.0 uses pinned Siwis/Tom/UPMC model SHA-256 hashes; no provider secrets,
paid per-student generation or runtime AI expense are introduced.

| Candidate | Correct answer longest, including ties /31 | Largest option length ratio |
|---|---:|---:|
| 03 v3 |10 |1.33 |
| 04 v3 |10 |1.31 |
| 05 v3 |8 |1.21 |
| 06 v3 |9 |1.16 |

For comparison, Test05 v2 had21/31 longest correct answers, Test06 v2 had15/31.
Tie-adjusted longest-choice success is also reported by the audit, alongside
shortest-choice success, so fixing one cue cannot simply create its opposite.
These statistics do not establish distractor plausibility or full editorial QA.

## Known content issues still blocking release

`curriculum/tcf-listening-review/findings.json` records question-specific reasons.
They include repeated survey-exclusion interviews at Q24; contextualization of
contradictory testimonies at Q37; forecasting/scenario arguments at several Q32s;
and recurring sustainable-expansion interviews at Q39. Lexical similarity alone
misses these conceptual duplicates. The Test05 density/urban-heat lecture is
explicitly distinguished from the different success/overload storyline.

The six existing rewritten exams are still dominated by individual subject
clusters. The latest assignment requires multiple unrelated topics within each
exam, superseding the old single-theme blueprint. Preserve strong individual
questions while replacing enough repeated blocks to satisfy that requirement.

Visual inspection used a rendered16-image contact sheet for Tests03–06. One
specific unresolved defect is Test04 Q1: the illustration does not clearly show
wheels/a handle on the object its spoken key calls a *chariot*. A geometry hash
cannot validate that interpretation. All72 corrected scenes still need a
question-by-question image/spoken-choice/key review; the old repeated SVGs must
not be called72 distinct scenes.

Full naturalness/pronunciation listening review, difficulty calibration, final
single-answer/distractor review and authenticated end-to-end checks for corrected
papers remain incomplete. There are no fabricated all-pass review records.

## Validation and reports

```bash
npm install
npm test
npm run build
node scripts/audit-tcf-listening-quality.mjs --legacy --media
node scripts/audit-tcf-listening-quality.mjs --media
```

The two audit commands **should fail** while the documented blockers remain.
Their reports are saved even when their exit code is1:

- `reports/tcf-listening-legacy-qa.json`: all702 affected historical items,
  their702 MP3s and72 images, with Test01/02 as comparison baselines.
- `reports/tcf-listening-candidate-qa.json`: all702 selected items, preferring
  v3, then v2, then authored unrecorded source, then defective v1. This selection
  has624 existing recordings and64 images; it does not hide missing Test07/08
  media by substituting their old v1 assets.

The latest full repository run passes **272/272 tests** and the production build.
Both content gates reject all18 affected examinations. Full MP3 decoding and
hash/timing checks succeeded for all702 archived recordings and all624 existing
selected-candidate recordings. The78 missing revised clips belong to Tests07/08.
The lexical comparison finds4228 overlapping passage pairs in the historical
selection and1803 in the best-existing selection (both include01/02 baselines).
These are flags for review, not counts of independently certified original texts.

The audit decodes complete MP3s, measures durations against unchanged slots,
checks byte SHA-256 and exact source-segment hashes, identifies duplicate audio,
compares all transcript positions (including within-test reuse), strips labels
and colors when detecting repeated SVG geometry, reports actual character/word
lengths, examines key balance/four-item patterns, and lists pending checks per
question. Metadata integrity is not a claim that recordings were heard and
editorially approved. Legacy and candidate overlap counts are lexical evidence,
not a calibrated measure of semantic originality.

The dedicated GitHub workflow now checks the event's actual commit rather than
hard-coding the obsolete QA branch, installs FFmpeg and uploads the candidate
report even when the quality gate fails. It must remain blocked while content
is incomplete. Ordinary application/unit tests can pass at the same time.

`tests/tcf-listening-review.test.mjs` includes semantic regression cases for the
confirmed keys/wording, source/media matching, exact historical slots, prevention
of both answer-length cues, stable speaker mappings and real local PostgreSQL
(PGlite) grading of all four v3 banks. It confirms39/39 with the candidate keys,
unchanged archived results/banks, immutability and no accidental publication.
These regressions establish the specified cases, not all702 semantic keys.

Supplementary offline Whisper transcription of the first three regenerated
clips retained the answer-bearing details; its transcript also contained ASR
errors/hallucinated closing text. It is **not** used as proof of complete
pronunciation review. The optional ASR environment required PyAV16.0.1 for
compatibility with faster-whisper1.2.1; none of it is a production dependency.

## Production and migration safety

Read-only Supabase inspection verified:

- Published registry contains exactly Tests01 and02.
-20 immutable historical papers are present; no v2/v3 candidate is published.
- Nine listening attempts have the identical aggregate fingerprint before and
  after this work. No student identity, response, score or progress was edited.
- RLS remains enabled on papers, attempts, navigation and published tables.
- Migration versions20261113235900/04/05/06 have **not** been applied.

Those four unapplied v2 migration files and their generators are now
**archive-only**: they can insert private immutable banks, but cannot update
`academy_tcf_listening.published`. This prevents an ordinary future migration run
from exposing the known-defective/unreviewed v2 material. Already applied v1
migration history is unchanged. No migration was applied during this work.
No v3 publication SQL is generated until the complete release is verified.

Nothing was merged to development or deployed. Final activation, live20-paper
catalogue verification, corrected-paper end-to-end playback/submission/results
and full student-data preservation checks at publication are outstanding.

## Exact resumption point

1. Continue from this branch; do not regenerate or replace historical files.
2. Read the findings, candidate report, correction patches and four v3 provenance
   ledgers. The15 new recordings and141 retained recordings already match their
   segment hashes and original slots; keep them unless their content changes.
3. Finish the originality, unrelated-topic and semantic work on Tests03–06.
   Repair/verify picture agreement, especially Test04 Q1. Keep strong items.
4. Review the already authored Test07/08 sources before recording them. They
   share several of the same advanced-storyline defects; do not record them
   wholesale and assume they are complete.
5. Individually author the468 missing replacement questions for Tests09–20,
   preserving the old engine sequence/slots and varying subjects within papers.
   Create distinct scenes and exact matching recordings for each final item.
6. For a new draft revision, use an explicit authored patch and versioned path.
   `prepare-listening-review-candidates.mjs --test N` refuses to overwrite an
   existing candidate. Never use the old v1 theme-substitution generators as
   a new-content source. Finalized/published revisions must remain immutable.
7. `render-listening-review-candidate.py --models /path/to/models --test N`
   supports the prepared03–06 v3 candidates and records only explicitly pending
   clips. It verifies pinned models, refuses to overwrite an existing clip,
   persists successful clips individually and fails rather than redistributing
   the clock or cutting audio. Do not use the old renderer's slot fallback.
8. Record genuine review evidence in `curriculum/tcf-listening-review/reviews.json`
   only after doing that review. Review hashes bind text, key, explanation and
   media. Every item needs the14 requested criteria, actual transcript evidence,
   a supported answer and individual distractor reasons. The audit cannot write
   semantic pass decisions. There is no requirement to ask the owner for an
   approval of each test; proceed with the authorized editorial work.
9. Re-run all tests/build and both audits. Commit each finished test and continue
   through20. No test is complete solely because its media checks pass.
10. After all18 corrected exams pass, deploy media, apply safe new-version
    publication transactions, verify Tests01–20 access, perform authenticated
    end-to-end checks and compare preservation snapshots. Standing publication
    authorization already exists; no extra permission question is needed.
