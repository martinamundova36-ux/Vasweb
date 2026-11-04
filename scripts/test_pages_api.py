#!/usr/bin/env python3
"""Retry 502/429 only, never republish content or retry permanent auth errors."""
from pathlib import Path
import importlib.util,io,os,urllib.error
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('pages_api',Path(__file__).resolve().parents[1]/'.github/scripts/pages_api.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
os.environ.setdefault('GH_TOKEN','test-placeholder')
class Response(io.BytesIO):
 def __enter__(self):return self
 def __exit__(self,*args):self.close()
for status in (502,429):
 error=urllib.error.HTTPError('https://api.github.com/test',status,'fixture',{'Retry-After':'1'},None)
 with patch.object(m.urllib.request,'urlopen',side_effect=[error,Response(b'{"status":"queued"}')]) as request,patch.object(m.time,'sleep') as sleep:
  assert m.request_json('https://api.github.com/test','POST')['status']=='queued'
  assert request.call_count==2 and sleep.call_count==1
with patch.object(m.urllib.request,'urlopen',side_effect=urllib.error.HTTPError('https://api.github.com/test',403,'fixture',{},None)) as request,patch.object(m.time,'sleep'):
 try:m.request_json('https://api.github.com/test','POST')
 except urllib.error.HTTPError:pass
 else:raise AssertionError('Permanent auth failure accepted')
 assert request.call_count==1
with patch.object(m.urllib.request,'urlopen',side_effect=urllib.error.HTTPError('https://api.github.com/test',502,'fixture',{},None)) as request,patch.object(m.time,'sleep'):
 try:m.request_json('https://api.github.com/test','POST')
 except urllib.error.HTTPError:pass
 else:raise AssertionError('Retry budget not enforced')
 assert request.call_count==3
print('PASS: transient 502/429 retry, permanent 403 stop, bounded retry count')
