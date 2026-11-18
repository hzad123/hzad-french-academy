# Listening Tests01–06: competitive alternatives and measured blind evaluation

Status: implementation and evaluation in progress. No new exam version has been
activated by this change. The live v4 review release is historical evidence of
partial improvement, not evidence that blind guessing passed.

## Observed defect

The v4 review authoring path deliberately permitted a grounded candidate after
two rewrites even when the blind reviewer still detected an obvious answer.
That exception was appropriate only to the prior explicit owner review request;
it is now retired from generation. Its229 retained warnings were never passes.
Long questions often selected a generic, responsible conclusion and opposed it
to three extreme or off-topic alternatives. Rephrasing those options preserved
the underlying giveaway.

A fresh independent baseline on the six live v4 papers (GitHub Actions run
43923458440,16November2026) guessed146/186 written answers correctly (78.5%).
The Q23–39 subgroup was89/102 (87.3%). These are actual provider responses,
not simulated results or the prior stored screening guesses. The initial
18-item contrastive pilot was rejected; no failed item was accepted.

## Shared authoring pipeline

`scripts/run-listening-answer-qc.mjs` now invokes the strict six-paper pipeline.
It selects the latest immutable bank for each of Tests01–06 and prepares the
next version. Old template generators and the historical review generator
cannot produce an accepted new release.

For each question the author must distinguish a specific recorded relationship:
role, cause/result, condition, chronology, proposal attribution or scope. Wrong
answers combine actual recorded ideas incorrectly. Long-item authoring plans
need at least two faithful source anchors for each distractor. Failed written
stems/options are withheld from the next author request to prevent cosmetic
rewrites around an inherently guessable focus. Rejection diagnostics remain
available to explain the defect.

The existing source situation, voices, genre, image, question number and slot
are checked against the source bank. Only the spoken question/alternatives
change; changed speech requires matching new media. Passing earlier items can
be retained. This protects the variety of the six source papers.

## Independent evaluations

Blind requests allow only `question` and four displayed `choices`. The request
contains no source, key, explanation, number, difficulty, author reasoning or
conversation history. Each is a new isolated provider conversation. Author,
grounding, blind and paper calls have separate receipts, exact input hashes,
model IDs, policy fingerprints, token usage and response IDs.

The primary blind reviewer is gpt-5.1. The earlier gpt-5-mini reviewer sometimes
invented context (for instance assuming a training session was on site), then
declared a credible alternative overwhelmingly likely. Primary screening now
uses the stronger model with the same strict thresholds. The original mini
model remains a second independent frozen experiment with its own accuracy
gate; changing reviewers cannot conceal a systematic shortcut on that model.
The primary reviewer assesses each alternative's credibility before guessing,
giving an ordinary possible recording context for each. This counters the
observed tendency to choose first, then invent unstated circumstances to justify
that choice. All four credibility checks must pass, alongside the unchanged
standout, clear-cue and probability rules. The mini experiment retains its
original prompt so its baseline and replacement measurements remain comparable.

The primary reviewer is calibrated on symmetric factual and qualitative
controls and an obvious wording giveaway. It must report honest guesses and uncertainty; it is never
instructed to miss a known key or force uniform probabilities. Any clear cue,
reported standout, probability above0.42 or first/second gap above0.15 rejects
the candidate. Q23–39 require three shuffled blind screens, Q9–22 two, and
Q1–8 one. A conspicuous wrong option also causes rejection.

The screens are also compared without access to the key. Q23–39 are rejected
if all three shuffled reviews still prefer the same claim, even when each
reviewer reports uncertainty. Earlier written items reject the same two-review
preference when both probabilities are at least0.35. This is a conservative
drafting filter for a stable wording preference, not an instruction to guess
randomly or deliberately miss. Both frozen experiments remain unchanged.

The key-free grounding reviewer then receives the recording transcript, actual
spoken options, and the image for visual questions. It must independently find
exactly one supported answer and give a specific plausible error plus faithful
evidence for each foil. Short reply items use the complete spoken recording.
The resulting French corrections remain ordinary deterministic exam feedback.

