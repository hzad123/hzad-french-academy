# Owner-requested Listening Tests 01–06 v4

The owner explicitly instructed: **“make the 1 to6 new ones live now”**, after
being told that the full blind-guessing quality checks had not passed and the
active tests still used v1/v3. This authorizes a six-test review publication;
it does not turn failed quality results into passes.

The release uses new immutable v4 banks and separate media directories. Tests
07–20 stay withdrawn. Existing banks, completed results, unfinished attempts,
navigation, clocks, scoring, access rules and credit settings are preserved.

Each of the 234 revised items must have an independent transcript/image
evaluation supporting exactly one key and identifying three plausible wrong
interpretations. A separate blind evaluation sees only the question and four
choices. Its actual warnings remain in the evidence, including failed results.
No 25% held-out guessing claim is made for this review release.

`prepare-listening-01-06-live-review.mjs` authors candidates through the existing
private server-side authoring service. No provider key or privileged credential
is written into content, artifacts or browser code. Its existing bounded cost
ledger includes prior authoring expenditure. There is no student inference or
wallet change.

`render-listening-qc-media.py --owner-review` requires the exact six-test
authorization and all 234 independent grounding results, then checks the
evidence before recording. Changed spoken choices/questions receive matching
new complete recordings. Each historical slot keeps its 12-second response
window; recordings are neither truncated nor given a redistributed clock.

`check-listening-owner-review.mjs --media` verifies exact evidence, source
preservation, image agreement, every MP3/source hash and measured duration.
The full-quality renderer and its ordinary acceptance gates remain unchanged.

The publication transaction inserts only the six exact v4 banks and updates
their publication pointers. It rejects changes to existing v4 content and
asserts preservation of all historical banks, other publications, the exam RPC,
student attempts, navigation, accounts, entitlements, progress and AI records.
Rollback and repeat-publication tests use the real listening engine in PGlite.

Publication order: finish grounding, produce/verify media, run tests/build,
merge and verify the live assets, then activate the exact six banks. New test
starts use v4; historical attempts retain their original content and results.
