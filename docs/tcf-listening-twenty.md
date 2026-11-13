# TCF Canada Listening — 20-paper production blueprint

## Exact owner-approved specification

- Preserve Test 01 unchanged unless a separately reviewed version is published.
- Provide 20 numbered listening tests in total, with 19 additional tests.
- **Every paper:** 39 multiple-choice questions, four choices and one correct choice, fixed 35-minute / 2,100-second server clock.
- **Same progression:** early image questions, simple spoken replies, everyday announcements and dialogues, intermediate interviews and radio/TV reports, later substantial public/academic monologues, debates and multi-speaker discussions.
- **Same behavior:** each prerecorded clip heard once, question after audio, no Back or replay, automatic advancement at server-controlled response-window expiry, Next on Q1–38, one Submit test on Q39.
- **Same result behavior:** answers save immediately, final-only marking, correct/wrong/unanswered answer sheet and explanations, original recording/transcript available after completion, practice TCF/NCLC estimate from the established model.
- **No price, entitlement, credit, exam timing or answer-reset changes.**
- Paper labels remain **Test 01** through **Test 20**; no theme descriptors in the selector.
- Past attempts continue to reference their original immutable paper/version and matching audio files.

The exact genre sequence and immutable per-question slot windows are in
`curriculum/tcf-listening-20-paper-blueprint.json` (19 papers / 741 editorial slots).
Question contexts and themes vary by paper; themes are internal editorial guidance.
No slot may copy Test01 transcripts, artificially repeat a script with trivial
substitutions, or contain placeholders presented as a real exam question.

## Proposed 19 additional paper coverage

| Test | Theme cluster |
|---|---|
| 02 | Urban mobility and local transport |
| 03 | Healthcare and public services |
| 04 | Education and language learning |
| 05 | Housing and neighborhoods |
| 06 | Food and agriculture |
| 07 | Arts, museums and culture |
| 08 | Work and professional life |
| 09 | Technology and digital society |
| 10 | Climate and energy |
| 11 | Science and research |
| 12 | Travel and tourism |
| 13 | Sports and community recreation |
| 14 | Environment and biodiversity |
| 15 | Journalism and media literacy |
| 16 | Families and social life |
| 17 | Economy and small businesses |
| 18 | History and heritage |
| 19 | Civic life and public policy |
| 20 | International exchange |

Every test contains varied contexts **within** its own theme cluster, so no test
is exclusively a monologue or exclusively an interview.

## Status: development work, not 20 live exams

Current production Test01 v1 already has real recorded audio. The separately
authored Test01 v2 genre improvements are still pending audio production.
The 19 new banks are **not authored as complete recordings and questions yet**.
The 741 slots are detailed editorial briefs, not runnable tests. Do not show
Tests02–20 as available until each bank has genuine independent French content,
checked answer keys, and exact matching versioned MP3/SVG stimuli.

Publishing text-only banks or redirecting new tests to Test01 recordings would
violate the owner's requirements and create misleading exam results.

## Release implementation checklist

1. Author and independently edit the 19 complete original French question banks:
   39 transcribed stimuli, four plausible distinct choices, correct key,
   explanation and speaker-segment script per paper (741 items).
2. Produce and listen to 741 matching prerecorded French clips. Provide
   genuinely distinct voices for discussions with multiple participants.
   Produce images for visual Q1–4 (76 total) that agree with their recordings.
3. Apply `node scripts/check-tcf-listening-twenty.mjs --verify-release`.
   Ensure each new audio fits its original fixed question slot and all clocks
   total exactly 2100 seconds. Inspect real audio timing and pronunciation.
4. Create new immutable private Supabase paper versions and a published-paper
   selector; keep every previous attempt linked to its original paper.
   Update the authenticated listening RPC to accept *published* paper IDs,
   preserving ownership, entitlement, anti-tampering, Next/Submit and clocks.
   Do not expose unissued questions, answer keys or transcripts before marking.
5. Add a numbered 20-paper selector to existing TEF/TCF AI Tests; use the
   paper/version media directory (not the hard-coded v1 assets). Keep the same
   preflight, resume, audio recovery and results UI.
6. Add server tests for all 20 catalogue items, access, score, and immutability,
   and mobile/desktop browser tests for one-listen, timing, and history.
7. Review costs/licensing and use the existing release workflow: rollback
   rehearsal, safety snapshots, authenticated test, merge, publish, verify.
   No destructive migration or reset to existing data is permitted.

Official FEI format: https://www.france-education-international.fr/test/tcf-canada
Official sample item types: https://www.france-education-international.fr/test/exemples-epreuves-tcf
