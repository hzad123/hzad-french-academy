# Safe migration checklist

1. Export and back up the exact working GoHighLevel Custom HTML code.
2. Audit Supabase policies, table grants and entitlement status/date checks.
3. Reproduce existing login, email verification and A0-C2 dashboard in modular source.
4. Test authenticated, pending, expired and revoked accounts; verify no protected lesson data leaks.
5. Set up build and preview deployment on a separate URL.
6. Test on mobile and desktop, including Supabase redirect URLs.
7. Install a small versioned loader in GoHighLevel only after approval; retain rollback copy.

WordPress payment webhook is not implemented. Manual test access must remain administrator-only.
