# TCF Listening 15–20: verified editorial baseline

Scope: existing v1 banks on `development`; six papers, 234 items. This is a **quality investigation, not a release approval**.

## Directly measured defects

- Each bank has 39 questions and a 2,100-second paper clock; answer slots retain at least 12 seconds after the recorded material.
- Among written-choice questions Q9–39, the correct answer is the longest by literal character count in **148 of 186** items (~79.6%). By test: 15=24, 16=25, 17=25, 18=26, 19=24, 20=24 out of 31.
- All 39 question stems occur **verbatim at the same question positions across all six papers**. The topics differ, but repeated question forms are a clear signal of a common content template, not independent authorship.
- Several advanced listening items use essentially the same argument pattern across exams, requiring manual transcript comparison and replacement, not merely answer-position balancing.
- Concrete French spoken-source grammar problems:
  - Test 15 Q25: « Ils affirment que financer des enquêtes approfondies et garder des équipes locales. » Grammatically incomplete after `que`.
  - Test 20 Q25: « Ils affirment que assurer la continuité du suivi après les premiers mois. » Ungrammatical and incomplete.
  Since these strings appear in the recorded source, **rewriting displayed options will not fix the audio**. Fix the actual passage and regenerate and validate the exact affected recordings.
- Existing source answer positions and transcripts have not been independently re-adjudicated. A copied source key must not be presented as newly verified semantic correctness.

## Nonpublishing implementation

- `scripts/audit-listening-15-20-baseline.mjs`: deterministic integrity and shortcut report.
- `scripts/release/prepare-listening-15-20-v2-draft.mjs`: source-preserving draft option generator, **not editorially certified**. This intentionally cannot publish or alter an existing bank.
- Both Actions workflows retain diagnostic artifacts but have no write permission or production activation step.

## Remaining release gates

1. Read and validate each of the 234 exact recordings/transcripts and every question's one supported answer.
2. Replace and rerecord malformed passages, including the two identified Q25 examples, without changing the student test clock or violating answer windows.
3. Remove conceptual repetition across the six papers; provide unrelated topics within each paper.
4. Rewrite Q9–39 alternatives with close, plausible distractors and equalize length and tone; ensure explanations actually distinguish the key from each wrong option.
5. Perform independent blind-only answer inference benchmarks plus separate key-free grounding review; verify no longest, shortest, hedging or positional shortcut.
6. Verify 234 audio clips, 24 images, hashes, time windows, all 234 keys and historical score preservation, then stage six immutable versions.
7. Publish only after deployment-byte integrity checks, transactional preservation checks, and post-commit catalog verification.

**Production remains unchanged:** Tests 15–20 have no entry in the active `academy_tcf_listening.published` registry at this checkpoint. Tests 1–14 are untouched.
