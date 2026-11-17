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
        match=re.search(r'HZAD_TEF_FAILURE\s*(\{[^}]*\})',msg)
        try: obj=json.loads(match.group(1)) if match else {}
        except (ValueError,AttributeError):obj={}
        code=str(obj.get('code','UNKNOWN'))[:45]
        provider=str(obj.get('providerCode',''))[:45]
        status=obj.get('status')
        key=(code,provider,status if isinstance(status,int) else None)
        groups[key]=groups.get(key,0)+1
    for key,count in sorted(groups.items(),key=lambda pair:-pair[1]):
        print('TEF failure aggregate:',json.dumps({'code':key[0],'providerCode':key[1],'httpStatus':key[2],'count':count}))
