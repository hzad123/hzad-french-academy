# TEF Canada Listening Test 01 — official-format source and release plan

## Official references checked 19 Nov 2026

- TEF Canada examination administrator: https://www.lefrancaisdesaffaires.fr/en/candidate/test-evaluation-francais/tef-canada/examination/
- TEF listening item-types PDF: https://www.lefrancaisdesaffaires.fr/wp-content/uploads/2024/10/tef-exemples-epreuves-co.pdf
- Official score explanation: https://www.lefrancaisdesaffaires.fr/en/candidate/test-evaluation-francais/tef-canada/results/

TEF Canada comprehension orale is **40 questions, 40 minutes**, single-play recordings, four options and one correct answer. No backwards navigation. Brief pre-audio reading and post-audio answer windows. The administrator groups Questions 1–4 as illustrated dialogues, 5–20 as short announcements/voicemail/street interviews, 21–30 as radio/interviews/reports, and 31–40 as varied documents. Some official interview recordings may support two adjacent questions; this first mock currently uses a separate original clip for each of its 40 questions. That limitation must be disclosed rather than calling it an exact replica of every screen/recording arrangement.

## Original HZad exercise structure

- 40 distinct, manually authored French transcripts and one answer key each; four illustrated question panels
- Q01–04 picture choices (4)
- Q05–08 public announcements (4)
- Q09–12 voicemail messages (4)
- Q13–20 street interviews (8)
- Q21–22 radio reports (2)
- Q23–28 original interviews (6)
- Q29–30 short reports (2)
- Q31–40 advanced commentary and discussions (10)
- 40 minutes exactly: 4 × 40s, 8 × 45s, 8 × 50s, 10 × 65s, 10 × 83s
- Pre-listening question-reading window, once-only audio, no back navigation, authenticated server-side answering, saved attempt and raw-score answer sheet
- No official TEF/NCLC score inferred from raw correct answers: the official test uses calibrated scoring unavailable for our original questions.

## Security and release standards

The `academy_tef_listening` private schema isolates source papers and keys with RLS, freezes immutable papers, binds each attempt to `auth.uid()`, checks academy access, uses a server clock, stores revision-controlled answers and reveals keys only after completion. Avoid student-exposed service-role keys, unauthenticated RPCs or localStorage grading.

The rendered audio must match all 40 pinned original French source segments by SHA-256, fit response windows and be decoded end-to-end; all 4 picture panels require visual inspection. Run the repository test suite and static build, rehearse the migration transaction with rollback, then deploy and verify every hosted byte **before** creating the active Supabase schema. Existing TCF, TEF Reading/Writing/Speaking, histories and credit wallets must remain unchanged.

**Quality disclaimer in development:** automated source/media checks establish technical integrity but are not an independent second-speaker French fluency review or calibration against the actual TEF.
