"""Listening Next/final-submit acceptance with real PostgreSQL RPCs and MP3s.
Serve repository on127.0.0.1:8765. Local Auth fixtures only; no production or fees.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
artifacts=Path('/tmp/tcf-listening-qa');artifacts.mkdir(parents=True,exist_ok=True)
def question(page,number):
 page.get_by_role('heading',name=f'Question {number} sur 39',exact=True).wait_for()
def buttons(page,number):
 assert page.get_by_role('button',name='Next',exact=True).count()==(0 if number==39 else 1)
 assert page.get_by_role('button',name='Submit test',exact=True).count()==(1 if number==39 else 0)
 for name in ['Continue audio','Submit listening test','Confirm submission','Keep listening','Previous']:
  assert page.get_by_role('button',name=name,exact=True).count()==0,name
 assert page.get_by_role('button',name='Play audio',exact=True).count()==0
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-listening.html');page.wait_for_function('window.fixtureReady',timeout=60000)
  page.get_by_role('button',name='Open TCF Listening test',exact=True).click()
  start=page.get_by_role('button',name='Start Listening Test 01',exact=True);start.wait_for();assert start.is_disabled()
  # The real MP3's ended event enables starting. Test speed affects preflight only.
  page.get_by_label('Check your listening audio').evaluate('(a)=>{fixture.checkedElement=a;a.playbackRate=16;return a.play()}')
  page.wait_for_function('!document.querySelector("[data-start-listening]").disabled');start.click();question(page,1);buttons(page,1)
  page.wait_for_function('fixture.checkedElement.src.endsWith("q-01.mp3")&&fixture.checkedElement.currentTime>.2&&!fixture.checkedElement.paused&&!fixture.checkedElement.error',timeout=15000)
  assert page.get_by_role('radio').count()==4
  assert page.locator('.hz-listening-image').evaluate('(img)=>img.complete&&img.naturalWidth>0')
  assert page.evaluate('!fixture.checkedElement.controls&&fixture.checkedElement.playbackRate===1')
  assert page.locator('.hz-reading-answer-sheet').count()==0
  assert page.get_by_text('Transcription et enregistrement',exact=True).count()==0
  identity=page.evaluate('({id:fixture.last.id,deadline:fixture.last.deadline,started:fixture.last.startedAt})')
  page.screenshot(path=str(artifacts/f'listening-next-question-{width}.png'),full_page=True)
  # Keyboard edits save independently; failed saves block Next until recovered.
  page.evaluate('fixture.playingBefore=fixture.checkedElement')
  page.get_by_role('radio').first.focus();page.keyboard.press('Space');page.get_by_text('1/39 answers saved',exact=True).wait_for()
  correct=page.evaluate('fixture.paper.questions[0].correct');page.evaluate('fixture.failNext=true');page.get_by_role('radio').nth(ord(correct)-65).check()
  page.get_by_role('button',name='Retry saving answer',exact=True).wait_for();assert page.get_by_role('button',name='Next',exact=True).is_disabled()
  page.get_by_role('button',name='Retry saving answer',exact=True).click();page.wait_for_function('fixture.last.answers[1]===fixture.paper.questions[0].correct')
  assert page.evaluate('fixture.playingBefore===fixture.checkedElement&&!fixture.playingBefore.paused')
  # Two clicks in the same event turn may advance only once.
  page.get_by_role('button',name='Next',exact=True).evaluate('(b)=>{b.click();b.click()}');question(page,2);buttons(page,2)
  assert page.evaluate('fixture.calls.filter(c=>c.p_action==="next").length')==1
  assert page.evaluate('fixture.last.answers[1]===fixture.paper.questions[0].correct')
  assert page.evaluate('fixture.last.deadline')==identity['deadline'];assert page.evaluate('fixture.last.startedAt')==identity['started']
  page.wait_for_function('fixture.checkedElement.src.endsWith("q-02.mp3")&&!fixture.checkedElement.paused&&fixture.checkedElement.currentTime>.1',timeout=10000)
  assert page.evaluate('fixture.checkedElement.currentTime')<3
  assert page.evaluate('fixture.last.result') is None
  # Choose one wrong answer and reopen: current position/deadline/audio are kept.
  wrong=page.evaluate("'ABCD'.split('').find(x=>x!==fixture.paper.questions[1].correct)")
  page.get_by_role('radio').nth(ord(wrong)-65).check();page.get_by_text('2/39 answers saved',exact=True).wait_for()
  before_time=page.evaluate('fixture.checkedElement.currentTime')
  page.get_by_role('button',name='← TEF/TCF AI Tests',exact=True).click();page.get_by_role('button',name='Open TCF Listening test',exact=True).click();page.get_by_role('button',name='Resume test',exact=False).click();question(page,2);buttons(page,2)
  assert page.evaluate('fixture.last.id')==identity['id'];assert page.evaluate('fixture.last.deadline')==identity['deadline']
  page.wait_for_function('(t)=>fixture.audios.some(a=>a.src.endsWith("q-02.mp3")&&!a.paused&&a.currentTime>t)',arg=before_time,timeout=10000)
  # A lost committed Next reply reconciles Q3 without accidentally advancing Q4.
  page.evaluate('fixture.loseAction="next"');page.get_by_role('button',name='Next',exact=True).click();question(page,3);buttons(page,3)
  assert page.evaluate('fixture.last.currentQuestion')==3;assert page.evaluate('fixture.calls.filter(c=>c.p_action==="next").length')==2
  assert page.evaluate('fixture.last.deadline')==identity['deadline']
  assert 'ended' in page.evaluate('fixture.rpcAnswerError(2)')
  assert 'current question' in page.evaluate('fixture.rpcAnswerError(4)')
  early=page.evaluate("async()=>{try{await fixture.command({p_action:'submit',p_id:fixture.last.id,p_payload:{revision:fixture.last.revision}});return null}catch(e){return e.message}}")
  assert early and ('final' in early.lower() or '39' in early)
  # Only playback failures expose the audio recovery button; normal flow has Next.
  page.evaluate('fixture.blockNextPlay=true');page.get_by_role('button',name='Next',exact=True).click();question(page,4)
  page.get_by_role('button',name='Play audio',exact=True).wait_for();assert page.get_by_role('button',name='Next',exact=True).count()==1
  page.get_by_role('button',name='Play audio',exact=True).click()
  page.wait_for_function('fixture.audios.some(a=>a.src.endsWith("q-04.mp3")&&!a.paused&&a.currentTime>.1)',timeout=10000)
  buttons(page,4)
  # Traverse the remaining questions with actual Next actions; blanks remain blank.
  for number in range(4,39):
   buttons(page,number);assert page.evaluate('fixture.last.deadline')==identity['deadline']
   if number==38:page.screenshot(path=str(artifacts/f'listening-next-penultimate-{width}.png'),full_page=True)
   page.get_by_role('button',name='Next',exact=True).click();question(page,number+1)
  buttons(page,39);assert page.evaluate('fixture.last.currentQuestion')==39
  assert page.evaluate('fixture.calls.filter(c=>c.p_action==="next").length')==38
  assert page.evaluate('fixture.last.deadline')==identity['deadline'];assert page.evaluate('fixture.last.startedAt')==identity['started']
  last=page.evaluate('fixture.paper.questions[38].correct');page.get_by_role('radio').nth(ord(last)-65).check();page.get_by_text('3/39 answers saved',exact=True).wait_for()
  page.wait_for_function('fixture.audios.some(a=>a.src.endsWith("q-39.mp3")&&!a.paused&&a.currentTime>.2)',timeout=10000)
  page.screenshot(path=str(artifacts/f'listening-next-final-{width}.png'),full_page=True)
  # One final submission button goes straight to the full marked answer sheet.
  assert page.get_by_role('button',name='Submit test',exact=True).count()==1
  page.get_by_role('button',name='Submit test',exact=True).focus();page.keyboard.press('Enter')
  page.get_by_text('Total score: 2/39 correct · 5.13%',exact=True).wait_for()
  assert page.locator('.hz-reading-correction').count()==39;assert page.get_by_role('radio').count()==0
  assert page.evaluate('fixture.last.result.unanswered')==36
  assert page.locator('.hz-reading-correction').nth(0).locator('li.is-correct').count()==1
  assert page.locator('.hz-reading-correction').nth(1).locator('li.is-incorrect').count()==1
  assert page.locator('.hz-reading-correction').nth(2).get_by_text('Your answer: unanswered.',exact=True).count()==1
  page.locator('.hz-reading-correction').nth(1).get_by_text('Transcription et enregistrement',exact=True).click()
  assert page.evaluate('fixture.paper.questions[1].transcript.split("\\n")[0]') in page.locator('.hz-reading-correction').nth(1).inner_text()
  assert page.get_by_label('Review recording 2',exact=True).count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.hz-reading-correction').nth(1).screenshot(path=str(artifacts/f'listening-next-correction-{width}.png'))
  page.get_by_role('button',name='Listening tests',exact=True).click();page.get_by_role('button',name='View answer sheet',exact=False).click();page.get_by_text('Total score: 2/39 correct · 5.13%',exact=True).wait_for()
  # Retain full recording decode coverage without simulating playback completion.
  decoded=page.evaluate("""async()=>{const results=[];for(const q of fixture.paper.questions){const a=new Audio();a.preload='metadata';a.src='/assets/tcf-listening/v1/audio/'+q.audio;await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=()=>reject(Error(q.audio+' cannot decode'));a.load()});results.push({number:q.number,duration:a.duration,expected:q.audioSeconds});a.removeAttribute('src');a.load()}return results}""")
  assert len(decoded)==39 and all(abs(r['duration']-r['expected'])<.2 for r in decoded)
  # Scheduled advancement remains as a fallback and expiry still grades once.
  page.get_by_role('button',name='Listening tests',exact=True).click();page.get_by_role('button',name='Start Listening Test 01',exact=True).click();question(page,1)
  page.evaluate('fixture.atQuestion(1,fixture.paper.questions[0].slotSeconds-1)');page.evaluate('fixture.ui.open(fixture.last.id)');question(page,2)
  page.evaluate('fixture.expire()');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_text('Total score: 0/39 correct · 0%',exact=True).wait_for(timeout=10000)
  page.evaluate('fixture.switchUser()');assert page.locator('#hz-tcf-listening').inner_text()=='';page.evaluate('fixture.open()');page.get_by_role('button',name='Start Listening Test 01',exact=True).wait_for();assert page.get_by_role('button',name='View answer sheet',exact=False).count()==0
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-listening').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'decodedRecordings':39,'result':'Next on1–38, single final Submit, real MP3 playback/recovery, all38 forward actions, double-click/lost-response safety, saved clocks/resume, pending-answer guard, end-only marking and account isolation passed'}),flush=True)
  page.close()
 browser.close()
