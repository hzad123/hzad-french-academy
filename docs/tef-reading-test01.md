# TEF Reading Test 01 — visual simulator pilot (40 questions)

## Reference analysis
The user supplied the 22-page, 40-question HZad Education TEF Reading Test 5 PDF as a **format reference**, not as content to copy into Test 01. The sample has a 60-minute duration and seven exercise patterns:
- Questions 1–7: short communications, posters, promotional notices with photos/symbols
- Questions 8–11: missing word in a short sentence
- Questions 12–17: three two-gap short texts
- Questions 18–19: choose from four side-by-side job notices
- Questions 20–22: compare four graphical time-series plots per question
- Questions 23–32: five letters/emails, two questions per text
- Questions 33–40: four longer articles, two questions per text

## Implementation
- Original practice **TEF Reading Test 01** (not a copy of the uploaded Test 5) follows all 40 positions.
- The first seven notices have original illustrative SVG graphics and symbols; two use custom vector scenes. Q18/19 show a four-card offers grid. Q20/21/22 show four actual SVG line graphs each, built from different time series and responsive on mobile.
- There are exactly 40 questions with four answers each, 10 keys per letter A–D, 60-minute server-side timer, and no AI dependency for grading.
- The existing TCF Reading interaction pattern is reused: save individual choices, resume before expiry, jump between questions, submission confirmation, marked answer sheet, green correct/red wrong, key and explanation, section documents/graphs available to revisit. Each correct answer is worth one practice point (out of 40).
- This is a **practice raw score of 0–40**; do not claim an official TEF-scaled score or NCLC conversion without a validated conversion specification.
- New isolated private `academy_tef_reading` tables and authenticated RPC. The unsubmitted bank hides answer letters and explanations. Server-side scoring preserves the immutable paper version on each completed attempt. The schema, test, and UI do not modify the existing TCF Reading, listening, writing or speaking database tables, or AI wallets.
- The TEF simulator Reading tile is enabled and links to the single-test landing page; the other planned nineteen TEF reading tests are **not** generated or published.
- QA: use `node --test tests/tef-reading.test.mjs` and the full GitHub Build and test. Verify a complete 40/40 and mixed-answer attempt, chart/offer rendering, desktop/mobile layout, catalog listing, and existing results.

## Source note
The supplied sample's exact photos and graphs are protected reference materials; Test 01 uses its own original visual assets and numerical graph content rather than copying or falsely labelling Test 5 as Test 01.
