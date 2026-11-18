# HZad TCF Reading — Manual editorial quality contract

## Scope
- Preserve all 20 unique topics/passage sequences; this phase focuses on **Tests 01–06**, all **Q25–Q39**.
- Q01–Q24 passages, stems and choice wording remain unchanged; Test 01 choice *positions* may be reshuffled because the previous exact ABCD repeating key was guessable.
- Retain 39 questions per paper, 60 minutes, 699 practice points, source-backed answers, saved student paper versions, user rights and immutable historical attempts.
- Do not add generative AI calls to student testing or an AI-review release requirement.

## Authoring
1. For each passage, identify the exact proposition the question tests and its source evidence.
2. Each wrong option must arise from a plausible confusion: actor, time, condition, causal direction, evidence vs inference, intention vs effect, scope or true-but-irrelevant detail.
3. Use comparable French fluency and roughly comparable specificity/length, without forcing identical lengths. Avoid absurd, unrelated and extreme options.
4. Make Q25–39 test careful comprehension or reasoning, including unstated implications **only when the inference is justified by the text**.
5. Read all four choices without the passage as an editorial sanity check. The intended answer should not be identifiable merely because the other options are bizarre, internally inconsistent, or categorically exaggerated.
6. Re-read the complete passage, question and options and identify why exactly one choice answers the question. Rewrite the stem/options if another reasonable interpretation would also work.
7. Ensure the correct answer is not copied verbatim from a conspicuous passage phrase.
8. Check explanation against the selected letter and quote or paraphrase the supporting evidence. If there is an answer-to-key mismatch, reject and repair immediately.
9. Check within-paper answer letter distribution **and sequential patterns** (not only counts). For example Test 01 previously had a completely predictable ABCD cycle.
10. Preserve existing content as versioned JSON. Never modify historical papers or in-progress attempts.

## Validation
- Use the current repository's `tests/tcf-reading-01-06-v5.test.mjs` and `tests/tcf-reading-v5-answer-alignment.test.mjs` to confirm paper structure and preserve the 90 reviewed answer meanings.
- Optional `scripts/check-tcf-reading-blind-heuristics.mjs` is only a deterministic surface-cue diagnostic. It is NOT a human or AI reader, nor a guarantee of actual exam difficulty.
- Run `npm test` and `npm run build`. Inspect the 90-row editorial log at `docs/tcf-reading-01-06-manual-review.md`.
- Changes must not be reported as live until the versioned backend publication and authenticated frontend read are both verified.

## Current editorial limitations
Question difficulty cannot be certified by wording inspection alone, and some original passages (particularly in Test 01) are short and straightforward. Distractor editing cannot completely substitute for deeper passage-level reasoning. The current audit is a careful editorial pass, not psychometric calibration or an official TCF equivalence.
