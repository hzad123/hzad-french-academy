# HZad TCF Reading: Question authoring and acceptance contract (Tests 01–06; reusable for other tests)

## Never change the exam engine
- Keep one immutable source passage per question and preserve topic variation (all 39 questions), current level progression, 60-minute timer, four choices, exactly one source-supported correct answer, existing practice point bands (699 aggregate), student progress and stored historical paper versions.
- Do **not** regenerate passages merely to inflate their length or copy official examples.
- These are original practice questions inspired by [FEI TCF sample materials](https://www.france-education-international.fr/test/exemples-epreuves-tcf), not official calibrated TCF tests.
- Editorial content is stored as private versioned paper JSON on the server. No student-facing live model generation or answer-key exposure.

## Authoring rules
**Q01–Q10:** everyday notices/actions. The correct choice should require reading, but the action can be directly stated. Use believable nearby alternatives: wrong time, participant, destination, eligibility or condition.

**Q11–Q24:** details, relations, procedural implications. Create incorrect answers from adjacent true details, mistaken actor/motive, narrow versus broad scope, sequence and prerequisites. Never rely on absurd options to achieve 1-of-4 certainty.

**Q25–Q39:** infer a constraint, author intention, evidence requirement, assumption, implication or causal relation. All four choices must form a plausible set that a proficient reader could consider before reading. At least two incorrect answers should have a concrete relation to the text. Some may state true details that do **not** answer the precise question. Incorrect choices must be unsupported by the passage in the requested sense, not just clumsily phrased.

### Candidate generation procedure (author/editor)
1. Read the original passage, identify the single skill/insight being tested and write the correct interpretation in concise French without copying its key sentence.
2. Identify **three different errors a serious student might make**:
   - confuse means with ultimate objective;
   - overgeneralize from a specific example;
   - confuse a possible/conditional outcome with a demonstrated result;
   - mistake an accompanying benefit for the primary argument;
   - swap chronology, agent or causal direction;
   - assume one indicator captures a larger system;
   - answer a related but different question.
3. Write parallel, naturally phrased alternatives; vary length but do not systematically make the correct one longer, more precise or more balanced.
4. Independently read each option alongside the passage. If two options could reasonably satisfy the question, **rewrite the stem or alternatives**.
5. Record a short rationale: which source evidence supports the key and why the strongest near-miss fails.
6. Save revised content to a **new immutable paper version**. Never replace historical versions of active/completed attempts.

## Mandatory independent acceptance
- **First reviewer:** a separate AI call with **only the question and shuffled A/B/C/D options**, three randomized permutations. Do not include passage, key, original text, explanation, passage word count, author notes, or previous blind attempts. If it guesses the author key with confidence from style, elimination or logic, **reject**.
- **Second reviewer:** a separate AI call with passage, stem and alternatives but **no author key**. Require a single defensible interpretation, quote evidence, and an explanation of each realistic but false answer. Mark multiple-correct, insufficient-evidence, and implausible distractors as **fail**.
- **After** both reviewers finish, compare to the author key. Do not let either reviewer receive the key before its assessment.
- Use the protected workflow `.github/workflows/tcf-reading-independent-review.yml` (sample covers Q30/Q37/Q39 in Tests 01–06; **full** checks all 90 Q25–39).
- On any failure, revise **only failed candidate questions**, then run both checks again; keep all other published content unchanged.
- If the separate reviewer credential is absent, the review **fails closed**. A deterministic options-only heuristic does not count as an AI blind test. No candidate can become current without a successful full gate.
- CI also checks the exact paper structure, source-passage immutability, question counts, answer-letter balance, and manually reviewed semantic-answer anchors.

## Release after independent acceptance
Run npm tests/build and mobile/desktop GHL checks. Insert the six new v5 paper versions into the **Academy** Supabase project with an additive reviewed migration; update only publication pointers for Tests 01–06. Preserve all old paper versions and attempts, exact scores/history and the other 14 tests. Do not use the HZad Talk Supabase project.
