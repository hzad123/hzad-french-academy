# A0 learning rollout — not yet production ready

The live GoHighLevel loader points to GitHub Pages built from development.
The new learning work is on feature/a0-learning and does not deploy.

## Setup and safety
1. Review and execute supabase/migrations/20261029_academy_learning.sql in the Supabase SQL Editor as administrator. This creates separate learning tables and secure grading RPC; it does not modify the existing academy portal.
2. Verify academy_has_access returns false for signed-out, pending, revoked and expired accounts, and true only for verified active entitled accounts.
3. Author and publish lesson rows in academy_units using administrator credentials. No student-facing lesson rows are seeded by the migration.
4. Wire makeLearningStore to an authenticated, entitled student UI. Do not use the public static A0 demo for paid content.
5. Test cross-account isolation, grading, retries, and cross-device progress.
6. Split production and development hosting before merging; the existing live loader currently follows development.
7. Review production SQL function privileges and test against the exact current Supabase schema before enabling for students.

## Notes
- SQL function performs server-side scoring; client never writes scores directly.
- RLS protects published units and per-user progress. The database function checks entitlement again on every submission.
- The public feature-branch A0 demo contains three openly visible SAMPLE lessons and browser-only progress. Do not treat it as a secure paid academy.
- A full A0 syllabus, more question types, and content QA are still outstanding.
- The optional AI tutor is not implemented and incurs no AI API charges.
