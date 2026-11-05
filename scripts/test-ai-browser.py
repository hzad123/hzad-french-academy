"""AI studio acceptance: real UI/microphone capture; synthetic backend only."""
import base64,copy,io,json,os,shutil,threading,uuid,wave
from pathlib import Path
from datetime import datetime,timezone
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
os.chdir(Path(__file__).resolve().parents[1])
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
artifacts=Path('dist/ai-qa');artifacts.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
  for width in [390,1280]:
   page=browser.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script("""window.aiTracks=[];const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const stream=await get(options);aiTracks.push(...stream.getTracks());return stream};""")
   state={'enabled':True,'includedCad':10,'wallet':{'available':100,'reserved':0,'budgetAvailable':True,'expiresAt':'2099-01-01T00:00:00Z'},'activities':{k:{'enabled':True,'credits':v} for k,v in [('writing',4),('pronunciation',3),('conversation',2)]},'history':[],'conversations':[]}
   requests={};sessions={};calls=[];lost={'next':True}
   def route_request(route):
    request=route.request
    if request.url.startswith('http://127.0.0.1:'):route.continue_();return
    if '/functions/v1/academy-ai' not in request.url:route.abort();return
    assert request.headers['authorization']=='Bearer local-fixture'
    query=parse_qs(urlparse(request.url).query)
    if request.method=='GET':
     data=requests[query['request'][0]] if 'request' in query else sessions[query['conversation'][0]] if 'conversation' in query else state
     route.fulfill(status=200,content_type='application/json',body=json.dumps(data));return
    body=request.post_data_json;calls.append(copy.deepcopy(body));id=body['id'];kind=body['kind']
    assert body['expectedCredits']==state['activities'][kind]['credits']
    assert not any(k in body for k in ['userId','model','score','credits'])
    if id in requests:route.fulfill(status=200,content_type='application/json',body=json.dumps(requests[id]));return
    if body.get('audio'):
     with wave.open(io.BytesIO(base64.b64decode(body['audio'])),'rb') as recording:
      assert recording.getframerate()==16000 and recording.getnchannels()==1 and recording.getsampwidth()==2
      assert .5<=recording.getnframes()/16000<=30
    response={'id':id,'kind':kind,'level':body['level'],'status':'completed','credits':body['expectedCredits'],'conversationId':None}
    if kind=='writing':response['result']={'correctedText':'Je suis allé au marché.','summary':'Good idea—adjust the past participle.','corrections':[{'original':'<img src=x onerror="window.aiInjected=true">','corrected':'Je suis allé','explanation':'Use allé with être for this past-tense sentence.'}],'suggestions':['Add a detail about your visit.']}
    elif kind=='pronunciation':response['result']={'heardText':'Bonjour.','feedback':'Your rhythm is steady. Practise the nasal vowel.','strengths':['Steady rhythm'],'focus':[{'sound':'on','example':'bonjour','tip':'Let air resonate through your nose.'}],'practicePhrase':'Bonjour, comment allez-vous ?'}
    else:
     sid=body.get('conversationId') or str(uuid.uuid4());response['conversationId']=sid
     session=sessions.setdefault(sid,{'id':sid,'level':body['level'],'scenario':body['scenario'],'messages':[],'busy':False})
     transcript='Je voudrais un café.' if body.get('audio') else ''
     response['result']={'reply':'Bonjour ! Que souhaitez-vous commander ?','englishHelp':'Hello! What would you like to order?','transcript':transcript,'corrections':[],'suggestedReplies':['Un café, s’il vous plaît.']}
     session['messages'] += [{'role':'user','content':transcript or body['text']},{'role':'assistant','content':response['result']['reply']}]
     state['conversations']=[{'id':sid,'level':body['level'],'scenario':body['scenario'],'turns':len(session['messages'])//2,'updatedAt':datetime.now(timezone.utc).isoformat()}]
    state['wallet']['available']-=body['expectedCredits'];requests[id]=copy.deepcopy(response)
    state['history'].insert(0,{**copy.deepcopy(response),'createdAt':datetime.now(timezone.utc).isoformat()})
    if kind=='writing' and lost['next']:
     lost['next']=False;route.abort('failed');return
    route.fulfill(status=200,content_type='application/json',body=json.dumps(response))
   page.route('**/*',route_request)
   page.goto(f'http://127.0.0.1:{server.server_port}/tests/fixtures/tracker.html');page.wait_for_function('window.fixtureReady')
   assert page.locator('.hz-dashboard-actions #hz-ai-launch').count()==1
   assert page.locator('#hz-course-chooser #hz-ai-launch').count()==0
   page.locator('#hz-ai-launch').click();area=page.locator('#hz-ai-learning')
   area.get_by_text('Included AI allowance: up to CAD $10.00.',exact=False).wait_for()
   area.get_by_role('button',name='Open Writing trainer',exact=True).click()
   area.get_by_label('Your French writing').fill('Je suis aller au marché.')
   area.get_by_role('button',name='Review my writing · 4 credits',exact=True).click()
   area.get_by_role('button',name='Retry same request',exact=True).wait_for();first=calls[-1]['id']
   area.get_by_role('button',name='Retry same request',exact=True).click()
   area.get_by_text('Je suis allé au marché.',exact=True).wait_for()
   assert calls[-1]['id']==first and state['wallet']['available']==96
   assert area.locator('img').count()==0 and not page.evaluate('window.aiInjected===true')
   page.screenshot(path=str(artifacts/f'writing-{width}.png'),full_page=True)
   area.get_by_role('button',name='Pronunciation trainer',exact=True).click()
   assert area.get_by_role('button',name='Stop recording',exact=True).is_disabled()
   area.get_by_role('button',name='● Record French',exact=True).click()
   area.get_by_text('Recording…',exact=False).wait_for();page.wait_for_timeout(1100)
   area.get_by_role('button',name='Stop recording',exact=True).click()
   area.get_by_text('Recording ready',exact=False).wait_for()
   assert len(calls)==2,'Recording alone must not spend credits'
   area.get_by_role('button',name='Get pronunciation feedback · 3 credits',exact=True).click()
   area.get_by_text('Your rhythm is steady. Practise the nasal vowel.',exact=True).wait_for()
   page.screenshot(path=str(artifacts/f'pronunciation-{width}.png'),full_page=True)
   page.locator('#hz-global-back').click();area.get_by_label('Your French writing').wait_for()
   assert area.get_by_label('Your French writing').input_value()=='Je suis aller au marché.'
   area.get_by_role('button',name='Conversation simulator',exact=True).click()
   area.get_by_label('AI French level').select_option('A2')
   area.get_by_role('button',name='Start conversation · 2 credits',exact=True).click()
   area.get_by_role('button',name='Send reply · 2 credits',exact=True).wait_for()
   area.get_by_label('Your French reply').fill('Un café, s’il vous plaît.')
   area.get_by_role('button',name='Send reply · 2 credits',exact=True).click()
   area.get_by_role('log').get_by_text('Un café, s’il vous plaît.',exact=True).wait_for()
   area.get_by_role('button',name='● Record French',exact=True).click();area.get_by_text('Recording…',exact=False).wait_for();page.wait_for_timeout(1100)
   area.get_by_role('button',name='Stop recording',exact=True).click();area.get_by_text('Recording ready',exact=False).wait_for()
   area.get_by_role('button',name='Send reply · 2 credits',exact=True).click()
   area.get_by_role('log').get_by_text('Je voudrais un café.',exact=True).wait_for()
   page.screenshot(path=str(artifacts/f'conversation-{width}.png'),full_page=True)
   before=state['wallet']['available'];area.get_by_role('button',name='AI studio',exact=True).click()
   area.get_by_role('button',name='Resume A2 · At a café',exact=True).click()
   area.get_by_role('log').get_by_text('Je voudrais un café.',exact=True).wait_for()
   assert state['wallet']['available']==before
   area.get_by_role('button',name='New conversation',exact=True).click()
   area.get_by_role('button',name='● Record French',exact=True).click();area.get_by_text('Recording…',exact=False).wait_for()
   page.locator('#hz-global-back').click()
   page.wait_for_function('window.aiTracks.every(t=>t.readyState==="ended")')
   page.evaluate("document.querySelector('#hzad-french-academy').dispatchEvent(new CustomEvent('hzad-clear-lessons'))")
   assert area.is_hidden() and area.inner_text()==''
   state['enabled']=False;page.locator('#hz-ai-launch').click()
   area.get_by_text('AI Learning is being prepared.',exact=False).wait_for()
   area.get_by_role('button',name='Open Writing trainer',exact=True).click()
   assert area.get_by_label('Your French writing').input_value()==''
   assert area.get_by_role('button',name='Review my writing · 4 credits',exact=True).is_disabled()
   state['enabled']=True;state['wallet']['available']=0;state['wallet']['budgetAvailable']=False
   state['topUpUrl']='https://payments.example.test/ai-credits'
   page.locator('#hz-ai-launch').click();area.get_by_role('link',name='Purchase AI credits',exact=True).wait_for()
   assert area.get_by_role('link',name='Purchase AI credits',exact=True).get_attribute('href')==state['topUpUrl']
   area.get_by_role('button',name='Open Writing trainer',exact=True).click()
   assert area.get_by_role('button',name='Review my writing · 4 credits',exact=True).is_disabled()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors
   print(f'PASS {width}px: AI entry, writing, safe rendering, same-ID recovery, native audio, pronunciation, typed/spoken conversation, resume, Back and microphone cleanup, disabled rollout')
   page.close()
  browser.close()
finally:server.shutdown()
