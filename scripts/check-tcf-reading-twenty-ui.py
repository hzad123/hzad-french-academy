"""All20 paper selections and marked results against actual local PostgreSQL.
Run with the repository served on127.0.0.1:8765; no production accounts or charges.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
artifacts=Path('/tmp/tcf-reading20-qa');artifacts.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-reading.html');page.wait_for_function('window.fixtureReady',timeout=60000)
  page.get_by_role('button',name='Open TCF Reading tests',exact=True).click()
  selector=page.get_by_label('Choose a TCF reading test');selector.wait_for();assert selector.locator('option').count()==20
  rows=page.evaluate("async()=> (await fixture.db.query('select content from academy_tcf_reading.papers order by id')).rows.map(r=>r.content)")
  saved=[]
  for number,paper in enumerate(rows,1):
   selector=page.get_by_label('Choose a TCF reading test');selector.select_option(paper['id'])
   page.get_by_role('button',name=f'Start Reading Test {number:02}',exact=True).click()
   page.get_by_role('heading',name=f'TCF Reading · Test {number:02}',exact=True).wait_for()
   page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for();assert page.get_by_role('radio').count()==4
   assert page.get_by_role('navigation',name='Reading questions').get_by_role('button').count()==39
   assert paper['questions'][0]['passage'] in page.locator('.hz-reading-passage').inner_text()
   identity=page.evaluate('({id:fixture.last.id,deadline:fixture.last.deadline,testId:fixture.last.testId,version:fixture.last.version})');assert identity['testId']==paper['id'];assert identity['version']==paper['version']
   correct=paper['questions'][0]['correct'];page.get_by_role('radio').nth(ord(correct)-65).check();page.get_by_text('1/39 answers saved',exact=True).wait_for()
   # Visit another paper while this one remains unfinished. Neither paper's clock resets.
   page.get_by_role('button',name='All reading tests',exact=True).click();other='tcf-reading-20' if number!=20 else 'tcf-reading-01'
   page.get_by_label('Choose a TCF reading test').select_option(other);page.get_by_role('button',name='Start Reading Test '+other[-2:],exact=True).click();page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for()
   assert page.evaluate('fixture.last.testId')==other
   page.get_by_role('button',name='All reading tests',exact=True).click();page.get_by_label('Choose a TCF reading test').select_option(paper['id']);page.get_by_role('button',name=f'Start Reading Test {number:02}',exact=True).click();page.get_by_role('heading',name='Question 1 sur 39',exact=True).wait_for()
   assert page.evaluate('fixture.last.id')==identity['id'];assert page.evaluate('fixture.last.deadline')==identity['deadline'];assert page.get_by_role('radio').nth(ord(correct)-65).is_checked()
   page.get_by_role('button',name='Next',exact=True).click();wrong=next(x for x in 'ABCD' if x!=paper['questions'][1]['correct']);page.get_by_role('radio').nth(ord(wrong)-65).check();page.get_by_text('2/39 answers saved',exact=True).wait_for()
   page.get_by_role('button',name='Question 39',exact=True).click();assert paper['questions'][38]['passage'] in page.locator('.hz-reading-passage').inner_text()
   last=paper['questions'][38]['correct'];page.get_by_role('radio').nth(ord(last)-65).check();page.get_by_text('3/39 answers saved',exact=True).wait_for()
   page.get_by_role('button',name='Submit reading test',exact=True).click();page.get_by_role('button',name='Confirm submission',exact=True).click()
   page.get_by_text('Total score: 2/39 correct · 36/699 points',exact=True).wait_for();assert page.locator('.hz-reading-correction').count()==39
   assert page.locator('.hz-reading-correction').nth(0).locator('li.is-correct').count()==1;assert page.locator('.hz-reading-correction').nth(1).locator('li.is-incorrect').count()==1
   assert paper['questions'][1]['explanation'] in page.locator('.hz-reading-correction').nth(1).inner_text()
   assert page.locator('.hz-reading-correction').nth(2).get_by_text('Your answer: unanswered.',exact=True).count()==1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.get_by_role('radio').count()==0
   saved.append(identity);page.get_by_role('button',name='Reading tests',exact=True).click()
   # Free reopening after another selection still shows the completed original paper.
   page.get_by_label('Choose a TCF reading test').select_option(other)
   page.evaluate('(id)=>fixture.ui.open(id)',identity['id']);page.get_by_text('Total score: 2/39 correct · 36/699 points',exact=True).wait_for();assert page.get_by_role('heading',name=f'TCF Reading · Test {number:02}',exact=True).count()==1
   page.get_by_role('button',name='Reading tests',exact=True).click()
  assert len(set(r['id'] for r in saved))==20
  page.screenshot(path=str(artifacts/f'reading20-catalog-{width}.png'),full_page=False)
  page.evaluate('fixture.switchUser()');assert page.locator('#hz-tcf-reading').inner_text()=='';page.evaluate('fixture.open()');page.get_by_label('Choose a TCF reading test').wait_for();assert page.get_by_role('button',name='View answer sheet',exact=False).count()==0
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-reading').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'papers':20,'result':'all39question/four-choice formats, selection, independent pending attempts/clocks, correct/wrong/blank grading, original-paper reopening and account isolation passed'}))
  page.close()
 browser.close()
