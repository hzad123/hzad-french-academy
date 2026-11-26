"""Exercise all six v6 reading papers through the actual local PGlite/RPC UI.

Serve the repository on http://127.0.0.1:8765. This checker uses only the local
fixture and its synthetic identities. Expected advanced answers come from the
frozen independent-review fixture. It never opens a production application.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
VERSION = "tcf-reading-2026-11-close-reading-v6"
FIXTURE_URL = "http://127.0.0.1:8765/tests/fixtures/tcf-reading.html?bank=v6"
ARTIFACTS = Path(os.environ.get("TCF_READING_V6_ARTIFACTS", "/tmp/tcf-reading-v6-ui"))
SELECTED_NUMBERS = (25, 29, 30, 35, 36, 39)
EXPECTED_POINTS = 160
SCREENSHOT_QUESTIONS = {(1, 30), (4, 25), (4, 29), (4, 36), (4, 39)}


def load_reviewed_papers() -> tuple[list[dict], dict[tuple[int, int], dict]]:
    review = json.loads((ROOT / "tests/fixtures/tcf-reading-v6-independent-review.json").read_text())
    items = review["items"]
    expected = {(item["test"], item["number"]): item for item in items}
    required = {(test, number) for test in range(1, 7) for number in range(25, 40)}
    assert len(items) == 90 and set(expected) == required, "Incomplete independent review coverage"
    papers = []
    for test in range(1, 7):
        paper = json.loads((ROOT / f"supabase/exams/tcf-reading-v6/test-{test:02}.json").read_text())
        assert paper["id"] == f"tcf-reading-{test:02}"
        assert paper["version"] == VERSION
        assert paper["seconds"] == 3600 and paper["maxPoints"] == 699
        assert [q["number"] for q in paper["questions"]] == list(range(1, 40))
        assert sum(paper["questions"][n - 1]["points"] for n in SELECTED_NUMBERS) == EXPECTED_POINTS
        for q in paper["questions"][24:]:
            item = expected[(test, q["number"])]
            digest = hashlib.sha256(json.dumps(q, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
            assert item["fingerprint"] == digest, f"Stale independent review: Test {test} Q{q['number']}"
            key = item["independent_answer"]
            assert key in "ABCD" and key == q["correct"]
            assert item["correct_option_text"] == q["options"][ord(key) - ord("A")]
            assert item["blind_pass"] and item["explanation_verified"] and not item["unresolved_issues"]
        papers.append(paper)
    return papers, expected


def assert_no_horizontal_overflow(page: Page) -> None:
    assert page.evaluate(
        "Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth"
    ), "Reading UI overflows horizontally"


def show_question(page: Page, number: int) -> None:
    page.get_by_role("navigation", name="Reading questions").get_by_role(
        "button", name=re.compile(rf"^Question {number}(?: · answered)?$")
    ).click()
    page.get_by_role("heading", name=f"Question {number} sur 39", exact=True).wait_for()


def assert_question_text(page: Page, question: dict) -> None:
    card = page.locator(".hz-reading-question")
    assert card.locator(".hz-reading-passage p").all_text_contents() == question["passage"].split("\n\n")
    assert card.locator("fieldset legend").text_content() == question["question"]
    assert card.locator(".hz-reading-option span").all_text_contents() == [
        f"{letter}. {text}" for letter, text in zip("ABCD", question["options"])
    ]
    assert card.get_by_role("radio").count() == 4
    assert page.locator(".hz-reading-answer-sheet").count() == 0
    assert_no_horizontal_overflow(page)


def identity(page: Page) -> dict:
    return page.evaluate(
        "({id:fixture.last.id,deadline:fixture.last.deadline,testId:fixture.last.testId,version:fixture.last.version})"
    )


def assert_result(page: Page, paper: dict, test: int, expected: dict) -> dict:
    page.get_by_role("heading", name="Your marked answer sheet", exact=True).wait_for()
    page.get_by_text(f"Total score: 6/39 correct · {EXPECTED_POINTS}/699 points", exact=True).wait_for()
    rows = page.locator(".hz-reading-correction")
    assert rows.count() == 39
    assert page.get_by_role("radio").count() == 0
    for q in paper["questions"]:
        number = q["number"]
        row = rows.nth(number - 1)
        assert row.locator("li").count() == 4
        assert row.locator("li.is-correct").count() == 1, f"Multiple/missing marked keys: T{test} Q{number}"
        assert row.locator(":scope > p").first.text_content() == q["question"]
        assert row.locator(":scope > p").last.text_content() == q["explanation"]
        assert row.locator("details p").all_text_contents() == q["passage"].split("\n\n")
        if number >= 25:
            key = expected[(test, number)]["independent_answer"]
            correct_text = f"{key}. {expected[(test, number)]['correct_option_text']} · ✓ Correct answer"
            if number in SELECTED_NUMBERS:
                correct_text += " · Your answer"
            assert row.locator("li.is-correct").text_content() == correct_text
        if number in SELECTED_NUMBERS:
            assert row.locator("li").filter(has_text=" · Your answer").count() == 1
            assert row.get_by_role("heading", name=f"Question {number} · ✓ Correct · {q['points']}/{q['points']} points", exact=True).count() == 1
        else:
            assert row.get_by_text("Your answer: unanswered.", exact=True).count() == 1
    result = page.evaluate("fixture.last.result")
    assert result["correct"] == 6 and result["points"] == EXPECTED_POINTS
    assert result["maxPoints"] == 699 and result["unanswered"] == 33
    assert_no_horizontal_overflow(page)
    return result


def check_viewport(browser, width: int, papers: list[dict], expected: dict) -> dict:
    page = browser.new_page(viewport={"width": width, "height": 900})
    page.set_default_timeout(20000)
    page_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    saved_ids = []
    checked = 0
    try:
        page.goto(FIXTURE_URL, wait_until="load")
        page.wait_for_function("window.fixtureReady === true", timeout=120000)
        page.locator("#hz-exams .hz-tcf-hub:not(.hz-tef-dropdown) > summary").click()
        page.get_by_role("button", name="Open TCF Reading tests", exact=True).click()
        selector = page.get_by_label("Choose a TCF reading test")
        selector.wait_for()
        assert selector.locator("option").all_text_contents() == [f"Test {n:02}" for n in range(1, 21)]
        for test, paper in enumerate(papers, 1):
            page.get_by_label("Choose a TCF reading test").select_option(paper["id"])
            page.get_by_role("button", name=f"Start Reading Test {test:02}", exact=True).click()
            page.get_by_role("heading", name=f"TCF Reading · Test {test:02}", exact=True).wait_for()
            page.get_by_role("heading", name="Question 1 sur 39", exact=True).wait_for()
            assert page.get_by_role("navigation", name="Reading questions").get_by_role("button").count() == 39
            started = identity(page)
            assert started["testId"] == paper["id"] and started["version"] == VERSION
            assert page.evaluate("Object.keys(fixture.last.answers).length") == 0
            saved = 0
            selections = {}
            for q in paper["questions"][24:]:
                number = q["number"]
                show_question(page, number)
                assert_question_text(page, q)
                assert page.get_by_role("radio").count() == 4
                if number in SELECTED_NUMBERS:
                    key = expected[(test, number)]["independent_answer"]
                    page.get_by_role("radio").nth(ord(key) - ord("A")).check()
                    saved += 1
                    selections[str(number)] = key
                    page.get_by_text(f"{saved}/39 answers saved", exact=True).wait_for()
                    page.wait_for_function("([n,k]) => fixture.last.answers[n] === k", arg=[number, key])
                    assert_question_text(page, q)
                if (test, number) in SCREENSHOT_QUESTIONS:
                    page.screenshot(path=str(ARTIFACTS / f"test-{test:02}-q{number}-{width}.png"), full_page=True)
                checked += 1
            assert page.evaluate("fixture.last.answers") == selections
            page.get_by_role("button", name="All reading tests", exact=True).click()
            page.get_by_role("button", name=re.compile(rf"^Test {test:02} · .* · Resume test$")).click()
            page.get_by_role("heading", name="Question 1 sur 39", exact=True).wait_for()
            assert identity(page) == started, "Resume changed the saved identity, version or original deadline"
            assert page.evaluate("fixture.last.answers") == selections
            for number in SELECTED_NUMBERS:
                show_question(page, number)
                assert page.get_by_role("radio").nth(ord(selections[str(number)]) - ord("A")).is_checked()
            page.get_by_role("button", name="Submit reading test", exact=True).click()
            page.get_by_text("33 unanswered. You cannot change answers after submitting.", exact=True).wait_for()
            page.get_by_role("button", name="Confirm submission", exact=True).click()
            completed = assert_result(page, paper, test, expected)
            assert identity(page) == started
            page.screenshot(path=str(ARTIFACTS / f"test-{test:02}-result-{width}.png"), full_page=False)
            page.get_by_role("button", name="Reading tests", exact=True).click()
            page.get_by_role("button", name=re.compile(rf"^Test {test:02} · .* · View answer sheet$")).click()
            reopened = assert_result(page, paper, test, expected)
            assert reopened == completed, "Reopening a result changed its saved score or corrections"
            assert identity(page) == started
            saved_ids.append(started["id"])
            page.get_by_role("button", name="Reading tests", exact=True).click()
            assert not page_errors, page_errors
        assert len(set(saved_ids)) == 6
        assert checked == 90
        assert not page_errors, page_errors
        return {
            "viewport": {"width": width, "height": 900},
            "papers": 6,
            "advanced_questions_compared": checked,
            "saved_and_reopened_attempts": 6,
            "selected_correct_answers_per_paper": list(SELECTED_NUMBERS),
            "expected_points_per_paper": EXPECTED_POINTS,
            "correction_rows_per_paper": 39,
            "page_errors": page_errors,
            "result": "passed",
        }
    except Exception:
        page.screenshot(path=str(ARTIFACTS / f"failure-{width}.png"), full_page=True)
        (ARTIFACTS / f"page-errors-{width}.json").write_text(json.dumps(page_errors, indent=2) + "\n")
        raise
    finally:
        page.close()


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    papers, expected = load_reviewed_papers()
    results = []
    with sync_playwright() as playwright:
        options = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
        executable = os.environ.get("CHROMIUM_EXECUTABLE_PATH")
        if executable:
            options["executable_path"] = executable
        browser = playwright.chromium.launch(**options)
        try:
            for width in (390, 1440):
                result = check_viewport(browser, width, papers, expected)
                results.append(result)
                print(json.dumps(result), flush=True)
        finally:
            browser.close()
    (ARTIFACTS / "ui-results.json").write_text(json.dumps({
        "version": VERSION,
        "environment": "isolated local PGlite fixture; no production account or deployment",
        "viewports": results,
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
