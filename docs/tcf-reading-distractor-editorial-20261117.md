# TCF Reading distractor editorial review — 17 November 2026

## Scope and source of truth
- **Source branch:** `development`, not `main`.
- **Current display versions:** Test 01 (`tcf-reading-2026-11-pdf-v1`), Tests 02–20 (`tcf-reading-2026-11-reference-v3`).
- **Historical v2 papers are immutable.** The 19 v3 papers expand per-question passage lengths. Do not edit the v2/v3 JSON files or historical migration contents in place.
- The authoritative papers/answer keys and completed attempts are stored in a **private Supabase schema in the French Academy project**. The only connected Supabase instance observed in this session belonged to *HZad Talk*, not the Academy; do not deploy or query Academy data through that project.
- The editor's goal is meaningful comprehension with one defensible answer; difficulty should come from text-supported inferences, competing reasons and nuanced qualifications, **not** obscure words, arbitrary lengthening, or deceptive ambiguity.

## Findings from source audit
The 20 current papers contain 780 questions. Their initial answer-key positions are:
`A=186, B=198, C=203, D=193`. However, the 39-question Test 01 had `A=0, B=13, C=18, D=8`.
Across the current bank, a correct answer was tied for **longest** in **416/780** cases, and tied for shortest in 90/780. These are *diagnostics*, not proof of guessing accuracy.
A two-signal content heuristic flagged **221** questions for prioritised review (a warning threshold, not a complete editorial judgment). It looks for unrelated lexical content, extreme incorrect alternatives and correct-answer length cues. A distinct earlier, looser diagnostic had flagged 292 items. Neither number proves which questions are semantically wrong.
- Test 05 Q09, original distractors: “Le jeter dans une poubelle”, “Le conserver comme souvenir”, “Acheter un second billet”. This fails the no-passage plausibility test.
- Test 05 Q37, original distractors: “Les saisons n'influencent jamais la rivière”, “Aucune observation ne peut être réalisée”, “Les financeurs doivent décider sans information”. These distractors are implausible and visibly overstate the passage.
- Other weak examples occur in Test 01 Q01, Q06, Q08, Q09 and Q29; and numerous Tests 02–20.

## Changes in this isolated branch
- `scripts/audit-tcf-reading-quality.mjs`: read-only structural and heuristic full-bank check, optional no-passage/no-key blind-review export, optional strict diagnostics. **No automatic approval**.
- `supabase/exams/tcf-reading-v4/test-01.json`: separate candidate for Test 01; 27 sets of answer alternatives rewritten and all 39 correct-answer positions rebalanced while retaining the same question numbers, passages, point values, correct meanings and scoring logic.
- `supabase/exams/tcf-reading-v4/test-05.json`: separate candidate for Test 05; all 39 answer-option sets rewritten, including the deposit and ecological-restoration examples. Source passages, question numbers, point values, and correct positions retained.
- **Remaining 18 test candidates have not been authored or reviewed.** Do not claim the bank is completed or production-ready.

## Mandatory per-question editorial acceptance (all 780 items)
1. Verify French syntax, relevance, and literal source support for the keyed answer. A source passage must support *only one* option in the intended reading of the question.
2. Give each wrong choice a plausible, **specific text-supported error mechanism**: confused actor, timing, reason/result, scope, condition, proposal versus accepted action, true-but-does-not-answer, or overgeneralised inference.
3. Each question must contain at least two competitive wrong alternatives, reasonably comparable to the correct answer in grammatical form, specificity and length. Reject unrelated/absurd distractors.
4. For Q01–10, use simple but genuinely competing everyday options. For Q11–29, test details, conditions, paraphrases and contrasts. For Q30–39, test qualifying evidence, motive, author stance, cause/consequence, scope and implied conclusion without creating multiple defensible answers.
5. Blind check: give an independent evaluator **only the prompt and four options**, no passage, key or explanation; vary display ordering three times. Record predictions, confidence and stated cue. If guesses can be made by absurd options/grammar/length, revise. Then provide the passage to an *independent* reviewer to verify one answer, proof and plausible misreadings.
6. Correct-answer key must not be systematically longest/most specific or appear at a predictable letter position. Check distribution **within every paper**, including Test 01.
7. Compare passage genres, question skill and progression with authentic FEI TCF Canada public examples. Do not copy protected examples into the HZad bank.
8. Update answer explanation to explain why the keyed option is correct and why the strongest nearby distractor is not. Remove generic “the passage says ... this justifies ...” filler.
9. Reject accidental repeated passages/scenarios. Preserve the declared 39 questions, 4 options, progressive bands, 60 minutes and 699 practice points per paper.
10. Record per-item pass/fail and independent second-reviewer signoff. No deployment while any current paper is incomplete.

## Deployment plan — blocked pending completion and review
1. Complete 20 v4 JSON banks (Test 01 and Tests 02–20), run independent editorial/blind review, and obtain no-passage guessing rates with proper controls rather than claiming chance-level results without a trial.
2. Create **one additive, versioned** migration that inserts new `academy_tcf_reading.papers` content with `v4` versions **without overwriting historical versions**; update `published_papers` only after all 20 v4 papers pass acceptance.
3. Test with rollback rehearsals and compare hashes/counts for auth, entitlements, wallets, attempts, old papers and scores. Validate `catalog`, `start`, `answer`, `submit`, resume, completed review, expired timer, and cross-account access.
4. Verify policy privileges and RLS remain unchanged; backend scoring stays private and deterministic. Attempts already in progress must keep their original frozen version.
5. Run `npm test`, `npm run build` and browser/mobile checks. Confirm actual Academy Supabase project is accessible (not the Talk project); apply migration through its authorised release pipeline.
6. Open/finish PR against `development`; after successful complete checks and approval under the standing publication rules, merge and verify GitHub Pages and a real entitled GHL session.

## Current state
**Partial candidate only, NOT published.** No production data, schema, scoring, UI, navigation or saved attempts were modified. No AI blind trials or full suite were run in this environment.
