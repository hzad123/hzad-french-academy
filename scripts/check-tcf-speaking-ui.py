from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  page=b.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-speaking.html');page.wait_for_function('fixtureReady');page.evaluate('fixture.open()')
  page.get_by_role('button',name='Start speaking Test 01',exact=True).wait_for()
  page.evaluate('fixture.catalog.wallet.available=0;fixture.open()');assert page.get_by_role('button',name='Start speaking Test 01',exact=True).is_disabled();assert page.evaluate('fixture.charges')==0
  page.evaluate('fixture.catalog.wallet.available=500;fixture.open()');page.get_by_role('button',name='Start speaking Test 01',exact=True).click()
  page.get_by_role('button',name='Send spoken turn · 10 credits',exact=True).click();page.get_by_text('You: Je présente mon opinion.',exact=True).wait_for()
  assert page.evaluate('fixture.charges')==10
  page.get_by_role('button',name='Finish this task',exact=True).click();assert page.get_by_role('button',name='Begin role-play after preparation',exact=True).is_disabled()
  page.evaluate('fixture.toRole()');page.get_by_role('button',name='Send spoken turn · 10 credits',exact=True).click();page.get_by_role('button',name='Finish this task',exact=True).click()
  page.get_by_role('button',name='Send spoken turn · 10 credits',exact=True).click();page.get_by_role('button',name='Finish speaking test',exact=True).click()
  page.get_by_role('button',name='Get TCF speaking feedback · 1 credit',exact=True).click();page.get_by_role('heading',name='Your TCF speaking result',exact=True).wait_for()
  page.get_by_text('Estimated TCF speaking 12/20 · NCLC 8',exact=True).wait_for();assert page.locator('.hz-writing-criterion').count()==3
  assert page.evaluate('fixture.charges')==31;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate('fixture.ui.open("11111111-1111-4111-8111-111111111111")');page.get_by_role('heading',name='Your TCF speaking result',exact=True).wait_for();assert page.evaluate('fixture.charges')==31
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-speaking').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'result':'three stages, microphone turns, preparation gate, TCF/NCLC criterion report below tasks, free saved review and signout passed'}));page.close()
 b.close()
