#!/usr/bin/env python3
"""Record deployed article URLs and HTTP/SEO results, never Google index status."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json,urllib.request,urllib.error,datetime,sys
from seo_audit import Page,SITE,ROOT
pages=sorted(p.name for p in ROOT.glob('blog-*.html') if p.name!='blog-en.html')
urls=[SITE,SITE+'index-en.html',SITE+'robots.txt',SITE+'sitemap.xml']+[SITE+p for p in pages]+[SITE+p for p in ('favicon.ico','favicon.svg','favicon-48.png','favicon-192.png','journal-share.js')]
def check(url):
 try:
  response=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'WEBU-Deployment-Check/1.0'}),timeout=25)
  raw=response.read();row={'url':url,'status':response.status,'final_url':response.url,'errors':[]}
  if response.status!=200:row['errors'].append('HTTP status')
  if 'noindex' in response.headers.get('X-Robots-Tag','').lower():row['errors'].append('X-Robots noindex')
  if url.endswith('.html') or url==SITE:
   p=Page(raw.decode());
   if p.canon!=[url]:row['errors'].append('canonical mismatch')
   if 'noindex' in p.meta.get('robots',''):row['errors'].append('noindex')
   if 'blog-' in url and '/journal-share.js' not in p.scripts:row['errors'].append('stale article deployment')
  return row
 except Exception as exc:return {'url':url,'errors':[str(exc)]}
with ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(check,urls))
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'google_index_status':'not inspected','urls':rows}
Path('deployment-url-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
for row in rows:print(row['url'],row.get('status','ERROR'),'; '.join(row['errors']) or 'OK')
sys.exit(any(row['errors'] for row in rows))
