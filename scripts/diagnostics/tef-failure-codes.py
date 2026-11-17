"""Privacy-safe diagnostic for TEF AI marking. Prints failure codes only."""
import json, os, re, sys
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def walk(value):
    if isinstance(value,dict):
        if isinstance(value.get('event_message'),str): yield value['event_message']
        for key,child in value.items():
            if key!='event_message':yield from walk(child)
    elif isinstance(value,list):
        for v in value:yield from walk(v)

token=os.environ.get('SUPABASE_ACCESS_TOKEN','').strip()
if not token:raise RuntimeError('Management token not configured')
end=datetime.now(timezone.utc)
start=end-timedelta(hours=12)
sql=("select timestamp, event_message from logs where source='function_logs' "
     "and position(event_message,'HZAD_TEF_FAILURE')>0 order by timestamp desc limit 40")
params=urlencode({'sql':sql,'iso_timestamp_start':start.strftime('%Y-%m-%dT%H:%M:%SZ'),
                  'iso_timestamp_end':end.strftime('%Y-%m-%dT%H:%M:%SZ')})
url='https://api.supabase.com/v1/projects/ogntvgvzmjrnppcullsj/analytics/endpoints/logs?'+params
try:
    with urlopen(Request(url,headers={'Authorization':'Bearer '+token}),timeout=40) as response:
        payload=json.loads(response.read())
except HTTPError as err:
    print('TEF log retrieval failed, HTTP',err.code)
    sys.exit(1)
messages=list(walk(payload))
if not messages:
    print('No categorized TEF failure events in the last 12h; response top-level type:',type(payload).__name__)
    print('Available keys:',sorted(payload.keys()) if isinstance(payload,dict) else 'n/a')
else:
    groups={}
    for msg in messages:
        # Logs can wrap the console payload in escaped JSON; never print it.
        marker=msg.split('HZAD_TEF_FAILURE',1)[-1]
        code_match=re.search(r'(NETWORK|TRUNCATED|INVALID_JSON|INVALID_SCORE|UNVERIFIED_QUOTE|INVALID_FEEDBACK|FEEDBACK_FIELDS|FEEDBACK_BOUNDS|FEEDBACK_TASKS|FEEDBACK_CRITERIA|UNCHANGED_CORRECTION|OUTPUT_TOO_LARGE|PROVIDER_HTTP|UNKNOWN)',marker)
        code=code_match.group(1) if code_match else 'NO_CODE_MATCH'
        provider=''
        for known in ('invalid_api_key','insufficient_quota','model_not_found','rate_limit_exceeded','unsupported_parameter','invalid_request_error','permission_denied'):
            if known in marker:provider=known
        status_match=re.search(r'(?<![0-9])(40[0-9]|42[0-9]|429|50[0-9]|52[0-9])(?![0-9])',marker)
        status=int(status_match.group(1)) if status_match else None
        key=(code,provider,status if isinstance(status,int) else None)
        groups[key]=groups.get(key,0)+1
    for key,count in sorted(groups.items(),key=lambda pair:-pair[1]):
        print('TEF failure aggregate:',json.dumps({'code':key[0],'providerCode':key[1],'httpStatus':key[2],'count':count}))
