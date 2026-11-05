# Local acceptance check. Start a checkout-only HTTP server on 127.0.0.1:8765 first.
# Requires Python Playwright and an installed /usr/bin/chromium. Uses only test doubles.
from playwright.sync_api import sync_playwright
import json,wave,math,struct,base64
from pathlib import Path
Path('/tmp/exam-browser-evidence').mkdir(exist_ok=True)
with wave.open('/tmp/exam-silence.wav','wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(struct.pack('<h',int(math.sin(i*.15)*3000)) for i in range(16000)))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/exam-silence.wav',lambda route:route.fulfill(path='/tmp/exam-silence.wav',content_type='audio/wav'))
  page.goto('http://127.0.0.1:8765/tests/fixtures/exams.html');page.wait_for_function('window.fixtureReady===true')
  page.get_by_role('heading',name='Full French mock exams').wait_for()
  cards=page.locator('.hz-exam-card')
  assert cards.count()==2
  for card,expected in [(cards.nth(0),[40,40,2,2]),(cards.nth(1),[39,39,3,3])]:
   sections=card.locator('.hz-exam-section')
   assert sections.count()==4
   for i,skill in enumerate(['reading','listening','writing','speaking']):
    section=sections.nth(i)
    assert section.get_attribute('data-skill')==skill
    section.locator('summary').click()
    assert section.locator('li').count()==expected[i]
    assert section.locator('li').first.is_visible()
    section.locator('summary').click()
  cards.nth(0).locator('.hz-exam-section[data-skill=reading] > summary').click()
  page.screenshot(path=f'/tmp/exam-browser-evidence/catalog-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'catalog horizontal overflow'
  page.get_by_role('button',name='Start full mock · 50 credits').first.click()
  page.get_by_role('heading',name='TEF Canada · Mock 01').wait_for()
  active=page.locator('.hz-exam-section.is-active')
  assert active.get_attribute('data-skill')=='reading'
  assert active.locator('.hz-exam-current-question').get_by_role('radio').count()==4
  active.get_by_role('button',name='Reading question 10',exact=True).click()
  page.get_by_text('Reading · 10 of 40',exact=True).wait_for()
  active.get_by_role('button',name='Reading question 1',exact=True).click()
  page.get_by_text('Reading · 1 of 40',exact=True).wait_for()
  locked=page.locator('.hz-exam-section[data-skill=listening]')
  locked.locator('summary').click()
  assert locked.get_by_role('button').first.is_disabled()
  page.get_by_role('radio').nth(1).check();page.wait_for_function('window.fixture.rows.values().next().value.state.answers && Object.keys(window.fixture.rows.values().next().value.state.answers).length===1')
  page.get_by_role('button',name='Next question',exact=True).click();page.get_by_text('Reading · 2 of 40',exact=True).wait_for()
  page.get_by_role('button',name='Previous question').click();page.get_by_text('Reading · 1 of 40',exact=True).wait_for()
  assert page.get_by_role('radio').nth(1).is_checked()
  page.screenshot(path=f'/tmp/exam-browser-evidence/reading-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'reading horizontal overflow'
  page.evaluate("async()=>{const r=fixture.rows.values().next().value;await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:0}});await fixture.ui.open(r.id)}")
  assert page.locator('#hz-exams input[type=radio]').count()==4
  assert not page.locator('#hz-exams input[type=radio]').first.is_visible()
  page.get_by_role('button',name='▶ Play recording once').click()
  page.get_by_role('radio').first.wait_for(state='visible')
  assert page.get_by_role('button',name='▶ Play recording once').is_disabled()
  page.get_by_role('radio').first.check();page.wait_for_timeout(100)
  assert page.get_by_role('button',name='▶ Play recording once').is_disabled()
  page.evaluate("async()=>{const r=fixture.rows.values().next().value;await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:1}});await fixture.ui.open(r.id)}")
  page.get_by_role('textbox',name='Votre réponse écrite').fill('Bonjour mon ami. Je vous invite samedi à la bibliothèque.')
  page.get_by_text('Writing saved.',exact=True).wait_for()
  page.get_by_role('button',name='Mock exam centre',exact=True).click()
  page.get_by_role('heading',name='Full French mock exams').wait_for()
  page.get_by_role('button',name='TEF Canada ·',exact=False).click()
  assert page.get_by_role('textbox',name='Votre réponse écrite').input_value().startswith('Bonjour mon ami.')
  page.evaluate("async()=>{const r=fixture.rows.values().next().value;await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:2}});await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:3}});await fixture.ui.open(r.id)}")
  page.get_by_role('heading',name='Your exam review').wait_for()
  review=page.locator('.hz-exam-review-section')
  assert review.count()==4
  assert review.nth(0).locator('.hz-exam-review-item').count()==40
  assert review.nth(1).locator('.hz-exam-review-item').count()==40
  page.locator('.hz-exam-review-section[data-skill=writing] > summary').click()
  page.get_by_role('button',name='Get detailed feedback · included').first.click()
  page.get_by_text('Your three priorities',exact=True).wait_for()
  page.screenshot(path=f'/tmp/exam-browser-evidence/feedback-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'feedback horizontal overflow'
  page.get_by_role('button',name='Mock exam centre',exact=True).click()
  page.get_by_role('button',name='Start full mock · 50 credits').nth(1).click()
  page.get_by_role('heading',name='TCF Canada · Mock 01').wait_for()
  page.evaluate("async()=>{const r=[...fixture.rows.values()].find(r=>r.exam==='tcf-canada');await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:0}});await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:1}});await fixture.ui.open(r.id)}")
  page.get_by_role('textbox',name='Votre réponse écrite').fill('Bonjour, retrouvons-nous samedi à dix heures devant la gare.')
  page.locator('.hz-exam-section.is-active').get_by_role('button',name='Writing task 3',exact=True).click()
  page.get_by_text('Writing · 3 of 3',exact=True).wait_for()
  page.locator('.hz-exam-section.is-active').get_by_role('button',name='Writing task 1 · saved',exact=True).click()
  page.get_by_text('Writing · 1 of 3',exact=True).wait_for()
  page.get_by_role('button',name='Next task',exact=True).click()
  page.get_by_text('Writing · 2 of 3',exact=True).wait_for()
  page.get_by_role('button',name='Previous task',exact=True).click()
  page.get_by_text('Writing · 1 of 3',exact=True).wait_for()
  assert page.get_by_role('textbox',name='Votre réponse écrite').input_value().startswith('Bonjour, retrouvons-nous')
  page.evaluate("async()=>{const r=[...fixture.rows.values()].find(r=>r.exam==='tcf-canada');await fixture.send({kind:'event',id:r.id,event:{kind:'finish-section',section:2}});fixture.now=121000;await fixture.ui.open(r.id)}")
  page.get_by_text('Prepare your questions. Recording begins after preparation.',exact=True).wait_for()
  assert page.get_by_role('button',name='Send speaking turn · included').count()==0
  page.evaluate("async()=>{fixture.now=241000;const r=[...fixture.rows.values()].find(r=>r.exam==='tcf-canada');await fixture.ui.open(r.id)}")
  page.evaluate('(audio)=>{fixture.audio=audio}',base64.b64encode(open('/tmp/exam-silence.wav','rb').read()).decode())
  page.get_by_role('button',name='Send speaking turn · included').click()
  page.get_by_text('You: Bonjour, quels sont vos horaires ?',exact=True).wait_for()
  page.get_by_role('button',name='Hear interlocutor',exact=True).wait_for()
  page.screenshot(path=f'/tmp/exam-browser-evidence/speaking-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'speaking horizontal overflow'
  assert errors==[], errors
  print(json.dumps({'viewport':width,'assertions':'catalog, answer/save/resume, navigation, one-play listening, writing autosave, feedback, no overflow, no JS errors passed','providerCalls':page.evaluate('fixture.providerCalls')}))
  page.close()
 browser.close()
