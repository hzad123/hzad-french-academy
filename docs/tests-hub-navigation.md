# TEF/TCF AI Tests dashboard entry

The owner’s first mock-test rebuild step is a navigation move:

- The main dashboard now has a permanent **TEF/TCF AI Tests** button after **AI Learning**.
- The TEF/TCF card/link is removed from AI Learning. That area retains its three pronunciation, conversation and writing trainers.
- The new tests area contains the existing TEF/TCF banks, question/task sections, content review and saved attempts.
- The former dashboard **Exam audio setup** button is removed. The same protected controls are reached through **TEF/TCF AI Tests → Audio setup**, visible only to the authorized owner. Audio setup has an explicit return to the tests area and participates in global Back navigation.

Dashboard loading no longer probes the private audio endpoint. Moving between areas uses the existing route reset, stopping stale rendering/recorders and retaining server-saved work. The audio view binds its local identity to the current session when opened, and clears on account changes/sign-out. The backend still performs its existing pinned-owner checks on every privileged request; this UI move grants no new permission.

There are no bank, question-ID, grading, pricing, credit, release-flag, storage, schema or Supabase function changes. No migration is needed and no paid generation is triggered by opening either area. Existing learner progress, attempts, wallet allowance and stored recordings are preserved.

Validation: 147 existing Node tests and the browser/Edge build pass. Desktop/mobile local fixture checks verify dashboard entry, no exam content in AI Learning, internal owner-only audio controls, Back/return navigation, preserved generation/review progress without duplicate calls, direct account-switch/sign-out clearing and no overflow or JavaScript errors. Existing full timed-test and content-review browser flows also pass. Providers, Auth and database are mocked in these browser checks; live inference/launch readiness is not asserted by this navigation change.
