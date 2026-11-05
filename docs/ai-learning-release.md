# AI Learning publication status

The owner authorized publication, supplied the server-side secret named `OPENAI_API_KEYfrench`, and changed the included AI provider-cost allowance to **CAD $10 per student**, followed by paid credit top-ups. This supersedes earlier CAD $15 planning figures. The included period remains six months; no automatic charge to a student is introduced.

## Installed backend

- Migration `20261105001000_ai_learning.sql` is installed and recorded in Supabase migration history. It adds only the private AI schema and AI RPCs; it does not update existing lesson/progress rows. Both the local isolated database tests and a rolled-back production DDL/grant check passed before installation.
- The `academy-ai` Edge Function is deployed. Gateway JWT verification remains **enabled**, and the handler independently verifies identity with Supabase Auth before performing user work. The custom French secret is preferred, with the standard `OPENAI_API_KEY` name retained as fallback. No key value was read or printed during publication.
- An unauthenticated GET returns HTTP 401. The academy's CORS preflight returns HTTP 204 with the expected origin and authorization headers.
- Included policy caps cannot exceed CAD $10. Paid top-ups have separate verified-payment records, idempotent receipt references, and server-only reconciliation. Students/anonymous callers cannot grant credit, alter policy or read private wallet tables. A hosted checkout link can be configured in `academy_ai.policy.topup_url`; none is configured in this release. Payments require academy verification before a top-up is reconciled.
- Before and after installation: 392 lesson rows and five progress rows. Existing student progress was not updated. No Auth user, entitlement, student quiz attempt, live AI request or paid-credit grant was created by this publication.
- The temporary service-only diagnostic function was removed. Only the intended `academy-ai` function remains.
- The separate maintenance migration `20261105001100_ai_maintenance.sql` is prepared but **unapplied**. Automatic approval review rejected activating recurring refunds/content deletion without explicit approval of its scope. No cron job or retention automation was created. Until scheduling is approved, content is hidden from the normal history after 90 days but is not automatically purged.

## Activation gate

Inference remains **paused** (`academy_ai.policy.enabled=false`); activity models/prices and credit allocation have not been activated. The website may display the AI studio while model calls remain unavailable.

Automatic approval review rejected fetching/using a project service-role credential for live deployment testing because that credential has broad privileges. No alternative route was used to obtain it. Real provider-key validity, model availability and live inference have therefore not been tested. Explicit approval for the bounded privileged release check is still needed before proceeding with that check and AI activation. Approval is also needed to activate the AI-only maintenance job (five-minute schedule; stale-hold refunds after 15 minutes; feedback/conversation content removal after 90 days). The earlier proposed deployment with gateway JWT verification disabled was rejected too; the safer deployment keeps verification enabled.

The owner's CAD $10 rule is recorded and enforced by the schema. Final activity credit settings, model behavior, provider cost ceilings, maintenance scheduling and paid checkout must be reviewed/configured before student inference is switched on. A paid top-up must correspond to an independently verified receipt; student payment claims alone must never grant access or credits.

## Validation

107 local tests pass, covering Auth/ownership, retry safety, custom secret selection, gateway policy, isolated migration, the CAD $10 cap, verified paid top-ups, ledger/budget limits, retention and existing education features. The production frontend build and the actual Edge Function bundle compile. AI studio browser acceptance uses native microphone capture and a mocked provider/backend; mobile and desktop checks cover the trainers, same-ID response recovery, resumed conversations, Back/microphone cleanup, the CAD $10 display and top-up behavior. This does not establish live provider billing or inference quality.
