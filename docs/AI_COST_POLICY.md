# HZad French Academy: AI cost policy

## No AI for core education
- Lessons, explanations, dialogues and vocabulary are pre-authored.
- Quizzes are deterministic with stored answer keys and explanations.
- Scores and progress percentages are computed by ordinary application code.
- Browser speechSynthesis can read example sentences without an AI API.
- Never send every student answer to an AI model automatically.

## Optional AI Learning
- Student explicitly opens AI Learning and requests pronunciation feedback, a conversation reply or a writing review.
- Tutor can receive a compact summary of lesson progress and incorrect topics, not raw personal records.
- Tutor uses a server-side endpoint with authenticated identity, rate limiting, daily message caps, token limits, and a monthly spending ceiling.
- Secrets live server-side; never in GitHub Pages or GHL HTML.
- Students can learn and finish the entire course if the AI tutor is unavailable.
- Display the exact configured credit charge before every provider call. The server rejects a changed quote and atomically reserves credits and a reviewed worst-case provider-cost ceiling before dispatch.
- The included allowance lasts six months from verified purchase, with a maximum CAD $15 provider-cost allowance per student. Credits, activity prices, models and cost ceilings remain unconfigured/disabled until reviewed; use the setup in [ai-learning.md](./ai-learning.md).
- Never retry an inference automatically after a lost response. Reuse the request ID to retrieve/reconcile the existing result.

## Data security
- Keep answer keys and authoritative grading server-side. The released course already uses entitlement-protected Supabase RPCs.
- AI audio is transient and never stored in the academy database or localStorage. Retained feedback/conversation content is owner-only and cleared by the configured 90-day maintenance policy; budget accounting is retained.
- Keep the production GHL loader/Pages bundle free of provider keys and privileged Supabase credentials. Current paid lessons, quiz results and progress remain protected by existing authorization.
