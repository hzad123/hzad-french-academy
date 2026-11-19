# TCF Listening Tests 01–06 — owner-authorized v5 release

## Authorization and limits

On 19 November 2026, the owner said: **“just publish everything. its good enough”** after explicit disclosure that the replacement v5 candidates still failed some of the strict blind-guessing/adversarial quality criteria.

This is authorization to **waive the optional blind-answer guessability threshold**, not authorization to deploy a mismatched clip, fabricated answer key, unsupported image, incomplete question, changed timer, modified wallet, deleted historical attempt or missing student access guard. The strict blind reviewer and original strict pipeline are preserved as separate ongoing content-quality tools.

## Release selection

The generator `scripts/release/prepare-listening-owner-waiver-v5.mjs` reads:
- The six currently deployed, immutable v4 banks.
- Their historical 234 individually source-grounded owner-review receipts.
- The latest v5 independent editorial evidence in `curriculum/tcf-listening-contrast-v2-source/testXX/q-N.json`.

Only written questions (Q9–39) that already passed their actual source-independent grounding review and match their original v4 source hash are replaced with their revised v5 content. Every failed, blocked, missing or rejected item uses its **existing independently grounded deployed v4 question** unchanged. Early visual and short-spoken Q1–8 deliberately retain proven v4 recordings.

No rejected answer is treated as a pass; no earlier accepted question is regenerated. The six banks remain 39 questions and 2,100 seconds each, with the same individual question slots, images, student mechanics, scoring and historical attempts.

## Mandatory mechanical and grounding checks

`scripts/check-listening-owner-waiver-v5.mjs` independently recomputes historical v4 grounding, all accepted v5 real reviewer receipts, correct keys and hashes, complete six-paper provenance, stimulus identity and question slots. Its `--media` mode also verifies every real rendered MP3's segment hash, SHA-256, actual ffprobe duration and minimum 12 seconds for answering, plus original image bytes.

The offline pinned French Piper renderer `scripts/render-listening-qc-media.py --owner-waiver` regenerates full audio **only where the spoken question or choices changed**. Every unchanged recording is copied from deployed v4. No audio is truncated to fit a new slot; overlong speech must fail the build.

This route **does not** assert that all revised answers are blind-resistant or that any frozen statistical benchmark passed. It explicitly reports the owner's waiver instead.

## Publication workflow and operational gates

1. `.github/workflows/listening-owner-waiver-v5.yml` builds the six exact immutable banks, independently checks the keys, renders and verifies all 234 recordings, runs repository build/tests and commits all v5 media and evidence onto PR #52's review branch. This action alone **does not** publish.
2. `.github/workflows/listening-owner-waiver-v5-migration.yml` waits for those six actual media files and builds the owner-waiver publication SQL via the Supabase CLI and `scripts/release/listening-owner-waiver-v5.mjs`, including the normal protection and rollback assertions for other bank versions, TEF attempts, students, account access, progress, scoring and wallets.
3. Review and merge the complete release to `development`; the site deployment must serve that exact commit, including all newly generated recordings.
4. `.github/workflows/listening-owner-waiver-v5-hosted.yml` runs `scripts/release/check-listening-owner-waiver-hosted.py`, verifying that **all 271 hosted assets exactly match** their approved GitHub source bytes.
5. **Only after the hosted-media check passes** apply the reviewed migration transaction in the connected Supabase project `ogntvgvzmjrnppcullsj`, without replacing old bank versions or changing existing student attempts. If the transaction rejects any preservation check, do not bypass it.
6. Query `academy_tcf_listening.published` directly and require Test01–06 all point to `tcf-listening-2026-11-testXX-v5`, each containing 39 questions and a total of 2,100 seconds. Verify other catalog entries and prior attempts stay untouched.

## Not a publication receipt

A green media compilation, migration file, PR merge or deployment by itself is **not** proof of a live database release. Mark the owner request completed only after a successful preservation-checked migration and live Supabase catalog verification. If any automation or tool encounters a hard blocker, keep the published v4 tests unchanged and state that limitation explicitly.
