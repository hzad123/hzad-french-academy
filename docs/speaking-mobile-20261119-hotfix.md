# TEF/TCF speaking: mobile playback and transcription hotfix (2026-11-19)

- Incident: TEF iPhone speaking turn failed at 2026-11-19 16:05 UTC with provider HTTP 400; student WAV remained saved and the turn's credits were refunded. Browser examiner voices could fail to play after an asynchronous request on iOS.
- Shared transcription: prefer gpt-transcribe with French word-for-word guidance. On an HTTP 400 only, make a single compatible request using gpt-4o-mini-transcribe and its singular language=fr parameter. Do not retry 429 or server failures. Do not edit returned student words.
- Mobile: TEF and TCF expose a direct-tap examiner speech control. The browser speech request is started in the click event, before await; TCF also offers recording without voice if playback is unavailable. Desktop still uses automatic playback.
- Tests: all GitHub CI tests and build succeeded for PR #73 before merge; regression checks cover immediate speech activation and fallback behavior.
- Production: Supabase academy-tef-speaking v7 and academy-tcf-speaking v32 deployed ACTIVE, verify_jwt=true; no schema migrations, student data edits or credit price changes.
- Remaining live QA: compare actual iPhone speaker audio and recorded transcript with a learner deliberately making French grammatical errors, completing one TEF and one TCF turn. Verify per-turn credits and feedback. Keep prior saved attempts intact.
