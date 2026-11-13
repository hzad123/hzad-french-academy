"""Mobile/desktop listening acceptance using real PostgreSQL RPCs and MP3 playback.
Serve repository on127.0.0.1:8765. Test-only SQL clock shifts avoid35minute waits.
No production accounts, provider calls or charges.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
artifacts=Path('/tmp/tcf-listening-qa');artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-listening.html');page.wait_for_function('window.fixtureReady',timeout=60000)
  page.get_by_role('button',name='Open TCF Listening test',exact=True).click()
  start=page.get_by_role('button',name='Start Listening Test 01',exact=True);start.wait_for();assert start.is_disabled()
  # Decode/play actual MP3 preflight; only its ended event unlocks a new attempt.
  page.get_by_label('Check your listening audio').evaluate('(a)=>{fixture.checkedElement=a;a.playbackRate=16;return a.play()}')
  page.wait_for_function('!document.querySelector("[data-start-listening]").disabled');start.click()
  page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for();assert page.get_by_role('radio').count()==4
  page.wait_for_function('fixture.audios.some(a=>a.src.endsWith("q-01.mp3")&&a.currentTime>.2&&!a.paused&&!a.error)',timeout=15000)
  assert page.locator('.hz-listening-image').evaluate('(img)=>img.complete&&img.naturalWidth>0')
  assert page.evaluate('fixture.checkedElement.src.endsWith("q-01.mp3")&&!fixture.checkedElement.controls&&fixture.checkedElement.playbackRate===1')
  assert page.get_by_role('button',name='Next',exact=True).count()==0
  assert page.get_by_role('button',name='Previous',exact=True).count()==0
  assert page.get_by_role('navigation',name='Listening questions').count()==0
  assert page.locator('.hz-reading-answer-sheet').count()==0
  assert page.get_by_text('Transcription et enregistrement',exact=True).count()==0
  first_id=page.evaluate('fixture.last.id');first_deadline=page.evaluate('fixture.last.deadline')
  page.screenshot(path=str(artifacts/f'listening-question-{width}.png'),full_page=True)
  # Keyboard selection and an edit must leave the same playing object in place.
  page.evaluate('fixture.playingBefore=fixture.audios.find(a=>a.src.endsWith("q-01.mp3")&&!a.paused)')
  page.get_by_role('radio').first.focus();page.keyboard.press('Space');page.get_by_text('1/39 answers saved',exact=True).wait_for()
  correct=page.evaluate('fixture.paper.questions[0].correct');page.get_by_role('radio').nth(ord(correct)-65).check();page.wait_for_function('fixture.last.answers[1]===fixture.paper.questions[0].correct')
  assert page.evaluate('fixture.playingBefore===fixture.audios.find(a=>a.src.endsWith("q-01.mp3")&&!a.paused)')
  # A user-triggered recovery seeks forward using the same unlocked media element.
  page.evaluate('fixture.beforeContinue=fixture.playingBefore.currentTime;fixture.playingBefore.pause()')
  page.wait_for_timeout(250);page.get_by_role('button',name='Continue audio',exact=True).click()
  page.wait_for_function('!fixture.playingBefore.paused&&fixture.playingBefore.currentTime>fixture.beforeContinue')
  assert page.evaluate('fixture.playingBefore===fixture.checkedElement')
  assert page.evaluate('fixture.last.result') is None
  assert 'current question' in page.evaluate('fixture.rpcAnswerError(2)')
  # Leaving/reopening preserves the exact deadline and seeks ahead, never restarts.
  before_time=page.evaluate('fixture.playingBefore.currentTime')
  page.get_by_role('button',name='← TEF/TCF AI Tests',exact=True).click();page.get_by_role('button',name='Open TCF Listening test',exact=True).click()
  page.get_by_role('button',name='Resume test',exact=False).click();page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for()
  assert page.evaluate('fixture.last.id')==first_id;assert page.evaluate('fixture.last.deadline')==first_deadline
  page.wait_for_function('(t)=>fixture.audios.some(a=>a.src.endsWith("q-01.mp3")&&!a.paused&&a.currentTime>t)',arg=before_time,timeout=10000)
  # Force a server window forward; past and future answers are both rejected.
  page.evaluate('fixture.atQuestion(2,1)');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_role('heading',name='Question 2 sur 39',exact=True).wait_for()
  assert 'ended' in page.evaluate('fixture.rpcAnswerError(1)');assert 'current question' in page.evaluate('fixture.rpcAnswerError(3)')
  wrong=page.evaluate("'ABCD'.split('').find(x=>x!==fixture.paper.questions[1].correct)")
  page.evaluate('fixture.failNext=true');page.get_by_role('radio').nth(ord(wrong)-65).check()
  page.get_by_role('button',name='Retry saving answer',exact=True).wait_for();assert page.get_by_role('button',name='Submit listening test',exact=True).is_disabled()
  page.get_by_role('button',name='Retry saving answer',exact=True).click();page.get_by_text('2/39 answers saved',exact=True).wait_for()
  # End the current response window in real time and observe automatic advance.
  page.evaluate('fixture.beforeAuto=fixture.audios.find(a=>a.src.endsWith("q-02.mp3")&&!a.paused)')
  page.evaluate('fixture.atQuestion(2,fixture.paper.questions[1].slotSeconds-1)');page.evaluate('fixture.ui.open(fixture.last.id)')
  page.get_by_role('heading',name='Question 3 sur 39',exact=True).wait_for(timeout=10000)
  assert page.get_by_role('radio').count()==4;assert page.locator('.hz-reading-answer-sheet').count()==0
  page.wait_for_function('fixture.beforeAuto.src.endsWith("q-03.mp3")&&!fixture.beforeAuto.paused&&fixture.beforeAuto.playbackRate===1')
  # A lost successful reply reconciles the saved answer without an extra write.
  page.evaluate('fixture.loseNext=true');page.get_by_role('radio').first.check();page.get_by_text('3/39 answers saved',exact=True).wait_for();assert page.get_by_role('button',name='Retry saving answer',exact=True).count()==0
  # Keep Q3 deliberately blank again, and answer the final question correctly.
  page.evaluate("fixture.command({p_action:'answer',p_id:fixture.last.id,p_payload:{revision:fixture.last.revision,number:3,choice:null}})")
  # An unsaved answer that misses its window is discarded with a visible notice.
  page.evaluate('fixture.atQuestion(4,1)');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_role('heading',name='Question 4 sur 39',exact=True).wait_for()
  page.evaluate('fixture.failNext=true');page.get_by_role('radio').first.check();page.get_by_role('button',name='Retry saving answer',exact=True).wait_for()
  page.evaluate('fixture.atQuestion(5,1)');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_role('heading',name='Question 5 sur 39',exact=True).wait_for()
  page.get_by_text('That question has ended. Its last saved answer is kept.',exact=True).wait_for()
  assert page.get_by_role('button',name='Retry saving answer',exact=True).count()==0
  page.evaluate('fixture.atQuestion(39,1)');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_role('heading',name='Question 39 sur 39',exact=True).wait_for()
  last=page.evaluate('fixture.paper.questions[38].correct');page.get_by_role('radio').nth(ord(last)-65).check();page.get_by_text('3/39 answers saved',exact=True).wait_for()
  page.get_by_role('button',name='Submit listening test',exact=True).click();page.get_by_role('button',name='Keep listening',exact=True).click();assert page.get_by_role('button',name='Confirm submission',exact=True).count()==0
  page.get_by_role('button',name='Submit listening test',exact=True).click();page.get_by_role('button',name='Confirm submission',exact=True).click()
  page.get_by_text('Total score: 2/39 correct · 5.13%',exact=True).wait_for()
  assert page.locator('.hz-reading-correction').count()==39;assert page.get_by_role('radio').count()==0
  assert page.locator('.hz-reading-correction').nth(0).locator('li.is-correct').count()==1
  assert page.locator('.hz-reading-correction').nth(1).locator('li.is-incorrect').count()==1
  assert page.locator('.hz-reading-correction').nth(2).get_by_text('Your answer: unanswered.',exact=True).count()==1
  page.locator('.hz-reading-correction').nth(1).get_by_text('Transcription et enregistrement',exact=True).click()
  assert page.evaluate('fixture.paper.questions[1].transcript.split("\\n")[0]') in page.locator('.hz-reading-correction').nth(1).inner_text()
  assert page.get_by_label('Review recording 2',exact=True).count()==1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.hz-reading-correction').nth(1).screenshot(path=str(artifacts/f'listening-correction-{width}.png'))
  page.get_by_role('button',name='Listening tests',exact=True).click();page.get_by_role('button',name='View answer sheet',exact=False).click();page.get_by_text('Total score: 2/39 correct · 5.13%',exact=True).wait_for()
  # Metadata decode every shipped recording, independently of fixture timing.
  decoded=page.evaluate("""async()=>{const results=[];for(const q of fixture.paper.questions){const a=new Audio();a.preload='metadata';a.src='/assets/tcf-listening/v1/audio/'+q.audio;await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=()=>reject(Error(q.audio+' cannot decode'));a.load()});results.push({number:q.number,duration:a.duration,expected:q.audioSeconds});a.removeAttribute('src');a.load()}return results}""")
  assert len(decoded)==39 and all(abs(r['duration']-r['expected'])<.2 for r in decoded)
  # Timer expiry completes saved work automatically, with no new submission.
  page.get_by_role('button',name='Listening tests',exact=True).click();page.get_by_role('button',name='Start Listening Test 01',exact=True).click();page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for();page.evaluate('fixture.expire()');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_text('Total score: 0/39 correct · 0%',exact=True).wait_for(timeout=10000)
  page.evaluate('fixture.switchUser()');assert page.locator('#hz-tcf-listening').inner_text()=='';page.evaluate('fixture.open()');page.get_by_role('button',name='Start Listening Test 01',exact=True).wait_for();assert page.get_by_role('button',name='View answer sheet',exact=False).count()==0
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-listening').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'decodedRecordings':39,'result':'real MP3 playback, audio-check gating, keyboard/edit autosave, fixed clocks/resume seeking, forward-only timing, recovery, end-only right/wrong/blank corrections, score, review and account isolation passed'}),flush=True)
  page.close()
 browser.close()
