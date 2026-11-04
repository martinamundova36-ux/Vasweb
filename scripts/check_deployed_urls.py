#!/usr/bin/env python3
"""Check public SEO and exact favicon assets. Never infer Google index status."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import datetime,hashlib,json,struct,sys,urllib.request,xml.etree.ElementTree as ET
from urllib.robotparser import RobotFileParser
from seo_audit import Page,SITE,ROOT
sys.path.insert(0,str(ROOT/".github/scripts"))
from journal_review_records import digest
ICONS={'favicon.ico':None,'favicon.svg':None,'favicon-48.png':48,'favicon-96.png':96,'favicon-192.png':192,'favicon-512.png':512,'apple-touch-icon.png':180}
def validate_icon(name,raw):
 errors=[]
 if raw!=(ROOT/name).read_bytes():errors.append('deployed favicon differs from approved repository asset')
 if name.endswith('.png'):
  if raw[:8]!=b'\x89PNG\r\n\x1a\n' or len(raw)<24:errors.append('invalid PNG')
  elif struct.unpack('>II',raw[16:24])!=(ICONS[name],ICONS[name]):errors.append('incorrect PNG dimensions')
 elif name.endswith('.ico'):
  if len(raw)<6 or raw[:4]!=b'\x00\x00\x01\x00':errors.append('invalid ICO')
  else:
   count=struct.unpack('<H',raw[4:6])[0]
   sizes={(raw[i] or 256,raw[i+1] or 256) for i in range(6,min(len(raw),6+16*count),16)}
   if not {(16,16),(32,32),(48,48),(96,96)}<=sizes:errors.append('ICO sizes missing')
 elif name.endswith('.svg'):
  try:
   box=ET.fromstring(raw).attrib['viewBox'].split()
   if len(box)!=4 or float(box[2])!=float(box[3]):errors.append('SVG is not square')
  except (ET.ParseError,KeyError,ValueError):errors.append('invalid SVG viewBox')
 return errors

def check(url):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'WEBU-Deployment-Check/1.0'}),timeout=25) as response:
   raw=response.read();row={'url':url,'status':response.status,'final_url':response.url,'errors':[]}
   if response.status!=200:row['errors'].append('HTTP status')
   if 'noindex' in response.headers.get('X-Robots-Tag','').lower():row['errors'].append('X-Robots noindex')
  name=url.removeprefix(SITE)
  if name.startswith('assets/journal/') or name in ('journal-images.css','journal-editorial.css'):
   if raw!=(ROOT/name).read_bytes():row['errors'].append('deployed image/style differs from repository')
   row['sha256']=hashlib.sha256(raw).hexdigest()
  if name in ICONS:
   row['sha256']=hashlib.sha256(raw).hexdigest();row['errors']+=validate_icon(name,raw)
  if url.endswith('.html') or url==SITE:
   p=Page(raw.decode())
   if p.canon!=[url]:row['errors'].append('canonical mismatch')
   if 'noindex' in (p.meta.get('robots','')+p.meta.get('googlebot','')).lower():row['errors'].append('noindex')
   if not all('/'+icon in p.links for icon in ('favicon-96.png','favicon.svg','favicon.ico')):row['errors'].append('favicon HTML links missing')
   if name.startswith('blog-') and name!='blog-en.html':
    if '/journal-share.js' not in p.scripts:row['errors'].append('stale article deployment')
    local_raw=(ROOT/name).read_text();local=Page(local_raw)
    try:
     if digest(raw.decode())!=digest(local_raw):row['errors'].append('stale or changed reviewed article content')
    except ValueError as exc:row['errors'].append(str(exc))
    if p.title!=local.title or p.meta.get('description')!=local.meta.get('description') or p.alts!=local.alts or p.json!=local.json:row['errors'].append('stale article SEO metadata')
  if name=='robots.txt':
   robots=RobotFileParser();robots.parse(raw.decode().splitlines())
   for asset in ['',*ICONS,'assets/journal/ai-workplace-1280.webp']:
    agent='Googlebot-Image' if asset else 'Googlebot'
    if not robots.can_fetch(agent,SITE+asset):row['errors'].append(agent+' blocked: '+asset)
  if name=='sitemap.xml':
   public={x.text for x in ET.fromstring(raw).iter() if x.tag.endswith('}loc')}
   expected={x.text for x in ET.parse(ROOT/'sitemap.xml').iter() if x.tag.endswith('}loc')}
   if public!=expected:row['errors'].append('stale sitemap')
  return row
 except Exception as exc:return {'url':url,'errors':[str(exc)]}

def main():
 pages=sorted(p.name for p in ROOT.glob('blog-*.html'))
 urls=[SITE,SITE+'index-en.html',SITE+'blog.html',SITE+'robots.txt',SITE+'sitemap.xml']+[SITE+p for p in pages]+[SITE+p for p in [*ICONS,'journal-share.js']]
 data=json.loads((ROOT/'journal-images.json').read_text());used=set(data['assignments'].values())
 urls += [SITE+path.lstrip('/') for photo in data['photos'] if photo['id'] in used for path in photo['files'].values()] + [SITE+'journal-images.css',SITE+'journal-editorial.css',SITE+'journal-metodika.html',SITE+'journal-metodika-en.html']
 with ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(check,urls))
 result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'google_index_status':'not inspected','urls':rows}
 Path('deployment-url-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 for row in rows:print(row['url'],row.get('status','ERROR'),'; '.join(row['errors']) or 'OK')
 return int(any(row['errors'] for row in rows))
if __name__=='__main__':sys.exit(main())
