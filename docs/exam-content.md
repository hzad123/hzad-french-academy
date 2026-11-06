# Full mock content and reference guides

The owner approved the four-section full timed-test layout and asked to fill the tests. The audit found that all 158 objective questions and ten productive tasks were already authored server-side; the catalog exposed only their numbered outline before a paid test starts. This revision makes the actual material inspectable by the pinned academy owner and adds substantive completed-review teaching material.

## Content inventory

| Bank | Reading | Listening | Writing | Speaking |
| --- | --- | --- | --- | --- |
| TEF Canada Mock 01 | 40 questions, original passages, four choices, keys/rationales | 40 original scripts/questions, choices, keys/rationales | 2 full prompts + 2 model responses/checklists | 2 full prompts + 2 sample exchanges/checklists |
| TCF Canada Mock 01 | 39 questions, original passages, four choices, keys/rationales | 39 original scripts/questions, choices, keys/rationales | 3 full prompts + 3 model responses/checklists | 3 full prompts + 2 sample exchanges and 1 developed opinion example/checklists |

The five original writing models contain 149, 240, 97, 137 and 154 words respectively. They satisfy the TEF 80+/200+ minima and TCF 60–120/120–150/120–180 ranges. Every productive task now has required points, a sample response or exchange, task-specific explanations of effective choices, likely pitfalls and a targeted revision exercise. Oral samples demonstrate an approach/exchanges; they do not claim to be recordings lasting the entire speaking period. Fixed scenario facts remain consistent; unknown organiser details are referred for clarification rather than invented.

`supabase/exams/debriefs.js` is versioned supplementary teaching material. It does not replace the question bank, reset IDs, alter correct indices or add separately purchased practice. One ambiguous French phrase in a reading answer was clarified without changing its meaning/key. No listening script or voice changed; the existing 79 script hashes, including already-generated files, still match their seeded manifest.

## Access and delivery

The existing private audio-operator capability authorizes **Review TEF/TCF content**. The email/UUID is not copied into public code and a submitted owner identity cannot grant access. Every request checks the actual verified Auth user and database capability; academy entitlement is also checked. Ordinary students cannot call `content-review` or `content-audio` to obtain questions, keys, scripts or references before paid eligibility. No new capability grants or SQL migrations are needed.

For the owner, each catalog question/task opens its actual French passage/prompt, choices, correct answer, rationale and (for listening) original script. Productive tasks include criteria, interlocutor facts and the new model/revision guide. Ready audio can be played through a short-lived private URL; pending audio remains explicitly pending. The view is read-only administration: it creates no attempt, charges no credits, invokes no AI and does not mark content/audio approved or enable exams.

For students, active timed delivery still withholds keys, scripts and model responses. After a paid attempt completes, the task-specific model/revision guide appears with the saved review, without another charge. AI assessment receives the task checklist but not the fixed model response, so learner-specific corrections continue to rely on the learner’s evidence rather than copying a reference. Existing timers, ownership, credit reservations, course quizzes and progress are unchanged.

## Verification and remaining release work

All 147 Node tests pass, including exhaustive owner projection of all 168 items, unauthorized/forged-identity denial, audio eligibility, exact writing ranges, reference withholding during active delivery and existing regressions. Desktop/mobile fixture checks pass for actual reading/questions/rationales, model guides, ready/pending audio, owner-only controls, logout cleanup, absence of paid attempts/model calls and no overflow/JS errors. Full timed-test browser regression also passes. Browser and all Edge bundles build.

At the start of this revision, the live queue contained three ready TCF recordings, 76 pending files and no approved audio. This is a dated observation, not an automatic release sign-off. Remaining audio generation/listening review, independent editorial review, real examiner/feedback benchmarking and exact credit-price approval still gate student activation. No production credit price, student wallet, lesson content, progress, course entitlement or automatic audio-generation job is changed by this revision. The owner must continue generation from the protected setup tool; content inspection alone does not dispatch paid TTS.
