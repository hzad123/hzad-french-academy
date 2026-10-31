# Bulk curriculum import (one-time setup)

Lessons live in version-controlled JSON batches in `curriculum/`. Run `node scripts/validate-curriculum.mjs curriculum/a0-batch-01.json` to check them locally.

## One-time GitHub setup
1. In GitHub repository Settings > Environments, create environment `curriculum-import`. For safety, add required reviewers and restrict deployment branches to `feature/a0-learning` (or the approved curriculum branch).
2. In Settings > Secrets and variables > Actions, create secrets `SUPABASE_URL` (the project's HTTPS URL) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase project's secret service-role API key). **Never put the key into chat, source files, screenshots or client JavaScript.** A database administrator should enter it directly in GitHub.
3. GitHub Actions > Import reviewed curriculum batch > Run workflow. Select the branch containing the reviewed JSON file, enter its path, and type `IMPORT`. Approve the environment gate if configured.
4. The workflow validates every lesson, refuses to modify published lessons, and imports the entire batch as unpublished. Publication is a separate explicit review action.

**Security:** The workflow uses a powerful Supabase key only on GitHub's server-side runner. Protect workflow changes and branches with review requirements; never run untrusted pull requests with this secret. GitHub workflows may need to be merged into the default branch before manual dispatch is available.

**Schema limitation:** Existing `academy_units.id` only supports two-digit lesson positions (e.g. `a0-01` to `a0-99`). For 100+ lessons in a single level, migrate that check constraint first. The current 300-lesson plan distributes lessons across seven levels, with no level exceeding 99.

**Safety:** The import refuses overwriting published lessons and never publishes a lesson. Editing an unpublished batch and re-running is supported. Preserve student progress by keeping lesson IDs stable.