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

The35minute server clock starts once. The schedule includes each recording plus
response time and automatically advances through all39questions. There is no
question jump, rewind or replay during an active attempt. Continue audio resumes
at the current scheduled point, including after reload/return, without resetting
the deadline. The final question is spoken after its document; its written prompt
appears after the recording. Illustrated/spoken-response answer buttons remain
lettered, so understanding the audio is necessary.

Choices save immediately; students can change the current question's answer until
its window ends. Revision checks handle another tab; failed saves retain a retry
until the question ends. A late/recovered response cannot rewrite an earlier
window. Early submission requires confirmation. Deadline expiry grades saved
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
