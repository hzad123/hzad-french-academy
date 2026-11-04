# Session v2 repair

Scope: feature/a0-learning preview only. No SQL grants, paid-access rules, credentials, or user data were changed.

## Changes
- One Supabase client per academy scope in each page.
- Preview and portal use separate versioned auth storage keys rather than the legacy shared default key.
- SDK storage is mirrored in memory; unavailable or unexpectedly missing backing storage does not discard an active in-page session. Explicit SDK sign-out and cross-tab storage events still clear it.
- Every REST request is gated on a student session and explicitly receives that session's bearer token; requests never fall back to anonymous identity.
- Removed the nested A0 sign-in form. Missing sessions return to the single main sign-in screen.
- Transient errors are not labeled as an expired session. Sign-out uses local scope.
- Footer identifies the build as session-v2-20261103.

## Validation performed
Eight local Node tests pass, covering storage loss/exceptions, sign-out, concurrent session requests, authorization headers, missing-session rejection, and singleton/scope behavior.

A local Chromium test used the SDK and UI from the downloaded GitHub Pages artifact with mocked Auth/database responses (no real student credentials). Clearing the backing storage reproduced the previous nested sign-in screen. With this patch, wrong and correct choices displayed their explanations, two close/reopen cycles succeeded, every protected REST call used the mock student token, and only one sign-in request occurred.

This reproduces and fixes a storage-loss failure mode; it does not prove why the real user's original browser lost its session. Live authenticated verification is still required. Never describe these mocked tests as production end-to-end validation.
