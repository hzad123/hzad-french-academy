# Release gate: TCF Reading Tests 01 and 05

This release branch contains only two immutable editorial v4 question banks for publication alongside the existing 18 v3 banks.

Its GitHub Actions workflow first runs the full Node test suite and production build, then rehearses the protected migration with rollback and preservation hashes. The guarded production release inserts the new frozen paper versions and switches only two published-paper pointers. The old answers, in-progress attempts, completed results, and other 18 papers remain stored unchanged.

Publication is only considered complete after the Actions backend verification succeeds. Review: https://github.com/hzad123/hzad-french-academy/pull/62
