# Navigation and achievement presentation

This frontend update removes repeated disclaimer paragraphs, adds a top-left Back control, and refreshes achievement and certificate artwork. Progress Tracker remains the top-right dashboard button. Existing grading, course eligibility, lesson IDs, issued certificates, and saved student progress retain their server-owned behavior. No database migration is required.

`src/ui/navigation.js` keeps up to 60 app destinations in memory. Back restores the previous tracker tab (including notebook filter/page), lesson, or assessment. Assessment restoration fetches the current saved attempt rather than changing a submitted answer. Authentication changes clear history; switching accounts also clears existing lesson panels and cancels stale responses. All levels remains available as a direct home control. The global Back button is disabled at the initial app view.

`src/achievements/graphics.js` supplies local SVG artwork for each of the ten badge codes, with earned and locked presentation. Text labels describe achievements alongside decorative graphics. Certificate cards and printed awards use blue and gold, a seal, and the existing course-completion title and assessment scope. The print window has its own Back control, which closes it and returns to the academy. Public verification links return to the preceding academy page when available, with an academy link as fallback.

Owner interface preferences are recorded in `AGENTS.md`: use concise positive copy, keep operational errors and factual requirements clear, avoid repetitive boilerplate, and retain distinct achievement graphics.

Validation commands:

```sh
npm test
npm run build
python3 scripts/test-tracker-browser.py
python3 scripts/test-achievements-browser.py
python3 scripts/test-placement-browser.py
```

Browser scripts use synthetic local data and block external requests (the verification endpoint is mocked). They cover mobile/desktop layouts, notebook feedback and saved filters, plan-to-lesson Back navigation, existing instant-feedback quizzes, placement resumption, certificate assessment resumption, one-page printable PDF output, and account-history clearing. Real student assessment submissions are not needed for this frontend release.