A complete-paper AI audit checks recurring key superiority, stem/option syntax,
qualifications, distractor designs and answer positions. Flagged items must be
rewritten and pass their full individual checks again. Keys are shuffled across
the whole paper, preserving already recorded early response positions, with
near-balanced totals and no predictable four-question decks.

## Frozen measurement and release gate

All234 questions are frozen before fresh held-out calls begin. No held-out guess
is given to the author, selected out, relabeled or reused as a screening result.
Content changes require a new cohort fingerprint and a fresh complete sample.
Every frozen experiment is retained. A failed held-out wording check is saved
as a rejected candidate for regeneration on the next authoring pass; the
author receives the observed cue, never the guess's correctness. A pure accuracy
failure cannot be rerolled by rerunning the unchanged cohort.
Separate results are reported for all234 items, the186 written-choice items,
and the102 late items. Q1–8 display answer labels while their alternatives are
spoken; their48 answers cannot establish the quality of written distractors.

Written and late groups each require at least100 observations, accuracy at most
32%, a Wilson95% interval containing25%, and a one-sided binomial p-value of at
least0.05 against above-chance accuracy. The all-item group must also pass. A
second frozen sample from gpt-5-mini must meet the same all/written/late accuracy
rules. Its raw confidence/cue observations remain available; primary per-item
admission is determined by the calibrated gpt-5.1 reviewer. A
successful cohort also needs no held-out clear cue and no significant longest,
shortest, qualifier or question-overlap attack at p<0.01. These are operational
acceptance rules for this model and sample, not proof of exact human25% accuracy.

The release checker recomputes every result from exact receipts and frozen
content rather than trusting an accepted boolean. It checks all six papers,
unique response IDs, source preservation, actual images, every audio/source
hash, measured duration and the unchanged12-second response window. Historical
banks, attempts, scoring, navigation, account access and credits are preserved.
The publication transaction protects and compares those records. No student
inference or wallet call is introduced; paid authoring remains private and
bounded by its existing task cost ledger.
The dedicated release CI recomputes these checks for the latest six immutable
banks and rejects partial or mixed-revision replacements.
The editorial pull-request gate requires those actual accepted replacements;
a code-only change cannot pass it. The full twenty-bank historical audit remains
available manually, including the withdrawn07–20 papers outside this release.

## Validation record

374 repository tests and the production build passed, including the mandatory
editor and persistent rejection checks. Fresh content evaluation is pending; this document does
not claim a passed held-out result, new live banks, or an applied database
migration. Record actual final measurements and deployment checks here before
calling the issue resolved.

Drafting now uses exact-schema responses, independently verified exemplars, and a single source-based answer axis. Drafting remains separate from all acceptance reviewers. The task ledger retains all earlier calls and reserved failed-call costs; its overall offline authoring ceiling is USD100. Student budgets and credits are unchanged.

A key-blind drafting editor receives only the stem and actual four alternatives, with no transcript, image, key, explanation or prior review. This edit is mandatory for every written-choice candidate, including an initially plausible one; the exact final wording must match an actual editor receipt. It removes stem clues and unequal phrasing before fresh independent admission reviews. Admission models, prompts and thresholds are unchanged, and every edited candidate needs new exact-input receipts. Identical wording and whitespace-only edits cannot trigger a fresh draw of a rejected candidate.

Library-wide style checks now trigger bounded regeneration before a frozen
experiment, including a separate late-question check. A significant shortest,
longest, qualifier or stem-overlap shortcut selects candidates by that observable
writing feature only. All four options are redesigned without padding or equal
length quotas, independently screened and grounded again, then the changed
paper is audited again. Held-out guesses play no part in candidate selection.
An unresolved style shortcut blocks measurement and publication.

Rejected wording is retained across authoring restarts. Changing whitespace,
capitalisation or the order of identical alternatives cannot obtain a new
blind draw for the same rejected item. The author must make a substantive
revision; the final frozen cohort also retains its original measurement nonce
unless actual content changes.

The completed editor run43968516419 passed184/234 individual questions and
rejected50. It did not reach the frozen benchmark. Its shortest-choice attack
still scored41.5/102 late items (40.7%), so that snapshot cannot be released.
Focused editorial prototypes preserve the original recordings and provide
ordinary alternatives based on specific source roles, measurements and
conditions. These are candidates only and must earn independent receipts.
