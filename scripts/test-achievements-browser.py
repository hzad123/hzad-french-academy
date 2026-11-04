"""Local UI acceptance; browser transport is mocked, all external requests blocked."""
import os,json,shutil,threading,re
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
os.chdir(Path(__file__).resolve().parents[1])
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
artifacts=Path('dist/achievements-qa');artifacts.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width in (390,1280):
   page=browser.new_page(viewport={'width':width,'height':900});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script("Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{}}})")
   def route_request(route):
    if route.request.url.startswith('http://127.0.0.1:'):route.continue_()
    elif route.request.url.endswith('/rpc/academy_certificate_verify'):
     payload=route.request.post_data_json
     assert 'authorization' not in route.request.headers
     valid=payload['p_id']=='33333333-3333-4333-8333-333333333333' and payload['p_holder']=='Élodie Example'
     route.fulfill(status=200,content_type='application/json',body=json.dumps({'valid':valid,'level':'A0','issuedAt':'2026-11-04T12:00:00Z','scope':'Grammar, vocabulary and reading','score':100,'lessonCount':2,'version':'fixture-v1','notice':'Not official CEFR certification'}))
    else:route.abort()
   page.route('**/*',route_request)
   page.goto(f'http://127.0.0.1:{server.server_port}/tests/fixtures/tracker.html');page.wait_for_function('window.fixtureReady===true')
   page.get_by_role('button',name='Progress Tracker',exact=True).click()
   area=page.locator('#hz-progress-tracker')
   area.get_by_role('button',name='Achievements',exact=True).click()
   area.get_by_role('heading',name='Your learning achievements').wait_for()
   assert area.get_by_text('Current daily streak',exact=True).is_visible()
   assert area.locator('.hz-badge-card svg').count()==2
   assert area.locator('.hz-badge-card.is-earned').count()==1
   assert area.locator('.hz-badge-card.is-locked').count()==1
   assert 'Titles are cosmetic' not in area.inner_text()
   assert area.get_by_role('option',name='Dedicated learner · 250 XP').evaluate('(option)=>option.disabled')
   area.get_by_label('Certificate display name').fill('Élodie Example')
   area.get_by_role('button',name='Save achievement settings').click()
   area.get_by_role('button',name='Save achievement settings').wait_for(state='visible')
   page.screenshot(path=str(artifacts/f'achievements-{width}.png'),full_page=True)
   area.get_by_role('button',name='Certificates',exact=True).click()
   area.get_by_role('heading',name='HZad level-completion certificates').wait_for()
   locked=area.get_by_role('button',name='Complete lessons to unlock assessment',exact=True)
   assert locked.count()==7
   assert all(locked.nth(i).is_disabled() for i in range(7))
   page.evaluate("fixture.data.units.forEach(u=>{u.completed=true;u.best=100;u.attempts=1})")
   area.get_by_role('button',name='Refresh progress',exact=True).click()
   start=area.get_by_role('button',name='Start / resume final assessment',exact=True);start.wait_for();assert start.is_enabled()
   assert area.get_by_label('Text-supported assessment').is_checked()
   start.click();area.get_by_text('0/12 answers saved.',exact=False).wait_for()
   for i in range(12):
    area.get_by_role('radio').nth(1).check()
    if i==2:
     area.get_by_role('button',name='Back to certificates',exact=True).click()
     area.get_by_role('button',name='Start / resume final assessment',exact=True).click()
     area.get_by_text('2/12 answers saved.',exact=False).wait_for();area.get_by_role('radio').nth(1).check()
    area.get_by_role('button',name='Save final answer and see result' if i==11 else 'Save answer and continue',exact=True).click()
    if i<11:area.get_by_text(f'{i+1}/12 answers saved.',exact=False).wait_for()
   area.get_by_role('heading',name='✓ Assessment passed',exact=True).wait_for()
   assert 'text-supported' in area.inner_text()
   page.screenshot(path=str(artifacts/f'assessment-result-{width}.png'),full_page=True)
   area.get_by_role('button',name='Back to certificates',exact=True).click()
   with page.expect_popup() as popup_info:
    area.get_by_role('button',name='View / print A0 certificate',exact=True).click()
   popup=popup_info.value;popup.get_by_role('heading',name='Certificate of Course Completion').wait_for()
   assert popup.get_by_role('heading',name='Élodie Example').is_visible()
   assert popup.get_by_role('button',name='Print / Save as PDF').is_visible()
   assert popup.get_by_role('heading',name='Certificate of Course Completion').is_visible()
   assert 'not an official CEFR' not in popup.locator('body').inner_text()
   popup.screenshot(path=str(artifacts/f'certificate-{width}.png'),full_page=True)
   pdf=popup.pdf(path=str(artifacts/f'certificate-{width}.pdf'),prefer_css_page_size=True,print_background=True)
   assert len(re.findall(rb'/Type\s*/Page(?!s)',pdf))==1,'Certificate should print on one landscape page'
   popup.close()
   area.get_by_text('Verify an HZad certificate',exact=True).click()
   area.get_by_label('Certificate ID',exact=True).fill('33333333-3333-4333-8333-333333333333')
   area.get_by_label('Certificate holder name',exact=True).fill('Wrong Name')
   area.get_by_role('button',name='Verify certificate',exact=True).click()
   area.get_by_text('No valid certificate matches',exact=False).wait_for()
   area.get_by_label('Certificate holder name',exact=True).fill('Élodie Example')
   area.get_by_role('button',name='Verify certificate',exact=True).click()
   area.get_by_text('✓ Valid HZad A0',exact=False).wait_for()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.evaluate('fixture.delay=150')
   area.get_by_role('button',name='Achievements',exact=True).click()
   page.evaluate("document.querySelector('#hzad-french-academy').dispatchEvent(new CustomEvent('hzad-clear-lessons'))")
   page.wait_for_timeout(250);assert area.is_hidden() and area.inner_text()==''
   page.goto(f'http://127.0.0.1:{server.server_port}/dist/certificates/?verifyCertificate=33333333-3333-4333-8333-333333333333')
   page.get_by_label('Certificate ID',exact=True).wait_for()
   assert page.get_by_label('Certificate ID',exact=True).input_value()=='33333333-3333-4333-8333-333333333333'
   page.get_by_label('Certificate holder name',exact=True).fill('Élodie Example')
   page.get_by_role('button',name='Verify certificate',exact=True).click()
   page.get_by_text('✓ Valid HZad A0',exact=False).wait_for()
   page.screenshot(path=str(artifacts/f'public-verifier-{width}.png'),full_page=True)
   assert not errors,errors
   print(f'PASS {width}px: XP/streaks/badges, locked rewards and assessments, 12-question resume, text scope, certificate printing, public verification and stale-response clearing')
   page.close()
  browser.close()
finally:server.shutdown()
