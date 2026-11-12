"""Desktop/mobile acceptance against the actual Postgres reading RPC in PGlite.
Serve the repository on 127.0.0.1:8765. No production, AI calls or charges.
"""
from playwright.sync_api import sync_playwright
import json
from pathlib import Path
artifacts=Path("/tmp/tcf-reading-qa");artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-reading.html');page.wait_for_function('window.fixtureReady',timeout=60000)
  page.get_by_role('button',name='Open TCF Reading tests',exact=True).click()
  page.get_by_role('button',name='Start Reading Test 01',exact=True).click()
  page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for()
  assert page.get_by_role('radio').count()==4;assert page.get_by_role('navigation',name='Reading questions').get_by_role('button').count()==39
  assert page.locator('.hz-reading-answer-sheet').count()==0
  page.screenshot(path=str(artifacts/f'reading-question-{width}.png'),full_page=True)
  first_id=page.evaluate('fixture.last.id');first_deadline=page.evaluate('fixture.last.deadline')
  # Keyboard selection, then changing the saved choice before submission.
  page.get_by_role('radio').first.focus();page.keyboard.press('Space');page.get_by_text('1/39 answers saved',exact=True).wait_for();assert page.evaluate('fixture.last.answers[1]')=='A'
  page.get_by_role('radio').nth(3).check();page.wait_for_function('fixture.last.answers[1]==="D"')
  page.get_by_role('button',name='Next',exact=True).click();page.get_by_role('radio').first.check();page.get_by_text('2/39 answers saved',exact=True).wait_for()
  # A transport failure keeps the selection for explicit recovery and blocks submission.
  page.get_by_role('button',name='Next',exact=True).click();page.evaluate('fixture.failNext=true');page.get_by_role('radio').nth(2).check()
  page.get_by_role('button',name='Retry saving answer',exact=True).wait_for();assert page.get_by_role('button',name='Submit reading test',exact=True).is_disabled()
  page.get_by_role('button',name='Go back to the previous view',exact=True).click();page.get_by_label('Choose a TCF reading test').select_option('tcf-reading-02');assert page.get_by_role('button',name='Start Reading Test 02',exact=True).is_disabled();page.get_by_role('button',name='Recover unsaved answer',exact=True).click();page.get_by_role('button',name='Retry saving answer',exact=True).wait_for()
  page.get_by_role('button',name='Retry saving answer',exact=True).click();page.get_by_text('3/39 answers saved',exact=True).wait_for()
  # Uncertain transport after commit reconciles saved answers, without a second answer write.
  page.get_by_role('button',name='Next',exact=True).click();page.evaluate('fixture.loseNext=true');page.get_by_role('radio').nth(2).check();page.get_by_text('4/39 answers saved',exact=True).wait_for();assert page.get_by_role('button',name='Retry saving answer',exact=True).count()==0
  # Competing tab revision requires an explicit choice; it cannot overwrite silently.
  page.evaluate('fixture.externalAnswer(5)');page.get_by_role('button',name='Next',exact=True).click();page.get_by_role('radio').nth(2).check();page.get_by_role('button',name='Save my choice instead',exact=True).wait_for();assert page.evaluate('fixture.last.answers[5]')=='A'
  page.get_by_role('button',name='Save my choice instead',exact=True).click();page.wait_for_function('fixture.last.answers[5]==="C"')
  # Navigation back to exam area and reopen preserves all answers and server deadline.
  page.get_by_role('button',name='← TEF/TCF AI Tests',exact=True).click();page.get_by_role('button',name='Open TCF Reading tests',exact=True).click()
  page.get_by_role('button',name='Resume test',exact=False).click();page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for()
  assert page.evaluate('fixture.last.id')==first_id;assert page.evaluate('fixture.last.deadline')==first_deadline;assert page.get_by_role('radio').nth(3).is_checked()
  page.get_by_role('button',name='Question 39',exact=True).click();page.get_by_role('radio').nth(3).check();page.get_by_text('6/39 answers saved',exact=True).wait_for()
  page.get_by_role('button',name='Submit reading test',exact=True).click();page.get_by_text('33 unanswered. You cannot change answers after submitting.',exact=True).wait_for()
  page.get_by_role('button',name='Keep working',exact=True).click();assert page.get_by_role('button',name='Confirm submission',exact=True).count()==0
  page.get_by_role('button',name='Submit reading test',exact=True).click();page.get_by_role('button',name='Confirm submission',exact=True).dblclick()
  page.get_by_role('heading',name='Your marked answer sheet',exact=True).wait_for();assert page.locator('.hz-reading-correction').count()==39
  assert page.locator('.hz-reading-correction').nth(0).get_by_text('D. Modifier leur vol gratuitement · ✓ Correct answer · Your answer',exact=True).count()==1
  assert page.locator('.hz-reading-correction').nth(1).get_by_text('A. Un service de livraison à domicile · Your answer',exact=True).count()==1
  assert page.locator('.hz-reading-correction').nth(1).get_by_text('B. Un retour des livres sans retard pénalisé · ✓ Correct answer',exact=True).count()==1
  # Q1,3,4,39 correct:42points; Q2/5 wrong;33blank.
  page.get_by_text('Total score: 4/39 correct · 42/699 points',exact=True).wait_for()
  assert page.locator('.hz-reading-correction').nth(5).get_by_text('Your answer: unanswered.',exact=True).count()==1
  assert page.get_by_role('radio').count()==0;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('.hz-reading-total').evaluate('(n)=>n.compareDocumentPosition(document.querySelectorAll(".hz-reading-correction")[38]) & Node.DOCUMENT_POSITION_PRECEDING')
  page.screenshot(path=str(artifacts/f'reading-result-{width}.png'),full_page=False)
  page.locator('.hz-reading-correction').nth(1).screenshot(path=str(artifacts/f'reading-correction-{width}.png'))
  page.get_by_role('button',name='Reading tests',exact=True).click();page.get_by_role('button',name='View answer sheet',exact=False).click();page.get_by_text('Total score: 4/39 correct · 42/699 points',exact=True).wait_for()
  # New attempt timer expiration grades saved answers automatically.
  page.get_by_role('button',name='Reading tests',exact=True).click();page.get_by_label('Choose a TCF reading test').select_option('tcf-reading-01');page.get_by_role('button',name='Start Reading Test 01',exact=True).click();page.get_by_role('radio').nth(3).check();page.get_by_text('1/39 answers saved',exact=True).wait_for();page.evaluate('fixture.expire()');page.evaluate('fixture.ui.open(fixture.last.id)');page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for();page.get_by_text('Total score: 1/39 correct · 3/699 points',exact=True).wait_for()
  # A different account clears the previous paper/results; signout clears all reading UI.
  page.evaluate('fixture.switchUser()');assert page.locator('#hz-tcf-reading').inner_text()==''
  page.evaluate('fixture.open()');page.get_by_role('button',name='Start Reading Test 01',exact=True).wait_for();assert page.get_by_role('button',name='View answer sheet',exact=False).count()==0
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-reading').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'result':'39 radios/questions, keyboard editing, autosave/recovery/conflicts, timer/reopen, end-only corrections, wrong/right/blank totals, saved review and account isolation passed'}))
  page.close()
 browser.close()
