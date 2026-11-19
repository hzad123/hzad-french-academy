import { createGithubOidcProxy } from './gateway.js';
// JWT validation is performed cryptographically against GitHub's trusted OIDC JWKS
// and locked to one repository, branch, workflow and triggering event.
Deno.serve(createGithubOidcProxy());
