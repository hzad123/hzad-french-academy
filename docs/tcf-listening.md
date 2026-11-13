# TCF Listening Test 01

## Format and sources

The owner requested one listening exam with question audio and marking, following
TCF Canada. The established standing authorization covers tested publication.
This is an original academy practice exam, not a reproduction of an official paper.

Verified on 13 November 2026 against France Éducation international's indexed pages:

- [TCF Canada](https://www.france-education-international.fr/test/tcf-canada):
  39 multiple-choice questions, four choices/one correct answer, 35 minutes.
- [Official examples](https://www.france-education-international.fr/test/exemples-epreuves-tcf):
  illustrated items with four spoken statements, appropriate spoken responses,
  then exchanges/longer documents followed by a spoken question and written choices.
- [Candidate manual](https://www.france-education-international.fr/document/manuel-candidat-tcf-en):
  increasing difficulty, recordings heard once, question after the document.
- [Evaluation](https://france-education-international.fr/en/node/197):
  correct responses contribute to a difficulty-calibrated score. A raw number
  correct does not establish an official100–699TCF result or its NCLC equivalent.

Direct FEI page fetching encountered its bot403 protection; the official search
index exposed the cited format/examples/manual text. The item-type distribution
here (four images, four response items,31document items) is an original practice
design, not a claim that every official paper uses those exact subtype counts.

## Student flow

Inside TEF/TCF AI Tests, **Listening · Test 01** opens a preflight audio check.
Students play that short recording before starting. The exam has39original
questions with prerecorded French audio, short illustrated/response items first,
then announcements, conversations and longer interviews/arguments. Two distinct
French voices separate speakers. No browser speech synthesis or live speech
provider is required. Provenance: [audio licenses](../assets/tcf-listening/v1/AUDIO-LICENSES.md).

The 35-minute server clock starts once. Questions 1–38 show **Next**, which moves
forward one question and starts its recording. On question 39, a single
**Submit test** button submits the complete exam directly. There is no early
Submit button or extra confirmation step. Questions still advance when their
timed response window expires; the final question remains until submission or
the original deadline. Moving forward never resets or extends the test clock.

There is no backward navigation or replay during an active attempt. Reloading
resumes the saved question and current audio position. A **Play audio** recovery
button appears only if playback is blocked or fails. The spoken question follows
its document, and the written prompt appears after the recording. Illustrated
and spoken-response answer buttons remain lettered.

Choices save immediately; Next/Submit waits for a pending save to resolve. A
failed save can be retried while that question is current. Server revision and
question checks prevent double-clicks, delayed replies or another tab from
advancing twice or changing a previous answer. Deadline expiry grades saved
responses. Leaving the page does not pause the clock.

The end-only answer sheet marks correct, incorrect and unanswered items, identifies
the correct choice and explains it using the recording. Transcripts and replayable
recordings become available for review. The total is a raw **correct/39** plus
percentage, with no penalty for wrong/blanks and no invented official conversion.
Saved results reopen without remarking or any charge. No AI credits, wallet,
prices or other exam settings change; this standalone deterministic module follows
the established reading-module pattern rather than introducing new paid full-mock
pricing.

## Data and assets

The versioned JSON bank is `supabase/exams/tcf-listening-test01.json`.
Migration `20261113171848_tcf_listening_test01.sql` creates private RLS tables for
immutable papers and owned attempts, plus an authenticated-only RPC. Every call
revalidates verified purchase entitlement and ownership using existing helpers.
The server chooses the paper, current question, deadlines and deterministic grade.
Active outputs use an explicit allowlist and exclude scripts, voice segments,
answers and explanations. Students cannot select arbitrary score/current-window
fields. Submitted results and original paper/version remain saved.

Static MP3 and original SVG files live under `assets/tcf-listening/v1` and are
copied to Pages by the build. These are reusable listening stimuli; their public
URLs grant no access to protected attempts/keys/results. There are no student
recordings or credentials in the assets. `manifest.json` records SHA-256 hashes,
measured durations and slots whose sum is exactly2100seconds.

Offline generation: Piper1.8.0, pinned French voice models, FFmpeg, and
`scripts/build-tcf-listening-audio.py --models /path/to/models`. Voice models and
build environments stay outside the repository. Rebuilding an existing published
bank requires a new immutable version; do not overwrite saved attempts' stimuli.

## Validation and publication

Node tests cover content/audio schedule, protected outputs, grading and exact
saved results, ownership/entitlement/revision/window tampering, fixed clocks,
expiry, immutable identity/bank, migration rollback, preservation of prior modules
and idempotent release transactions. Browser acceptance uses real local PostgreSQL
and Auth/entitlement fixtures at390px and1440px; audio playback uses actual MP3s.
No synthetic production identities or real student credentials are created. Chromium
mobile/desktop checks do not establish native Safari/iOS verification.

Offline ASR spot checks supplement file decoding and editorial review; they are
not a substitute for an independent human pronunciation audit. The first unclear
male voice was replaced before publication.

The explicit `release/tcf-listening-test01` branch runs the existing reviewed
Management API release helper with the Actions secret. It rehearses under rollback,
checks hashes of auth/access/progress/accounting/other exam data including all
reading banks, current publication map and saved attempts, then records/commits
only this additive migration and verifies the exact deployed bank and permissions.
After merge to development, verify successful Pages deployment, matching live
JS/CSS/audio hashes, live GHL loading and anonymous RPC denial. Release outcomes
and any verification limits are recorded in the PR. No Edge Function deployment
or provider credential retrieval is required.

Rollback should hide the listening launch or replace the listening RPC while
retaining its private bank, saved attempts and versioned audio. It must not drop
student results, reset attempts, remove other modules or overwrite published media.

Local release validation: all242Node tests and the production build pass. The final
390px/1440px browser runs decode all39recordings and pass playback, preflight,
keyboard/edit autosave, same-player continuation, timer/resume/window enforcement,
save recovery, expiry, correction/totals, saved review and account isolation.
Three independently transcribed audio samples include image options, a dialogue
and the final long extract; the replacement voice preserves their answer-bearing
content. All39scripts/options and four SVGs received editorial/visual review;
full human pronunciation review and native Safari testing remain unverified.


## Next and final submission correction — 13 November 2026

The owner requested Next between questions and only one final Submit action.
Migration `20261113185622_tcf_listening_next_final_submit.sql` adds a private RLS
navigation table containing only per-attempt skipped timeline seconds. No
existing attempt, answer, result, paper, recording, start or deadline is rewritten.
The authenticated `next` action accepts only the current question and revision,
moves forward once and increments the revision. Active snapshots retain their
previous shape. New and resumed attempts use this flow; completed results remain
unchanged. Submit is server-enforced on question 39 only; expiry still marks
saved work from any question.

The release helper `scripts/release/tcf-listening-next.py` rehearses and publishes
this exact migration through `release/tcf-listening-next`, protecting hashes of
existing listening, reading and other academy data/settings. Keep the original
migration and immutable bank intact. Revert the UI/RPC flow if necessary while
retaining navigation rows required to resume saved progress. Backend and browser
acceptance checks cover all 39 forward transitions, save/transport recovery,
double requests, final-only submission, fixed clocks, old results and access.

Validation for this correction: all 248 Node tests and the build pass. The updated
390 px / 1440 px browser suite performs all 38 real Next actions, checks one final
Submit without confirmation, and verifies new-question audio, pending-save guards,
double-click/lost-response recovery, resume, original clocks, correct/wrong/blank
marking, fallback timer advancement, expiry and account isolation. Signed-in
production interaction and native Safari remain unverified; release evidence is
recorded in the PR.
