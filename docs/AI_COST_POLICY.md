# HZad French Academy: AI cost policy

## No AI for core education
- Lessons, explanations, dialogues and vocabulary are pre-authored.
- Quizzes are deterministic with stored answer keys and explanations.
- Scores and progress percentages are computed by ordinary application code.
- Browser speechSynthesis can read example sentences without an AI API.
- Never send every student answer to an AI model automatically.

## Optional AI tutor only (future)
- Student explicitly opens tutor or asks a question.
- Tutor can receive a compact summary of lesson progress and incorrect topics, not raw personal records.
- Tutor uses a server-side endpoint with authenticated identity, rate limiting, daily message caps, token limits, and a monthly spending ceiling.
- Secrets live server-side; never in GitHub Pages or GHL HTML.
- Students can learn and finish the entire course if the AI tutor is unavailable.

## Data security
- Do not expose answer keys for high-stakes exams; current A0 practice quizzes are formative, client-side exercises.
- Local storage preview progress is device-specific and can be changed by students; migrate authoritative progress to Supabase with appropriate RLS and server validation.
- Published curriculum in a public GitHub Pages bundle is visible to everyone. Paid lesson content must ultimately be served through entitlement-protected Supabase access.
