"""Local acceptance: real UI + real handler, isolated DB/provider fixtures."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('/tmp/tcf-writing-evidence');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-writing.html');page.wait_for_function('fixtureReady===true')
  page.locator('#hz-exams-launch').click();page.get_by_role('button',name='Open TCF Writing tests',exact=True).click()
  page.get_by_role('heading',name='TCF Writing · 20 tests',exact=True).wait_for();assert page.locator('.hz-writing-test').count()==20
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'catalog-{width}.png'),full_page=True)
  page.get_by_role('button',name='Start Test 01',exact=True).click();page.get_by_role('heading',name='TCF Writing · Test 01',exact=True).wait_for()
  assert page.locator('.hz-writing-task').count()==3;assert page.locator('textarea').count()==3;assert page.locator('.hz-writing-documents article').count()==2
  assert 'Bretagne' in page.locator('.hz-writing-prompt').first.inner_text()
  task2=page.locator('.hz-writing-task').nth(1)
  assert task2.get_by_role('heading',name='Sujet :',exact=True).count()==1
  assert task2.get_by_role('heading',name='Consigne :',exact=True).count()==1
  assert task2.get_by_text('(120 mots minimum / 150 mots maximum)',exact=True).count()==1
  assert 'Rédigez un message pour raconter un voyage marquant' in task2.inner_text()
  answers=['Je suis aller '+' '.join(['bonjour']*68),' '.join(['voyage']*125),' '.join(['travail']*125)]
  for i,text in enumerate(answers,1):page.locator(f'#hz-writing-response-{i}').fill(text)
  page.get_by_text('All three responses saved.',exact=True).wait_for()
  assert page.evaluate('[...fixture.rows.values()][0].responses')==answers
  assert page.evaluate('fixture.charges')==0;assert page.evaluate('fixture.providerCalls')==0
  assert '71 mots' in page.locator('#hz-writing-count-1').inner_text()
  page.screenshot(path=str(out/f'tasks-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  first_deadline=page.evaluate('[...fixture.rows.values()][0].deadline')
  for repeat in range(5):
   if repeat%2:page.locator('#hz-global-back').click()
   else:page.get_by_role('button',name='All 20 writing tests',exact=True).click()
   page.get_by_role('button',name='Resume Test 01',exact=True).click();page.get_by_role('heading',name='TCF Writing · Test 01',exact=True).wait_for()
   assert page.locator('#hz-writing-response-1').input_value()==answers[0]
   assert page.evaluate('fixture.rows.size')==1
   assert page.evaluate('[...fixture.rows.values()][0].deadline')==first_deadline
  page.evaluate('fixture.paused=true')
  for number in ['02','03','04']:
   page.get_by_role('button',name='All 20 writing tests',exact=True).click();page.get_by_role('button',name='Start Test '+number,exact=True).click();page.get_by_role('heading',name='TCF Writing · Test '+number,exact=True).wait_for()
   assert page.locator('textarea:enabled').count()==3
  assert page.evaluate('fixture.charges')==0;assert page.evaluate('fixture.providerCalls')==0
  page.evaluate('fixture.paused=false');page.get_by_role('button',name='All 20 writing tests',exact=True).click();page.get_by_role('button',name='Resume Test 01',exact=True).click();assert page.locator('#hz-writing-response-1').input_value()==answers[0]
  page.get_by_role('button',name='Tâche 3',exact=True).click();assert page.locator('#hz-writing-response-3').evaluate('(n)=>n===document.activeElement')
  page.evaluate('fixture.delay=true');page.get_by_role('button',name='Get AI feedback · 1 credit',exact=True).click();page.wait_for_function('!!fixture.release');assert page.get_by_role('button',name='Get AI feedback · 1 credit',exact=True).is_disabled();page.evaluate('fixture.release();fixture.delay=false');page.get_by_role('heading',name='Your writing result',exact=True).wait_for()
  page.get_by_text('12/20',exact=True).wait_for();page.get_by_text('NCLC 8',exact=True).wait_for();page.locator('ins').get_by_text('Je suis allé',exact=True).wait_for()
  assert page.locator('.hz-writing-corrections').count()==3;assert page.locator('textarea:disabled').count()==3
  assert page.locator('.hz-writing-criterion').count()==3
  for name in ['Linguistic competence','Pragmatic competence','Sociolinguistic competence']:page.get_by_role('heading',name=name,exact=True).wait_for()
  assert page.get_by_role('heading',name='How to improve this criterion',exact=True).count()==3
  page.get_by_text('Total estimated TCF writing score',exact=True).wait_for();page.get_by_text('NCLC equivalent',exact=True).wait_for()
  page.get_by_text('Tâche 2: link the activities to your impressions and explain why the experience mattered.',exact=True).wait_for()
  assert page.get_by_role('button',name='Update TCF feedback · 1 credit',exact=True).count()==0
  assert page.evaluate('fixture.charges')==1;assert page.evaluate('fixture.providerCalls')==1
  page.screenshot(path=str(out/f'feedback-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='All 20 writing tests',exact=True).click();page.get_by_role('button',name='Test 01 ·',exact=False).click();page.get_by_text('12/20',exact=True).wait_for()
  assert page.evaluate('fixture.charges')==1;assert page.evaluate('fixture.providerCalls')==1
  page.get_by_role('button',name='All 20 writing tests',exact=True).click();page.get_by_role('button',name='Start Test 20',exact=True).click()
  page.locator('#hz-writing-response-1').fill('Une réponse sauvegardée.');page.get_by_text('All three responses saved.',exact=True).wait_for()
  page.evaluate('fixture.failSave=true');page.locator('#hz-writing-response-1').fill('Une réponse à conserver après une erreur.');page.get_by_text('Writing connection interrupted',exact=True).wait_for()
  page.evaluate('fixture.failSave=false');page.get_by_role('button',name='Save responses',exact=True).click();page.get_by_text('All three responses saved.',exact=True).wait_for()
  # Simulate a second tab saving while this tab retains an unsaved revision.
  page.evaluate('fixture.failSave=true');page.locator('#hz-writing-response-1').fill('Mon texte local à conserver.');page.get_by_text('Writing connection interrupted',exact=True).wait_for()
  page.evaluate("fixture.failSave=false;const r=[...fixture.rows.values()].find(r=>r.testId==='tcf-writing-20');r.responses[0]='Texte enregistré par un autre onglet.';r.revision++;fixture.ui.open(r.id)")
  page.get_by_role('button',name='Keep my text',exact=True).wait_for();assert page.locator('#hz-writing-response-1').input_value()=='Mon texte local à conserver.'
  page.get_by_role('button',name='Keep my text',exact=True).click();page.get_by_role('button',name='Keep my text',exact=True).wait_for(state='detached')
  assert page.evaluate("[...fixture.rows.values()].find(r=>r.testId==='tcf-writing-20').responses[0]")=='Mon texte local à conserver.'
  page.locator('#hz-global-back').click();page.get_by_role('heading',name='TCF Writing · 20 tests',exact=True).wait_for()
  page.get_by_role('button',name='Test 20 ·',exact=False).click();assert page.locator('#hz-writing-response-1').input_value()=='Mon texte local à conserver.'
  page.locator('#hz-ai-launch').click();assert page.locator('#hz-tcf-writing').inner_text()=='';assert 'TCF' not in page.locator('#hz-ai-learning').inner_text()
  page.evaluate('fixture.switchUser()');assert page.locator('#hz-tcf-writing').inner_text()==''
  page.locator('#hz-exams-launch').click();page.get_by_role('button',name='Open TCF Writing tests',exact=True).click();assert page.locator('.hz-writing-history .hz-btn').count()==0
  page.get_by_role('button',name='Start Test 02',exact=True).click();assert page.locator('#hz-writing-response-1').input_value()==''
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-writing').inner_text()=='';assert errors==[],errors
  # A completed legacy assessment is free to view; updating it is explicit.
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-writing.html');page.wait_for_function('fixtureReady===true')
  page.locator('#hz-exams-launch').click();page.get_by_role('button',name='Open TCF Writing tests',exact=True).click()
  page.get_by_role('button',name='Start Test 01',exact=True).click()
  for i,text in enumerate(answers,1):page.locator(f'#hz-writing-response-{i}').fill(text)
  page.get_by_text('All three responses saved.',exact=True).wait_for();page.get_by_role('button',name='Get AI feedback · 1 credit',exact=True).click()
  page.get_by_role('heading',name='Your writing result',exact=True).wait_for()
  page.evaluate("const r=[...fixture.requests.values()][0].result;r.rubricVersion='tcf-writing-public-criteria-v1';for(const c of r.criteria)delete c.improvement;fixture.ui.open([...fixture.rows.keys()][0])")
  page.get_by_role('button',name='Update TCF feedback · 1 credit',exact=True).wait_for();assert page.evaluate('fixture.providerCalls')==1
  page.get_by_role('button',name='Update TCF feedback · 1 credit',exact=True).click()
  page.get_by_text('Tâche 2: link the activities to your impressions and explain why the experience mattered.',exact=True).wait_for()
  assert page.get_by_role('button',name='Update TCF feedback · 1 credit',exact=True).count()==0
  assert page.evaluate('fixture.providerCalls')==2;assert page.evaluate('fixture.rows.size')==1;assert page.evaluate('fixture.requests.size')==2
  assert page.locator('#hz-writing-response-1').input_value()==answers[0]
  # Check the supplied Task 2 structure on every newly opened paper.
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-writing.html');page.wait_for_function('fixtureReady===true')
  page.locator('#hz-exams-launch').click();page.get_by_role('button',name='Open TCF Writing tests',exact=True).click()
  for number in range(1,21):
   label=str(number).zfill(2);page.get_by_role('button',name='Start Test '+label,exact=True).click();page.get_by_role('heading',name='TCF Writing · Test '+label,exact=True).wait_for()
   task2=page.locator('.hz-writing-task').nth(1);assert task2.get_by_role('heading',name='Sujet :',exact=True).count()==1
   assert task2.get_by_role('heading',name='Consigne :',exact=True).count()==1
   assert task2.get_by_text('(120 mots minimum / 150 mots maximum)',exact=True).count()==1
   assert 'Rédigez un message pour raconter' in task2.inner_text();assert 'et expliquez pourquoi' in task2.inner_text()
   page.get_by_role('button',name='All 20 writing tests',exact=True).click()
  assert page.evaluate('fixture.providerCalls')==0;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert errors==[],errors
  page.get_by_role('button',name='Resume Test 02',exact=True).click()
  for i,text in enumerate(answers,1):page.locator(f'#hz-writing-response-{i}').fill(text)
  page.get_by_text('All three responses saved.',exact=True).wait_for();deadline=page.evaluate("[...fixture.rows.values()].find(r=>r.testId==='tcf-writing-02').deadline")
  page.evaluate('fixture.failProvider=true');page.get_by_role('button',name='Get AI feedback · 1 credit',exact=True).click()
  page.get_by_role('button',name='Retry saved feedback · 1 credit',exact=True).wait_for()
  page.get_by_text('Assessment reference: insufficient_quota',exact=True).wait_for()
  assert page.evaluate('fixture.balance')==100
  assert page.locator('#hz-writing-response-1').input_value()==answers[0]
  page.evaluate('fixture.failProvider=false');page.get_by_role('button',name='Retry saved feedback · 1 credit',exact=True).click()
  page.get_by_role('heading',name='Your writing result',exact=True).wait_for();page.get_by_text('12/20',exact=True).wait_for()
  assert page.evaluate('fixture.balance')==99;assert page.evaluate('fixture.providerCalls')==2;assert page.evaluate('fixture.rows.size')==20
  assert page.evaluate("[...fixture.rows.values()].find(r=>r.testId==='tcf-writing-02').deadline")==deadline
  assert page.locator('#hz-writing-response-1').input_value()==answers[0];assert errors==[],errors

  print(json.dumps({'viewport':width,'result':'20 tests, repeated Back/resume without duplicates or timer resets, switching papers while AI paused, 3 editors, source documents, word counts, autosave/reopen, keyboard jump, TCF/NCLC result, mistake-only view, one charge, free review, save retry, account isolation and no overflow/JS errors passed'}));page.close()
 browser.close()
