# TEF Speaking implementation audit (17 November 2026)

## Reference and limits
- User's supplied specification: 20 tests, Section A 5 min / around 10 candidate questions about a notice or service; Section B 10 min / candidate persuades a hesitant friend. Forty distinct subjects, French-only student prompts and examiner replies, interactive voice, persistent progress and two feedback stages.
- No separate *TEF Speaking Test 5* PDF or literal paper was discoverable in attached/chat Library files at implementation time. The available attachment was *TEF Test 5 Writing_.pdf*. We therefore follow the supplied two-section specification, cross-checked against Le français des affaires TEF Canada Section A/B descriptions, and make NO claim to reproduce unseen Test 5 wording.
- Official TEF is a 15-minute in-person speaking test. This is an original AI practice simulation, **not** an official score.

## Actual TCF Speaking code inspected
- `src/exams/tcf-speaking/{ui,recorder,store}.js`
- `supabase/functions/academy-tcf-speaking/{handler,provider,bank,test,index.ts}`
- `supabase/migrations/20261112002400_tcf_speaking_test01.sql`, `20261112002600_speaking_final_upload_grace.sql`, `20261112002800_continuous_speaking_monologue.sql`, `20261112203619_speaking_twenty_papers.sql`, related tests.
- Historical fixes in migrations: a final-audio upload grace period; one uninterrupted 270s Task 3 monologue; 20 paper identity and immutability; automatic reconciliation of pending wallet requests with bounded deadline extensions.
- Stable components worth reusing: WAV/PCM recorder with voice-activity energy threshold, microphone preparation, request idempotency, access verification, secure wallet reservation/claim/finish/refund, server deadline, avoiding duplicate uploads, persisted transcripts and acoustic observations.
- Design limitation (not necessarily a reported user bug): TCF's `submit(true)` advances the task rather than keeping a TEF-style sustained roleplay, so not reusable as-is.
- Design limitation: browser `speechSynthesis` uses `fr-CA` but does not explicitly select a French voice or offer a meaningful visible fallback when unavailable.
- Design limitation: `academy_tcf_speaking.calls` stores results/transcripts but not the actual WAV; the TEF implementation must use private server-controlled storage and authorized retrieval.
- Risk: microphone permission denial, context suspension, silent/very short WAV, timeout mid-upload, and network failure can lead to misleading UI states. TEF will expose a retry path without counting silence as speech or charging twice for the same request.
- Risk: TCF's 30s bursts and fixed browser timers are not sufficient for a continuous 5/10-minute TEF roleplay; TEF will use server-owned phase deadlines and multiple capped turns, with no AI examiner interruptions during recording.
- Risk: a model may hallucinate transcript details or unsupported pronunciation observations. TEF feedback will use saved turn IDs and explicitly report when audio-based assessment is unreliable; no score or corrections will be fabricated.
- Risk: model output can exceed format bounds (proven production TEF Writing `FEEDBACK_BOUNDS` incident). TEF Speaking validation will trim descriptive text and drop invalid corrections rather than charge and fail for presentation-length errors, without weakening evidence verification.

## TEF design decisions
- New namespaced `academy_tef_speaking` schema and Edge Function; no edits to `academy_tcf_speaking` tables, TCF audio, prompts or tests.
- Immutable 20-paper bank. Public catalogue exposes only candidate documents; private server bank includes factual briefs and friend objections.
- State machine A (5:00) → A completed / optionally assessed → B (10:00) → completed. Between sections, the student chooses to start B, so viewing Section A feedback does not steal the 10-minute B clock.
- AI interlocutor A: responds only to the actual candidate questions, brief and natural, no question list or coaching. B: responsive friend who raises plausible objections, neither capitulates immediately nor stonewalls.
- One audio WAV per capped turn stored in a private bucket using service-role credentials, available only via owner-checked authenticated Edge retrieval. Save transcript, sound observations, audio reference, timestamps and credits in the protected database.
- Two feedback requests: after Section A and after Section B. Final feedback contains Section B assessment and overall TEF 0–699 **practice estimate**, mapped to the published post-Dec-2023 NCLC speaking range only when both sections contain assessable speech. Pronunciation insights only where actual audio-model observations are available.
- Cost shown before each interaction and both feedback calls. Never retry charged inference automatically or make a second paid attempt using the same callId.
- Explicit failure and silence UI states; server 5/10 minute duration enforcement, bounded pending-processing grace, recovery for reconnect and browser navigation.
- Test mock AI, auth, incorrect origin, wallet failures and refund, silence, timeouts, prompt role boundaries, 40-topic uniqueness, feedback grounding, saved progress and UI; production browser/microphone tests require real user permission and cannot be substituted by mocked tests.

## Verification log
Pending implementation, CI, database release, backend release and real browser checks. No claim of full live voice verification without a signed-in browser session and microphone.
