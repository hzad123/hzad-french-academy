# Local acceptance check: serve the checkout on 127.0.0.1:8765.
# Uses owner/student fixtures; no live provider requests or student data.
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,wave,math,struct
Path('/tmp/exam-content-evidence').mkdir(exist_ok=True)
with wave.open('/tmp/content-test.wav','wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(struct.pack('<h',int(math.sin(i*.15)*3000)) for i in range(16000)))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/exam-silence.wav',lambda r:r.fulfill(path='/tmp/content-test.wav',content_type='audio/wav'))
  page.goto('http://127.0.0.1:8765/tests/fixtures/exams.html?review=owner');page.wait_for_function('fixtureReady===true')
  page.locator('.hz-exam-card').first.locator('.hz-exam-section[data-skill=reading] > summary').click()
  page.get_by_role('button',name='Review TEF Canada Reading question 1',exact=True).click()
  page.get_by_role('heading',name='TEF Canada · Content review',exact=True).wait_for()
  page.get_by_role('heading',name='À quelle heure ferme le vestiaire ?',exact=True).wait_for()
  assert '21 h 30' in page.locator('.hz-exam-content-options .hz-ai-corrected').inner_text()
  page.locator('.hz-exam-section.is-active').get_by_role('button',name='Review Reading question 7',exact=True).click()
  page.get_by_text('Une photo sans montage, envoyée le 12 juin.',exact=False).wait_for()
  page.locator('.hz-exam-section[data-skill=writing] > summary').click()
  page.get_by_role('button',name='Review Writing task 1',exact=True).click()
  page.get_by_text('80+ words',exact=True).wait_for()
  page.locator('.hz-exam-debrief > summary').click()
  page.get_by_text('149 words',exact=True).wait_for()
  assert page.locator('.hz-exam-model-response').inner_text().startswith('Elle a d’abord')
  page.get_by_text('Task checklist',exact=True).wait_for()
  page.screenshot(path=f'/tmp/exam-content-evidence/tef-writing-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#hz-exams').get_by_role('button',name='TEF/TCF AI Tests',exact=True).click()
  page.get_by_role('button',name='Review TCF Canada content',exact=True).click()
  page.locator('.hz-exam-section[data-skill=listening] > summary').click()
  page.get_by_role('button',name='Review Listening question 1',exact=True).click()
  page.get_by_text('Full listening script',exact=True).wait_for()
  page.get_by_role('button',name='Listen to recording',exact=True).click()
  page.locator('audio').wait_for()
  page.locator('.hz-exam-section.is-active').get_by_role('button',name='Review Listening question 4',exact=True).click()
  page.get_by_text('Recording still needs generation. The complete script is shown above.',exact=True).wait_for()
  assert page.get_by_role('button',name='Listen to recording',exact=True).count()==0
  page.locator('.hz-exam-section[data-skill=speaking] > summary').click()
  page.get_by_role('button',name='Review Speaking task 3',exact=True).click()
  page.locator('.hz-exam-debrief > summary').click()
  page.get_by_text('Example argument development',exact=True).wait_for()
  page.screenshot(path=f'/tmp/exam-content-evidence/tcf-speaking-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.evaluate('fixture.providerCalls')==0
  assert page.evaluate('fixture.rows.size')==0
  page.evaluate('fixture.signOut()');assert page.locator('#hz-exams').inner_text()==''
  assert errors==[],errors
  page.goto('http://127.0.0.1:8765/tests/fixtures/exams.html');page.wait_for_function('fixtureReady===true')
  assert page.get_by_role('button',name='Review TCF Canada content',exact=True).count()==0
  print(json.dumps({'viewport':width,'result':'real questions/options/explanations, word-counted writing model, oral guide, ready/pending audio, owner-only view, no attempts/provider charges, logout clearing, no overflow/JS errors passed'}));page.close()
 browser.close()
