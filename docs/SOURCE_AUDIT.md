# Imported working GHL portal: source audit

The uploaded working portal has been reviewed. It uses Supabase JS v2, a publishable key, an email-confirmed login, a read-only entitlement check, and seven preview cards (A0-C2).

## Known gaps before production
- Password-reset emails are supported, but the PASSWORD_RECOVERY handler explicitly does not implement password update.
- Entitlement query checks status, verified_at, access start/end and product code, but must not be used as the only protection for paid lesson data. Verify server-side RLS and table grants.
- Seven course cards are static previews, not curriculum content.
- The logo is currently a placeholder letter H.
- WordPress purchase webhook and refund/revocation synchronization are not implemented.
- Do not place service-role keys or OpenAI secrets in client JavaScript.

## Migration status
Initial config, entitlement-check and course-card modules have been extracted on the development branch. The full existing UI is still running in GoHighLevel; no deployment switch has occurred. Next: extract UI, styling and authentication flows and run browser regression tests.
