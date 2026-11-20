# TEF Reading six-paper quality and routing release — 20 November 2026

## Confirmed cause, not speculation
Two private, pre-authored paper banks existed in Supabase. For the five owner-identified question numbers (8, 14, 22, 29, 39), the live Test 01 vs Test 02 bank query showed different passages, stems, four options, and graph data where applicable. No runtime TEF Reading AI generator, model seed, prompt cache, or fallback bank was found in the TEF Reading start path. A `unique(user_id) where status='active'` index and an unfiltered `select ... where user_id=u and status='active'` let a student request one test but silently resume a different active test, falsely making independently selected tests appear identical.

## Fix
- Preserve the original published Test01 and Test02 `v1` versions and every historical attempt/result. New current versions `v2` improve the reading banks; Tests03–06 are independent `v1` papers.
- An isolated `current_papers` map exposes exactly one current version for each numbered Test01–06, while reads of older saved attempts continue to load their original version.
- Active-attempt ownership is now indexed by `(user_id,test_id,version)`; the RPC looks up only the requested paper/version. The frontend also refuses a mismatched returned paper.
- Every new paper has 40 questions, 60-minute limit, 4 choices, original SVG illustrated notices, 4-card job matching, 12 line plots, paired notices, and longer advanced passages. Regular marking remains deterministic and **no extra AI credits** are consumed.
- Every paired-cloze Q12–17 keeps *both* blanks unfilled across its paired questions to avoid answer leakage.
- Late distractors were revised to use source-related, plausible alternatives, avoiding the formerly impossible or unrelated choices.

## Persistent editorial and publication guardrails
- `scripts/lib/tef-reading-quality.mjs` compares all 240 questions across *different test numbers*, not only matching question slots. It detects exact and near-matching passages/stems/options, token trigrams, declared semantic concept/evidence, identical offer cards, and scaled/shifted graph curves (each individual graph line).
- A PostgreSQL `before insert/update` trigger independently blocks direct insertion of exact duplicate passage, repeated answer question, repeated semantic intent label, or identical raw graph set across paper IDs. It prevents altering an existing published version. The private scoring and entitlement RPC is preserved.
- New content generator integrations must call `generateDistinct()`: provide an already reviewed candidate plus `semantic.concept` and `semantic.evidence`, and if rejected supply a fresh candidate. After the configured maximum retries, publication fails closed. There is **no existing live AI generator to hook up to**; the six current papers are human-authored static/versioned sources, not AI-generated afresh for each attempt. This is an authoring-time adapter, not an autonomous AI-writing service.
- `tests/tef-reading-six-quality.test.mjs` enforces six-paper global duplicate quality, exact key-balanced distribution, hidden paired-cloze hints, unique plotted answer per graph question, length-only answer guessing, semantic retry behavior.
- `tests/tef-reading.test.mjs` tests six current catalog entries, each selected attempt returns the requested ID/version, six concurrent paper attempts for one authenticated user, old v1 attempts preserved, answer key private before submission, cross-account denial, perfect 40/40 server grade, and Postgres duplicate rejection.

## Quality measurements and limitations
- The new late-section correct option (Q23–40, 108 questions total) is the uniquely longest answer in only 11 questions, down from the earlier 35 before distractor correction. The six-paper gate will fail if longest-answer leakage rises substantially.
- Numeric and scale-rescaled duplicate line graphs are rejected even if graph labels/units/years differ; six repeated curve shapes were identified and replaced during review.
- Semantic annotations + lexical comparisons catch many paraphrases and swaps, but no automated system can *guarantee* detection of every conceptually similar rewritten question. Independent human review remains necessary for subtle semantic overlap and double-defensible answers; source-based grading is verified separately.
- Original exam-like practice results show raw points /40, not an officially calibrated TEF/CLB/NCLC equivalent.

## Deployment checklist
1. Run `npm test`, `npm run build`, all relevant GitHub Actions checks.
2. Apply additive `supabase/migrations/20261120173000_tef_reading_stable_current_catalog.sql` then `supabase/migrations/20261120230000_tef_reading_six_papers.sql` on the verified HZad French Academy project.
3. Verify six current paper IDs and 240 current questions; verify Test01/Test02 v1 preserved, old attempts unchanged, and secured RLS/EXECUTE. Check Supabase security advisors.
4. Merge PR to `development` only on passing checks, confirm Pages deployment of same commit. Check actual GHL test selector and sample mobile display when an entitled account is available. Record any unverified native-browser checks as such.

## Rollback
Repoint `academy_tef_reading.current_papers` IDs 01/02 to their immutable original v1 versions; remove current mappings for 03–06 to hide them. Do **not** delete banks or attempts (their saved history requires the original version). Reverting frontend and RPC code should be planned carefully because the old single-active index behavior was incorrect and should not be restored.
