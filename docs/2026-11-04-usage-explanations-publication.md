# 2026-11-04 Supabase content-only explanation revision

Project: HZad French Academy / `ogntvgvzmjrnppcullsj`

## Publication result (verified)

- 362 published A1–C2 lesson rows updated in place; no lesson IDs or publication state changed.
- 1,810 `Related transfer phrase from the...` placeholders replaced using 441 sentence-specific note mappings in `curriculum/explanations/{a1,a2,b1,b2,c1,c2}-specific.json`.
- 362 generic independent-use prompts replaced with lesson-specific practice instructions informed by the lesson's objective, core French example and core usage.
- 356 repeated short-reading prompts replaced with lesson-specific reading guidance using the exact first core expression and grammatical focus.
- All 2,528 targeted placeholders were confirmed absent after publication.
- All six levels retain their original quiz arrays (ten questions per lesson); 392 units remain published; student progress was not changed.
- Existing six extended readings from the earlier content release were retained.
- Automated GitHub tests passed for the note bank before publication.

## Rollback snapshots

Each changed lesson's existing `content` JSONB holds two backups:
- `usage_notes_backup_20261104.sections`: sections before replacing the first 1,810 placeholders.
- `practice_usage_backup_20261104.sections`: sections after the first replacement but before replacing the extra 718 prompts.

**Do not blindly restore these snapshots after future editing.** Restoring an entire `sections` value would discard subsequent lesson changes. First compare current section content with the snapshot and perform a scoped, reviewed rollback of only the affected `usage` fields in a transaction. Backups intentionally do not change `quiz`, `academy_learning_progress`, `purchase_entitlements`, or Supabase Auth.

## Known editorial follow-ups

Some original French example strings contain accent/spelling mistakes, and the revisions have not received a complete independent language-editor review. They were deliberately **not** changed in this operation, because course quiz options and text-to-speech inputs can depend on those strings. Track spelling corrections and quiz alignment as a separate reviewed release.

The GitHub branch is for reproducibility and tests; the Supabase content corrections were published through the connected Supabase administrator tool without needing a frontend deploy.
