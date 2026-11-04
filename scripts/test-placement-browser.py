"""Local-only UI acceptance checks. Requires Python Playwright and Chromium.
Run: python3 scripts/test-placement-browser.py
Override browser binary with CHROMIUM_PATH. No Supabase connections are made.
"""
import os
from pathlib import Path
import shutil
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

os.chdir(Path(__file__).resolve().parents[1])
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
artifacts = Path('dist/placement-qa')
artifacts.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
        for width in (390, 1280):
            page = browser.new_page(viewport={'width': width, 'height': 900})
            page.add_init_script("""
                Object.defineProperty(window, 'speechSynthesis', {value:{
                    getVoices:()=>[], cancel:()=>{}, speak:u=>u.onend()
                }});
                window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
            """)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
            page.goto(f'http://127.0.0.1:{server.server_port}/tests/fixtures/placement.html')
            page.wait_for_function('window.fixtureReady === true')
            assert page.locator('[data-course-level]').count() == 7
            assert page.get_by_text('Available now', exact=True).count() == 7
            page.get_by_role('button', name='Take French Placement Test').click()
            page.get_by_role('button', name='Start or resume assessment').wait_for()
            page.screenshot(path=str(artifacts / f'intro-{width}.png'), full_page=True)
            page.get_by_role('button', name='Start or resume assessment').click()
            area = page.locator('#hz-placement')
            area.locator('input[type=radio]').first.wait_for()
            # Native radio keyboard navigation; retry keeps selected input.
            radio = area.get_by_role('radio').first
            radio.focus()
            page.keyboard.press('Space')
            page.keyboard.press('ArrowDown')
            assert area.get_by_role('radio').nth(1).is_checked()
            page.evaluate('fixture.fail=true')
            area.get_by_role('button', name='Save answer and continue').click()
            area.get_by_role('alert').wait_for()
            assert area.get_by_role('radio').nth(1).is_checked()
            for i in range(8):
                if i >= 6:
                    area.get_by_role('button', name='Play French audio').click()
                    area.get_by_text('No French device voice is available.', exact=False).wait_for()
                    area.get_by_role('radio').first.check()
                    count = len(page.evaluate('fixture.calls'))
                    area.get_by_role('button', name='Save answer and continue').click()
                    assert len(page.evaluate('fixture.calls')) == count
                    # Accessible fallback works regardless of device voices.
                    if i == 6:
                        area.get_by_role('button', name='Use transcript (listening not assessed)').click()
                        assert area.get_by_text('Bonjour, je m’appelle Léa.', exact=True).is_visible()
                    else:
                        page.evaluate("speechSynthesis.getVoices=()=>[{lang:'fr-FR'}]")
                        area.get_by_role('button', name='Play French audio').click()
                        area.get_by_text('Audio finished. Choose your answer.', exact=True).wait_for()
                else:
                    area.get_by_role('radio').first.check()
                if i == 2:
                    area.get_by_role('button', name='Close — return to courses').click()
                    page.get_by_role('button', name='Take French Placement Test').click()
                    area.get_by_text('2 answers saved', exact=False).wait_for()
                page.screenshot(path=str(artifacts / f'question-{width}.png'), full_page=True)
                area.get_by_role('radio').first.check()
                area.get_by_role('button', name='Save answer and continue').click()
                if i < 7:
                    area.get_by_text(f'{i+1} answers saved', exact=False).wait_for()
            area.get_by_role('heading', name='Recommended starting level: A1').wait_for()
            assert area.get_by_text('Provisional:', exact=False).is_visible()
            assert 'listening: 1/1 correct' in area.inner_text()
            page.screenshot(path=str(artifacts / f'result-{width}.png'), full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            area.get_by_role('button', name='Start A1 lessons', exact=True).click()
            assert page.evaluate('fixture.openedLevel') == 'A1'
            assert area.is_hidden()
            assert len([c for c in page.evaluate('fixture.calls') if c['name'] == 'academy_placement_answer' and c['args']['p_mode'] == 'transcript']) == 1
            assert len([c for c in page.evaluate('fixture.calls') if c['name'] == 'academy_placement_answer' and c['args']['p_mode'] == 'audio']) == 1
            # Unauthorized and stale responses cannot display another session's result.
            page.evaluate('fixture.deny=true')
            page.get_by_role('button', name='Take French Placement Test').click()
            area.get_by_role('alert').wait_for()
            assert area.get_by_role('radio').count() == 0
            area.get_by_role('button', name='Close — return to courses').click()
            page.evaluate('fixture.deny=false;fixture.delay=150')
            page.get_by_role('button', name='Take French Placement Test').click()
            page.evaluate("document.querySelector('#hzad-french-academy').dispatchEvent(new CustomEvent('hzad-clear-lessons'))")
            page.wait_for_timeout(250)
            assert area.is_hidden()
            assert area.inner_text() == ''
            assert not errors, errors
            page.close()
            print(f'PASS: {width}px keyboard, resume, retry, transcript, result, navigation, authorization, stale response')
        browser.close()
finally:
    server.shutdown()
