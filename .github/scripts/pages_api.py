#!/usr/bin/env python3
"""Bounded retries for transient GitHub Pages API failures; no content writes."""
import json,os,time,urllib.error,urllib.request

def request_json(url,method='GET',attempts=3):
 headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'WEBU-deployment-check'}
 for attempt in range(attempts):
  try:
   request=urllib.request.Request(url,headers=headers,data=b'{}' if method=='POST' else None,method=method)
   with urllib.request.urlopen(request,timeout=25) as response:return json.load(response)
  except urllib.error.HTTPError as exc:
   if exc.code not in (429,500,502,503,504) or attempt+1==attempts:raise
   delay=min(30,int(exc.headers.get('Retry-After','5'))) if exc.headers.get('Retry-After','5').isdigit() else 5
   print('GitHub Pages transient HTTP '+str(exc.code)+'; retry '+str(attempt+2)+'/'+str(attempts),flush=True)
   time.sleep(delay)

def request_build():
 url='https://api.github.com/repos/'+os.environ['GITHUB_REPOSITORY']+'/pages/builds'
 result=request_json(url,'POST');print('Pages build requested: '+str(result.get('status','accepted')),flush=True)
 return result
if __name__=='__main__':request_build()
