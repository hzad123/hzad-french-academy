"""Publish the reviewed TEF writing Edge Function using the existing Actions secret.

Does not read or output student data, provider keys, wallet rows or secrets.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "https://api.supabase.com/v1/projects/ogntvgvzmjrnppcullsj"

def deploy(bundle):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Repository SUPABASE_ACCESS_TOKEN secret is unavailable.")
    if not bundle.is_file() or not 1000 < bundle.stat().st_size < 2_000_000:
        raise RuntimeError("Reviewed TEF function bundle is missing or has unexpected size.")
    boundary = "tef-" + uuid.uuid4().hex
    metadata = json.dumps({"name": "academy-tef-writing", "entrypoint_path": "index.ts", "verify_jwt": True})
    prefix = (f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{metadata}\r\n'
              f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n').encode()
    body = prefix + bundle.read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
    req = Request(BASE + "/functions/deploy?slug=academy-tef-writing", data=body,
                  headers={"Authorization": "Bearer " + token, "Content-Type": "multipart/form-data; boundary=" + boundary})
    try:
        with urlopen(req, timeout=120) as res:
            result = json.loads(res.read())
    except HTTPError as err:
        raise RuntimeError("Supabase deployment rejected with HTTP " + str(err.code) + ".") from None
    if result.get("status") != "ACTIVE" or result.get("verify_jwt") is not True or result.get("slug") != "academy-tef-writing":
        raise RuntimeError("TEF function status/JWT verification failed.")
    print("Verified TEF Writing Edge Function ACTIVE, JWT required, version " + str(result.get("version")))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", type=Path, required=True)
    args = parser.parse_args()
    try:
        deploy(args.bundle)
    except Exception as exc:
        print(str(exc) if isinstance(exc, RuntimeError) else "TEF deployment failed; private details withheld.", file=sys.stderr)
        sys.exit(1)
