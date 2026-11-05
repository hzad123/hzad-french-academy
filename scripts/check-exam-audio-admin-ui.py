# Local acceptance check; serve the checkout on 127.0.0.1:8765 first.
# Requires Python Playwright and /usr/bin/chromium. Uses only fixture data.
from playwright.sync_api import sync_playwright
from pathlib import Path
import wave,math,struct,json
with wave.open('/tmp/admin-test.wav','wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(struct.pack('<h',int(math.sin(i*.15)*3000)) for i in range(16000)))
Path('/tmp/audio-admin-evidence').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/exam-silence.wav',lambda r:r.fulfill(path='/tmp/admin-test.wav',content_type='audio/wav'))
  page.goto('http://127.0.0.1:8765/tests/fixtures/exam-audio-admin.html');page.wait_for_function('window.fixtureReady===true')
  page.get_by_role('button',name='Exam audio setup',exact=True).wait_for(state='visible');page.get_by_role('button',name='Exam audio setup',exact=True).click()
  page.get_by_role('heading',name='Exam audio setup',exact=True).wait_for();page.get_by_text('0/3 generated · 0 approved',exact=True).wait_for()
  page.get_by_role('button',name='Generate exam audio',exact=True).click();page.get_by_text('3/3 generated · 0 approved',exact=True).wait_for()
  assert page.evaluate('fixture.generations')==3
  page.get_by_role('button',name='Refresh saved progress',exact=True).click();page.get_by_text('3/3 generated · 0 approved',exact=True).wait_for()
  assert page.get_by_role('button',name='Continue generating exam audio',exact=True).is_disabled()
  assert page.get_by_role('button',name='Approve recording').first.is_disabled()
  page.get_by_role('button',name='Listen to recording').first.click()
  page.get_by_role('checkbox').first.wait_for();page.wait_for_function("!document.querySelector('#hz-exam-audio-admin input[type=checkbox]').disabled")
  page.get_by_role('checkbox').first.check();page.get_by_role('button',name='Approve recording',exact=True).first.click();page.get_by_text('3/3 generated · 1 approved',exact=True).wait_for()
  assert page.evaluate('fixture.generations')==3
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/audio-admin-evidence/ready-{width}.png',full_page=True)
  page.evaluate('fixture.signOut()');assert not page.get_by_role('button',name='Exam audio setup',exact=True).is_visible();assert page.locator('#hz-exam-audio-admin').inner_text()==''
  assert errors==[],errors
  page.goto('http://127.0.0.1:8765/tests/fixtures/exam-audio-admin.html?owner=no');page.wait_for_function('window.fixtureReady===true');page.wait_for_timeout(150)
  assert not page.get_by_role('button',name='Exam audio setup',exact=True).is_visible()
  assert page.evaluate('fixture.generations')==0
  print(json.dumps({'viewport':width,'result':'owner-only visibility, generation/resume, no duplicate calls, playback review, signout cleanup, no overflow/JS errors passed'}));page.close()
 browser.close()
