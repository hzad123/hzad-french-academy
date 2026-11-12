"""Release only speaking Test01; no inference or credential extraction."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import uuid

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('release_api',Path(__file__).with_name('tcf-marking.py'))
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
api,query,literal,migration_body=helper.api,helper.query,helper.literal,helper.migration_body
FILES=['20261112002400_tcf_speaking_test01.sql','20261112002500_activate_tcf_speaking_test01.sql','20261112002600_speaking_final_upload_grace.sql']
SNAPSHOT="""select jsonb_build_object(
 'progress',(select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.user_id,p.unit_id),'')) from public.academy_learning_progress p),
 'writing',(select md5(coalesce(string_agg(to_jsonb(a)::text,'|' order by a.id),'')) from academy_tcf_writing.attempts a),
 'wallets',(select md5(coalesce(string_agg(to_jsonb(w)::text,'|' order by w.user_id),'')) from academy_ai.wallets w),
 'policy',(select to_jsonb(p) from academy_ai.policy p where id),
 'otherActivities',(select jsonb_agg(to_jsonb(a) order by a.kind) from academy_ai.activities a where a.kind not in('tcf-speaking-turn','tcf-speaking-feedback'))
) as state"""

def transaction(files,commit=False):
    parts=['begin isolation level repeatable read;',"select pg_advisory_xact_lock(hashtext('hzad-speaking-release'));",'create temp table speaking_before on commit drop as '+SNAPSHOT+';']
    for filename in files:
        source=(ROOT/'supabase/migrations'/filename).read_text()
        version,name=filename.removesuffix('.sql').split('_',1)
        parts += [migration_body(source),'insert into supabase_migrations.schema_migrations(version,name,statements) values('+literal(version)+','+literal(name)+',array['+literal(source)+']);']
    parts += ['create temp table speaking_after on commit drop as '+SNAPSHOT+';',"""do $$begin
 if (select state from speaking_before) is distinct from (select state from speaking_after) then raise exception 'Student data or existing settings changed';end if;
 if has_function_privilege('anon','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Unexpected public speaking permission';end if;
 if not has_function_privilege('service_role','public.academy_tcf_speaking_command(uuid,text,uuid,jsonb)','execute') then raise exception 'Missing server speaking permission';end if;
 end;$$;""",'commit;' if commit else 'rollback;']
    return '\n'.join(parts)

def pending_files():
    records=query("select version,statements from supabase_migrations.schema_migrations where version in('20261112002400','20261112002500','20261112002600')")
    stored={row['version']:row['statements'] for row in records};pending=[]
    for name in FILES:
        version=name.split('_',1)[0];source=(ROOT/'supabase/migrations'/name).read_text()
        if version in stored:
            if stored[version]!=[source]:raise RuntimeError('Recorded speaking migration differs; review deployment.')
        else:pending.append(name)
    return pending

def deploy(bundle):
    boundary='speaking-'+uuid.uuid4().hex
    metadata=json.dumps({'name':'academy-tcf-speaking','entrypoint_path':'index.ts','verify_jwt':True})
    payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n').encode()+bundle.read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
    result=api('/functions/deploy?slug=academy-tcf-speaking',raw=payload,content_type='multipart/form-data; boundary='+boundary)
    if result.get('status')!='ACTIVE' or result.get('verify_jwt') is not True:raise RuntimeError('Speaking function readiness or JWT check failed.')
    print(json.dumps({k:result.get(k) for k in ['slug','status','version','verify_jwt']}))

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--bundle',type=Path,required=True);parser.add_argument('--apply',action='store_true',required=True);args=parser.parse_args()
    if not args.bundle.is_file():raise RuntimeError('Build the speaking Edge bundle first.')
    pending=pending_files()
    names={row['name'] for row in api('/secrets')}
    if 'OPENAI_API_KEYfrench' not in names:raise RuntimeError('Existing OpenAI secret binding is missing.')
    settings=query("select kind,enabled,credits,model,ceiling_microcad,max_output_tokens from academy_ai.activities where kind in('conversation','tcf-writing') order by kind")
    print('::notice title=Reviewed speaking source settings::'+json.dumps(settings,separators=(',',':')))
    # Rehearse the entire change before any persistent write.
    query(transaction(pending));print('Speaking migration/activation rehearsal and preservation checks passed.')
    schema=[name for name in pending if name!=FILES[1]]
    if schema:query(transaction(schema,True))
    deploy(args.bundle)
    activate=[name for name in pending if name==FILES[1]]
    query(transaction(activate,True))
    settings=query("select kind,enabled,credits,model,ceiling_microcad,max_output_tokens from academy_ai.activities where kind in('tcf-speaking-turn','tcf-speaking-feedback') order by kind")
    if len(settings)!=2 or not all(s['enabled'] for s in settings):raise RuntimeError('Speaking activity activation not verified.')
    print('::notice title=Speaking Test01 live::'+json.dumps(settings,separators=(',',':'))+'; JWT protected; preservation checks passed; no inference or wallet refill performed.')

if __name__=='__main__':
    try:main()
    except Exception as error:
        message=str(error) if isinstance(error,RuntimeError) else type(error).__name__+'; private details withheld'
        print('::error title=Speaking release stopped::'+message.replace('%','%25').replace('\r','%0D').replace('\n','%0A'));sys.exit(1)
