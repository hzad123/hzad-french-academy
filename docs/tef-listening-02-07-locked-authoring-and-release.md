# TEF Listening 02–07 — locked v3 authoring contract

## Exact current-release reference
Reference: `supabase/exams/tef-listening-test01-v3.json`, immutable published version `tef-listening-2026-11-test01-v3`.

For each new paper: 40 questions, 36 unique MP3 recordings, 2,400 seconds total, original 4-picture SVG panels, four paired question panels. The sequence is immutable:

| Q | Kind | Preview before playback | Official-style answer time | Clips |
| --- | --- | --- | --- | --- |
| 1–4 | picture | 5s | 10s | 4 |
| 5–8 | announcement | 10s | 10s | 4 |
| 9–12 | voicemail | 10s | 10s | 4 |
| 13–20 | street | 5s | 15s | 8 |
| 21–22 | radio | 10s | 15s | 2 |
| 23–28 | interview | 20s per two-question recording | 30s per two-question recording | 3 |
| 29–30 | report | 10s for paired recording | 15s for paired recording | 1 |
| 31–40 | document | 10s | 15s | 10 |

One playback per clip, autoplay after reading countdown, forward-only navigation; paired answers independent. Keep scoring by `academy_tef_listening.grade`; never expose answers in API responses before grading. Exam clock exactly 2,400 seconds INCLUDING audible MP3 lengths plus preview/answer windows; no silence padding, speed change, or synthetic response-time padding. Measure final MP3 with ffprobe. `ceil(audioSeconds + previewSeconds + answerSeconds)` allocation may add <2s codec rounding per clip. Reject a paper whose mandatory windows plus measured audio cannot fit 2,400 seconds.

Minimum oral MP3 lengths: questions 1–4 >=12s, 5–20 >=18s, 21–22 >=34s, paired interviews >=105s, paired report >=100s, Q31–40 >=30s. Target paired interviews 110–125s and report 105–120s; measured lengths, not claims about official fixed durations.

## Editorial gates — fail closed
1. Six papers have 240 authored questions, 216 distinct `audio` assets, 24 original nonreused four-choice pictures, 24 two-question panels. Every question has 4 grammatical options and exactly one answer supported.
2. Full independent transcript-first key audit for ALL 240 questions, with evidence spans and reviewer reasoning; preserve blind review separate from answer key.
3. Blind answer prediction without audio: if guessing without audio materially exceeds chance (25%) due to option phrasing, revise. Detect length, fluency, syntactic, extreme-word, hedge and generic reasonable-answer bias. Do not rely solely on a mechanical checker to certify semantics.
4. Advanced Q21–40: options must be audio-adjacent, distinct attribution/scope/condition/intent; no key disclosed by parallel paired question.
5. Originality: check all transcript and question overlaps against current v3 and all six new papers; reject repeated plots and paraphrases; vary register, speaker, discourse style and subject matter. No generic speech-padding or templated paragraphs.
6. Measure bytes/hashes of every MP3 and transcript source segments; each package must include 43 hosted files (36 recordings + 1 audio-check + 4 SVG + 1 manifest + 1 license note). All images new, not copied from Test 01.
7. Enforce 10 each A/B/C/D across each complete paper, but avoid answer patterns and do not choose a correct option based on word length.
8. Verify secure version-allowlisted catalog/start, history immutability, ownership checks, RLS, forward-only state transitions, grade and timeouts; no publication if regression tests fail.
9. Stage media before DB. Confirm GitHub Pages exact deployed SHA and hosted file hashes per version; only then apply one immutable migration that publishes fully verified 02–07 versions.

**Publication status:** This is an authoring contract, not evidence that any of the six papers is complete. Do not publish outlines, placeholder questions, machine-repeated dialogue or unreviewed audio.
