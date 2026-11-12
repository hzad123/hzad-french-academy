"""Speaking controls/timers and real Chromium microphone -> WAV -> submit checks.
Start a repository HTTP server on 127.0.0.1:8765. No provider calls are made.
"""
from playwright.sync_api import sync_playwright
import json, math, struct, wave
with wave.open('/tmp/tcf-speaking-microphone.wav','wb') as audio:
 audio.setparams((1,2,48000,0,'NONE','not compressed'))
 audio.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*440*n/48000))) for n in range(48000*4)))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture=/tmp/tcf-speaking-microphone.wav'])
 for width in [390,1440]:
  page=b.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-speaking.html');page.wait_for_function('fixtureReady');page.evaluate('fixture.open()')
  start=page.get_by_role('button',name='Start speaking Test 01',exact=True);start.wait_for()
  page.evaluate('fixture.catalog.wallet.available=0;fixture.open()');assert start.is_disabled();assert page.evaluate('fixture.charges')==0
  page.evaluate('fixture.catalog.wallet.available=500;fixture.open();fixture.holdExaminer=true');start.click()
  page.get_by_text('Examiner speaking…',exact=True).wait_for();assert not page.evaluate('fixture.recording');page.get_by_role('button',name='Submit response',exact=True).click();assert page.evaluate('fixture.charges')==0;page.evaluate('fixture.holdExaminer=false;fixture.finishExaminer()');page.wait_for_function('fixture.recording');assert page.evaluate('fixture.starts')==1
  submit=page.get_by_role('button',name='Submit response',exact=True);assert submit.count()==1;assert page.locator('#hz-tcf-speaking > .hz-writing-task').count()==3
  assert page.get_by_role('button',name='Stop recording',exact=True).count()==0
  submit.click();page.wait_for_function('fixture.charges===10 && fixture.phase===1');assert page.get_by_role('button',name='Get TCF speaking feedback · 1 credit',exact=True).count()==0;page.evaluate('fixture.reopen(0)');page.wait_for_function('fixture.recording');assert len(page.evaluate('fixture.sent.filter(x=>x.kind==="turn")'))==1
  # A new response times out: one automatic send, then next question/recording.
  page.evaluate('fixture.expireResponse()');page.wait_for_function('fixture.charges===20 && fixture.recording')
  # Failed transport retains the exact WAV and call ID; retry is explicit.
  page.evaluate('fixture.failNext=true');submit.click();page.get_by_text('Connection interrupted. Press Submit response to retry the saved audio.',exact=True).wait_for();assert page.evaluate('fixture.charges')==20
  submit.click();page.wait_for_function('fixture.charges===30 && fixture.phase===1');page.evaluate('fixture.reopen(0)');page.wait_for_function('fixture.recording');sent=page.evaluate('fixture.sent.filter(x=>x.kind==="turn")');assert sent[-1]['callId']==sent[-2]['callId'];assert sent[-1]['audio']==sent[-2]['audio']
  # A processing response is reconciled without redispatch or second charge.
  page.evaluate('fixture.deferNext=true');submit.click();page.get_by_text('Your response is being processed. It will not be sent twice.',exact=True).wait_for();page.evaluate('fixture.finishPending()');page.wait_for_function('fixture.charges===40 && fixture.phase===1');assert len(page.evaluate('fixture.sent.filter(x=>x.kind==="turn")'))==5
  # Timer expiry saves the active buffer, advances to preparation automatically.
  page.evaluate('fixture.reopen(0,800)');page.wait_for_function('fixture.phase===1');assert page.evaluate('fixture.charges')==50;assert not page.evaluate('fixture.recording');assert submit.count()==0
  # Preparation expiry is free and starts candidate-led role-play automatically.
  page.evaluate('fixture.reopen(1,300)');page.wait_for_function('fixture.phase===2 && fixture.recording');assert page.evaluate('fixture.charges')==50
  submit.click();page.wait_for_function('fixture.phase===3 && fixture.recording');assert page.get_by_role('button',name='Get TCF speaking feedback · 1 credit',exact=True).count()==0;assert page.evaluate('fixture.charges')==60
  submit.click();page.get_by_role('button',name='Get TCF speaking feedback · 1 credit',exact=True).wait_for();assert page.evaluate('fixture.phase')==4
  page.get_by_role('button',name='Get TCF speaking feedback · 1 credit',exact=True).click();page.get_by_role('heading',name='Your TCF speaking result',exact=True).wait_for()
  page.get_by_text('Estimated TCF speaking 12/20 · NCLC 8',exact=True).wait_for();assert page.locator('.hz-writing-criterion').count()==3;page.get_by_text('Total TCF speaking score: 12/20 · NCLC 8',exact=True).wait_for()
  assert page.evaluate('fixture.charges')==71;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate('fixture.ui.open("11111111-1111-4111-8111-111111111111")');page.get_by_role('heading',name='Your TCF speaking result',exact=True).wait_for();assert page.evaluate('fixture.charges')==71
  page.evaluate('fixture.signOut()');assert page.locator('#hz-tcf-speaking').inner_text()=='';assert errors==[],errors
  print(json.dumps({'viewport':width,'result':'one Submit, examiner-first recording, explicit transport retry, pending reconciliation, timed submit/advance/preparation, TCF/NCLC feedback, free review, signout passed'}));page.close()
 # Real browser microphone/AudioContext/PCM encoder. Fixture only replaces network/provider.
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-speaking.html?real');page.wait_for_function('fixtureReady');page.evaluate('fixture.open()');page.get_by_role('button',name='Start speaking Test 01',exact=True).click()
 page.wait_for_function('fixture.recorder?.isRecording()');page.wait_for_timeout(1600)
 page.get_by_role('button',name='Submit response',exact=True).click();page.wait_for_function('fixture.charges===10')
 info=page.evaluate('fixture.audioInfo');assert .5<info['seconds']<3,info;assert info['bytes']>16000,info
 assert page.evaluate('fixture.sent.filter(x=>x.kind==="turn").length')==1
 page.evaluate('fixture.reopen(0)');page.wait_for_function('fixture.recorder.isRecording()');page.evaluate('fixture.recorder.start(.8)');page.wait_for_function('fixture.charges===20');assert page.evaluate('fixture.sent.filter(x=>x.kind==="turn").length')==2
 page.evaluate('fixture.signOut()');assert not page.evaluate('fixture.recorder.isRecording()');assert errors==[],errors
 print(json.dumps({'realMicrophoneWav':info,'result':'Submit and response timeout each finalized actual PCM microphone capture and sent one validated WAV'}));page.close()
 # Permission denial remains recoverable and spends nothing.
 page=b.new_page();page.goto('http://127.0.0.1:8765/tests/fixtures/tcf-speaking.html');page.wait_for_function('fixtureReady');page.evaluate('fixture.open();fixture.denyMic=true');page.get_by_role('button',name='Start speaking Test 01',exact=True).click();page.get_by_text('Allow microphone access in your browser, then start the test again.',exact=True).wait_for();assert page.evaluate('fixture.charges')==0;assert not page.get_by_role('button',name='Start speaking Test 01',exact=True).is_disabled();page.close()
 b.close()
