"""Local mock-transport acceptance. Needs Python Playwright and Chromium.
No non-local requests, production credentials, or Supabase connections.
"""
import os
from pathlib import Path
import shutil
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

os.chdir(Path(__file__).resolve().parents[1])
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
artifacts=Path('dist/tracker-qa');artifacts.mkdir(parents=True,exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
        for width in (390,1280):
            page=browser.new_page(viewport={'width':width,'height':900})
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
            page.goto(f'http://127.0.0.1:{server.server_port}/tests/fixtures/tracker.html')
            page.wait_for_function('window.fixtureReady===true')
            assert page.locator('.hz-dashboard-actions #hz-tracker-launch').count()==1
            assert page.locator('#hz-course-chooser #hz-tracker-launch').count()==0
            assert page.locator('.hz-tracker-entry').count()==0
            box=page.locator('#hz-tracker-launch').bounding_box()
            top=page.locator('#hz-dashboard .hz-topline').bounding_box()
            actions=page.locator('#hz-dashboard .hz-dashboard-actions').bounding_box()
            assert actions['x']+actions['width']>top['x']+top['width']*.9
            assert box['x']>=actions['x'] and box['x']+box['width']<=actions['x']+actions['width']+.5
            page.screenshot(path=str(artifacts/f'homepage-{width}.png'),full_page=True)
            page.get_by_role('button',name='Progress Tracker').click()
            area=page.locator('#hz-progress-tracker')
            area.get_by_role('button',name='Start today’s plan',exact=True).wait_for()
            assert page.locator('#hz-course-chooser').is_hidden()
            area.get_by_label('Daily study goal').select_option('10')
            area.get_by_role('button',name='Save study preferences').click()
            area.get_by_role('heading',name='Today’s 10-minute learning plan').wait_for()
            page.screenshot(path=str(artifacts/f'plan-{width}.png'),full_page=True)
            area.get_by_role('button',name='Start today’s plan',exact=True).click()
            area.get_by_role('heading',name='Personal mistake notebook').wait_for()
            radio=area.get_by_role('radio').first;radio.focus();page.keyboard.press('Space')
            area.get_by_text('✕ Incorrect — try again',exact=True).wait_for()
            assert area.locator('.hz-revision-incorrect input:checked').count()==1
            assert area.get_by_text('Correct answer: suis',exact=True).is_visible()
            page.screenshot(path=str(artifacts/f'notebook-wrong-{width}.png'),full_page=True)
            page.evaluate('fixture.failNext=true')
            area.get_by_role('radio').nth(1).check()
            area.get_by_role('alert').wait_for()
            assert area.get_by_role('radio').nth(1).is_checked()
            area.get_by_role('button',name='Retry answer',exact=True).click()
            area.get_by_text('✓ Correct!',exact=True).wait_for()
            assert area.locator('.hz-revision-correct input:checked').count()==1
            assert area.get_by_role('radio').nth(1).is_disabled()
            assert area.get_by_label('Notebook filter').input_value()=='due'
            page.screenshot(path=str(artifacts/f'notebook-correct-{width}.png'),full_page=True)
            area.get_by_role('button',name='Continue revision',exact=True).click()
            area.get_by_label('Notebook filter').select_option('reviewed')
            assert area.get_by_role('radio').count()==2
            area.get_by_text('Review saved answer and explanation',exact=True).click()
            assert area.get_by_text('Your last incorrect answer: est',exact=True).is_visible()
            page.screenshot(path=str(artifacts/f'notebook-{width}.png'),full_page=True)
            area.get_by_role('button',name='French mastery',exact=True).click()
            area.get_by_role('heading',name='French mastery dashboard').wait_for()
            assert area.get_by_text('Prioritize review',exact=False).count()==1
            assert area.get_by_text('Not enough evidence yet',exact=False).count()==3
            assert area.get_by_role('progressbar').count()==7
            page.screenshot(path=str(artifacts/f'mastery-{width}.png'),full_page=True)
            page.locator('#hz-global-back').click()
            area.get_by_role('heading',name='Personal mistake notebook').wait_for()
            assert area.get_by_label('Notebook filter').input_value()=='reviewed'
            area.get_by_role('button',name='Daily plan',exact=True).click()
            area.get_by_role('button',name='Start today’s plan',exact=True).click()
            page.locator('#hz-a0-learning .hz-a0-lesson-title').filter(has_text='Your next lesson').wait_for()
            assert area.is_hidden()
            page.locator('#hz-global-back').click()
            area.get_by_role('heading',name='Today’s 10-minute learning plan').wait_for()
            area.get_by_role('button',name='Start today’s plan',exact=True).click()
            page.locator('#hz-a0-learning .hz-a0-lesson-title').filter(has_text='Your next lesson').wait_for()
            # Original instant-feedback and completion flow still saves normally.
            page.locator('#hz-a0-learning input[type=radio]').nth(1).check()
            page.get_by_text('✓ Lesson completed!',exact=False).wait_for()
            page.get_by_role('button',name='← All levels',exact=True).click()
            page.get_by_role('button',name='Progress Tracker').click()
            area.get_by_role('button',name='Start today’s plan',exact=True).wait_for()
            assert area.get_by_label('Daily study goal').input_value()=='10'
            area.get_by_role('button',name='French mastery',exact=True).click()
            assert area.get_by_text('2 of 2 published lessons completed.',exact=True).is_visible()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            area.get_by_role('button',name='← All levels',exact=True).click()
            page.get_by_role('button',name='Take French Placement Test').click()
            page.get_by_role('button',name='Start or resume assessment').wait_for()
            assert page.locator('#hz-course-chooser').is_hidden()
            page.get_by_role('button',name='Close — return to courses').click()
            assert page.get_by_text('Available now',exact=True).count()==7
            page.evaluate('fixture.deny=true')
            page.get_by_role('button',name='Progress Tracker').click()
            area.get_by_role('alert').wait_for()
            area.get_by_role('button',name='← All levels',exact=True).click()
            page.evaluate('fixture.deny=false;fixture.delay=150')
            page.get_by_role('button',name='Progress Tracker').click()
            page.evaluate("document.querySelector('#hzad-french-academy').dispatchEvent(new CustomEvent('hzad-clear-lessons'))")
            page.wait_for_timeout(250)
            assert area.is_hidden() and area.inner_text()==''
            page.evaluate('fixture.delay=0')
            page.get_by_role('button',name='Progress Tracker').click()
            area.get_by_role('button',name='Start today’s plan',exact=True).wait_for()
            page.evaluate("fixture.authCallbacks.forEach(fn=>fn('SIGNED_IN',{user:{id:'different-fixture-user'}}))")
            assert area.is_hidden() and area.inner_text()==''
            assert page.locator('#hz-global-back').is_disabled()
            assert not errors,errors
            print(f'PASS {width}px: preferences, plan, mastery, notebook, keyboard, lesson deep link, quiz regression, placement, isolation')
            page.close()
        browser.close()
finally:
    server.shutdown()
