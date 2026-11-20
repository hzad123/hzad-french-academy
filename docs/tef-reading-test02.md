# TEF Reading Test 02 — original visual practice exam

## Content and exam flow
- Test ID `tef-reading-02`; immutable version `tef-reading-2026-11-original-02-v1`.
- Forty original French questions, 60-minute timer, four options each, one point per correct choice.
- Q1–7 visual notices and illustrated situations; Q8–11 single-gap language choices; Q12–17 paired cloze; Q18–19 four offer cards; Q20–22 four actual plotted graphs per question; Q23–32 five independent paired messages; Q33–40 four longer paired articles.
- Ten correct-answer positions each A/B/C/D. Distinct themes/passages compared with Test 01. End-only correction sheet uses existing private server-side grade function, with selected/correct choices and explanatory feedback.
- No AI charges or new pricing. Test results are raw practice points /40, not a calibrated official TEF or NCLC score.

## Release plan
1. `npm test` and `npm run build` on the feature PR; require successful Build and test workflow.
2. Check private `academy_tef_reading` schema/table, Test 01 immutable version, any existing attempts, and prior SQL function permissions.
3. Apply additive `supabase/migrations/20261119235500_tef_reading_test02.sql` to production only after tests pass. It adds the Test 02 paper and updates only the private-backed reading RPC's paper-choice validation, keeping auth, entitlement, ownership, row-lock, timer and grading semantics.
4. Verify both papers in the DB and unchanged Test 01 historical result rows. Merge PR to `development` and confirm GitHub Pages production build succeeds.
5. Verify TEF Canada → Reading has Tests 01 and 02; start/resume/submit 02 in an entitled test account on mobile and desktop. Do not disclose the answer bank on the client.

## Known quality limitation
Automated checks verify structural uniqueness, correct letter distribution, security/scoring and catalog compatibility. They do not replace independent human editorial review of every French distractor, the graph questions, or native mobile visual inspection.
