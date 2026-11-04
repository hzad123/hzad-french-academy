# Rate v3 repair - 2026-11-03

Scope: A0 feature preview only. No SQL grants, entitlement rules, passwords, API keys, or server rate limits were changed. Existing v2 auth storage is retained.

## Changes
- Keep one SDK Auth session and use a separate sessionless database transport supplied with that session's current bearer token.
- Read the current token from synchronous Auth events; do not force a proactive refresh every time a question is selected.
- Remove duplicate getUser network calls from lesson mounting and access checks. Entitlement queries and every lesson/grading RPC still use the JWT and server-side access checks.
- Coalesce concurrent entitlement checks for the same token (10-second UI cache only).
- Respect HTTP 429 Retry-After; use a conservative 60-second cooldown when it is absent. Preserve cooldown metadata across reloads without storing keys or request bodies in diagnostics.
- Display a countdown and disable the affected controls, rather than encouraging repeat clicks or treating throttling as a logout.
- Save completed quizzes once per displayed attempt; never automatically retry the progress-write RPC.

## Validation actually performed
17 local Node tests passed, covering storage, session reuse/invalidation, concurrent requests, bearer headers, cooldowns, and safe origin handling.

An offline Chromium test used the Supabase SDK extracted from the deployed session-v2 artifact and mocked Auth/database responses. With 60-second test access tokens, the old full application made nine token requests, nine user requests, and nine entitlement requests during one sign-in sequence; the mocked server then returned 429. This reproduces a refresh-loop failure mode but does NOT establish the real project's configured JWT lifetime or device-clock state.

The replacement, using the same SDK and 60-second tokens, made one token request and no Auth /user requests while grading three questions, saving once, and closing/reopening lessons twice. Correct and incorrect explanations rendered. An injected grading 429 blocked 30 additional request attempts from reaching the mock server during cooldown, and grading resumed after Retry-After elapsed. All grading requests carried the mock student bearer token. No browser exceptions occurred.

These are simulated-server tests, not validation using a real student login. The real user's account and server rate-limit state still require live verification. Do not claim that an active server cooldown has been bypassed or reset.
