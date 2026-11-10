#!/usr/bin/env python3
"""Curated, licensed local images shared by Journal cards, articles and publishers."""
from pathlib import Path
from urllib.parse import urlsplit, urlencode
from html import escape, unescape
import hashlib,io,json,re,datetime as dt,urllib.request,sys
ROOT=Path(__file__).resolve().parents[2]
SITE='https://www.webu.sk/'
PAIRS={'blog-5-chyb-na-webstranke.html':'blog-5-website-mistakes-en.html','blog-cena.html':'blog-pricing-business-en.html','blog-dovera.html':'blog-customer-trust-en.html','blog-luxus.html':'blog-luxury-en.html','blog-web.html':'blog-website-roi-en.html','blog-kolko-stoji-webstranka.html':'blog-website-cost-en.html','blog-seo-webstranky.html':'blog-seo-websites-en.html'}
TOPICS={'workplace':['employee','workforce','workplace','zamestnan','pracovn'], 'ai':['artificial intelligence','chatbot','konverz','chatgpt'], 'pricing':['pricing','price','cenotvor','ceny','cenu'], 'data':['data','dáta','udržateľ','sustainab'], 'business':['business','entrepreneur','podnik','marketing','resources'], 'tourism':['tourism','hospitality','hotel','travel'], 'retail':['retail','fashion','shopping','store','omnichannel','consumer'], 'trust':['trust','dôver'], 'payments':['payment','platb'], 'seo':['seo','search engine'], 'webdesign':['website','webstrán','web design'], 'budget':['budget','rozpočet'], 'analytics':['analytics','analýz'], 'branding':['brand','značk','luxury','luxus']}
COMMONS_SEARCH={'workplace':('office laptop work','Práca na notebooku v kancelárii','Working on a laptop in an office'), 'ai':('office laptop work','Práca s digitálnymi nástrojmi na notebooku','Working with digital tools on a laptop'), 'pricing':('calculator','Kalkulačka na pracovnom stole','Calculator on a work desk'), 'data':('data visualization','Analytická práca s dátami na počítači','Data analysis on a computer'), 'business':('coworking space interior','Moderné kancelárske pracovisko','Modern office workspace'), 'tourism':('hotel reception','Hotelová recepcia ako prostredie podnikania v cestovnom ruchu','Hotel reception in the tourism industry'), 'retail':('retail store interior','Interiér maloobchodnej predajne','Retail store interior'), 'trust':('business handshake','Obchodné rokovanie a spolupráca','Business negotiation and collaboration'), 'payments':('payment card','Platobná karta pri notebooku','Payment card near a laptop'), 'seo':('office laptop work','Práca s webovou stránkou na notebooku','Website work on a laptop'), 'webdesign':('office laptop work','Pracovisko webového dizajnéra','Web designer workstation'), 'budget':('calculator','Finančné plánovanie pri stole','Financial planning at a desk'), 'analytics':('office laptop work','Práca s analytikou na notebooku','Working with analytics on a laptop'), 'branding':('design studio interior','Kreatívny dizajnérsky ateliér','Creative design studio')}
COMMONS_LICENSES={'CC0','Public domain','CC BY 2.0','CC BY 3.0','CC BY 4.0','CC BY-SA 2.0','CC BY-SA 3.0','CC BY-SA 4.0'}
IRRELEVANT_COMMONS_TITLE=re.compile(r'(?i)\b(?:goats?|sheep|lambs?|cows?|cattle|dogs?|cats?|birds?|fish|statues?|sculptures?|flags?|logos?|icons?|drawings?|paintings?|diagrams?|maps?|screenshots?|cartoons?|renderings?|illustrations?|generated|presidents?|senators?|governments?|parliaments?|war|elections?)\b')
def load(root=ROOT):return json.loads((root/'journal-images.json').read_text())
def save(data,root=ROOT):(root/'journal-images.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def group(name):
 name=urlsplit(name).path.lstrip('/')
 reverse={v:k for k,v in PAIRS.items()}
 return reverse.get(name,name[:-8]+'.html' if name.endswith('-en.html') else name)
def photo_for(name,data):
 key=data['assignments'].get(group(name))
 return next((p for p in data['photos'] if p['id']==key),None)
def validate_photo(photo,root=ROOT):
 pexels=photo.get('license')=='Pexels License' and photo.get('license_url')=='https://www.pexels.com/license/' and photo.get('source_page','').startswith('https://www.pexels.com/photo/')
 commons=photo.get('provider')=='Wikimedia Commons' and photo.get('license') in COMMONS_LICENSES and photo.get('source_page','').startswith('https://commons.wikimedia.org/wiki/File:') and photo.get('license_url','').startswith('https://')
 if not (pexels or commons) or not photo.get('commercial_use_verified_at'):raise ValueError('Image license evidence missing')
 if photo.get('width')!=1280 or photo.get('height')!=720 or not all(photo.get('alt',{}).get(l) for l in ('sk','en')):raise ValueError('Image size or localized alt missing')
 for name in photo['files'].values():
  if not name.startswith('/assets/journal/') or not (root/name.lstrip('/')).is_file():raise ValueError('Local image missing: '+name)

# Four source-matched real editorial photographs, individually checked on Pexels.
# A photo is used once, with its original page/creator and license retained.
CURATED_PEXELS={
 '10.60027/jelr.2026.e2985':('8190815','a-group-of-people-having-a-meeting-in-the-office','Kampus Production','workplace','Tím odborníkov diskutuje pri digitálnej prezentácii','Professionals discuss a digital presentation in an office'),
 '10.35816/jiksh.v15i2.426':('6129145','nurses-smiling-at-each-other','RDNE Stock project','workplace','Zdravotnícky tím spolupracuje v nemocničnom prostredí','Healthcare colleagues work together in a hospital'),
 '10.55041/ijcope.v2i11.025':('27857668','a-display-of-vegetables-in-a-grocery-store','Chixpix','retail','Čerstvé potraviny vystavené v predajni','Fresh food on display in a grocery store'),
 '10.55041/ijcope.v2i11.030':('7857559','female-business-partners-preparing-parcels','Kampus Production','retail','Príprava balíkov pre internetový obchod','Packing parcels for an online store'),
}

def acquire_curated_pexels_photo(source,data,root=ROOT):
 """Download a DOI-matched, already license-checked non-AI stock photograph."""
 try:
  from PIL import Image, ImageOps, UnidentifiedImageError
 except ImportError:
  return None
 record=CURATED_PEXELS.get((source.get('doi') or '').lower())
 if not record:return None
 photo_id,slug,creator,topic,alt_sk,alt_en=record
 source_page=f'https://www.pexels.com/photo/{slug}-{photo_id}/'
 if any(p['source_page']==source_page for p in data['photos']):return None
 download_url=f'https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg?auto=compress&cs=tinysrgb&w=1600'
 try:
  req=urllib.request.Request(download_url,headers={'User-Agent':'WEBUJournal/2.0 (https://www.webu.sk/)'})
  with urllib.request.urlopen(req,timeout=40) as response:original=response.read(15_000_001)
  if len(original)>15_000_000:raise ValueError('Pexels photograph exceeds size limit')
  image=Image.open(io.BytesIO(original));image.load()
  if image.width<1280 or image.height<720:raise ValueError('Pexels photograph too small')
  frame=ImageOps.fit(ImageOps.exif_transpose(image).convert('RGB'),(1280,720),method=Image.Resampling.LANCZOS)
 except (OSError,ValueError,UnidentifiedImageError) as exc:
  print('Curated Pexels photo unavailable',photo_id,type(exc).__name__,str(exc)[:100],file=sys.stderr)
  return None
 key='pexels-'+photo_id
 paths={'640':'/assets/journal/'+key+'-640.webp','1280':'/assets/journal/'+key+'-1280.webp','social':'/assets/journal/'+key+'-social.jpg'}
 hashes={}
 for size,file in paths.items():
  target=root/file.lstrip('/');target.parent.mkdir(parents=True,exist_ok=True)
  optimized=frame.resize((640,360),Image.Resampling.LANCZOS) if size=='640' else frame
  optimized.save(target,format='JPEG' if size=='social' else 'WEBP',quality=81,optimize=True)
  hashes[size]=hashlib.sha256(target.read_bytes()).hexdigest()
 item={'id':key,'provider':'Pexels','provider_id':photo_id,'source_page':source_page,
       'download_url':download_url,'creator':creator,'license':'Pexels License',
       'license_url':'https://www.pexels.com/license/',
       'commercial_use_verified_at':dt.date.today().isoformat(),
       'original_sha256':hashlib.sha256(original).hexdigest(),
       'topics':[topic],'alt':{'sk':alt_sk,'en':alt_en},'width':1280,'height':720,
       'files':paths,'illustrative':True,'optimized_sha256':hashes}
 validate_photo(item,root);data['photos'].append(item)
 with (root/'WEBU-JOURNAL-IMAGE-LICENSES.md').open('a',encoding='utf-8') as log:
  log.write(f'\n- {key}: [{creator}]({source_page}), licencia [Pexels License](https://www.pexels.com/license/); skutočná ilustračná fotografia.\\n')
 return item

def acquire_commons_photo(topics,data,root=ROOT):
 """Download a distinct commercially reusable Commons photo with source evidence.

If the API, explicit license or image validation fails, keep the article on hold.
No unlicensed replacement or repeated image is ever used.
"""
 try:
  from PIL import Image, ImageOps, UnidentifiedImageError
 except ImportError:
  return None
 used_pages={p['source_page'] for p in data['photos']}
 for topic in sorted(topics,key=lambda t:(t=='business',t)) or ['business']:
  query,alt_sk,alt_en=COMMONS_SEARCH[topic]
  params=urlencode({'action':'query','generator':'search','gsrsearch':query,'gsrnamespace':6,
                    'gsrlimit':40,'prop':'imageinfo','iiprop':'url|size|extmetadata',
                    'iiurlwidth':1600,'format':'json'})
  req=urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+params,
                            headers={'User-Agent':'WEBUJournal/2.0 (https://www.webu.sk/; editorial image sourcing)'})
  try:
   with urllib.request.urlopen(req,timeout=25) as response:pages=json.load(response).get('query',{}).get('pages',{})
  except (OSError,ValueError) as exc:
   print('Wikimedia Commons API unavailable for',topic,type(exc).__name__,str(exc)[:100],file=sys.stderr)
   continue
  print('Wikimedia Commons candidates:',topic,len(pages))
  for page in sorted(pages.values(),key=lambda p:p.get('index',1000)):
   title=page.get('title','')
   if not re.search(r'\.(?:jpe?g|png|webp)$',title,re.I) or IRRELEVANT_COMMONS_TITLE.search(title.replace('_',' ')):continue
   info=(page.get('imageinfo') or [{}])[0];meta=info.get('extmetadata') or {}
   lic=unescape(re.sub('<[^>]*>','',meta.get('LicenseShortName',{}).get('value',''))).strip()
   if lic not in COMMONS_LICENSES:continue
   link=info.get('descriptionurl','')
   if link in used_pages or not link.startswith('https://commons.wikimedia.org/wiki/File:'):continue
   if info.get('width',0)<1280 or info.get('height',0)<720:continue
   url=info.get('thumburl') or info.get('url','')
   # Commons now returns resized photographs from thumb.wikimedia.org as well
   # as original files from upload.wikimedia.org. Both are official hosts.
   if not (url.startswith('https://upload.wikimedia.org/') or url.startswith('https://thumb.wikimedia.org/')):continue
   license_url=meta.get('LicenseUrl',{}).get('value','')
   if license_url.startswith('http://creativecommons.org/'):
    license_url='https://'+license_url.removeprefix('http://')
   if not license_url.startswith('https://'):
    if lic=='CC0':license_url='https://creativecommons.org/publicdomain/zero/1.0/'
    elif lic=='Public domain':license_url='https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain'
    else:continue
   try:
    request=urllib.request.Request(url,headers={'User-Agent':'WEBUJournal/2.0 (https://www.webu.sk/)'})
    with urllib.request.urlopen(request,timeout=40) as response:original=response.read(15_000_001)
    if len(original)>15_000_000:continue
    photo_image=Image.open(io.BytesIO(original));photo_image.load()
    if photo_image.width<1280 or photo_image.height<720:continue
    frame=ImageOps.fit(ImageOps.exif_transpose(photo_image).convert('RGB'),(1280,720),method=Image.Resampling.LANCZOS)
   except (OSError,ValueError,UnidentifiedImageError):continue
   key='commons-'+hashlib.sha256(link.encode()).hexdigest()[:14]
   paths={'640':'/assets/journal/'+key+'-640.webp','1280':'/assets/journal/'+key+'-1280.webp','social':'/assets/journal/'+key+'-social.jpg'}
   hashes={}
   for size,file in paths.items():
    target=root/file.lstrip('/');target.parent.mkdir(parents=True,exist_ok=True)
    optimized=frame.resize((640,360),Image.Resampling.LANCZOS) if size=='640' else frame
    optimized.save(target,format='JPEG' if size=='social' else 'WEBP',quality=81,optimize=True)
    hashes[size]=hashlib.sha256(target.read_bytes()).hexdigest()
   creator=unescape(re.sub('<[^>]+>',' ',meta.get('Artist',{}).get('value',''))).strip()[:150]
   item={'id':key,'provider':'Wikimedia Commons','provider_id':str(page.get('pageid','')),
         'source_page':link,'download_url':url,'creator':creator or 'Wikimedia Commons contributor',
         'license':lic,'license_url':license_url,'commercial_use_verified_at':dt.date.today().isoformat(),
         'original_sha256':hashlib.sha256(original).hexdigest(),'topics':[topic],
         'alt':{'sk':alt_sk,'en':alt_en},'width':1280,'height':720,'files':paths,
         'illustrative':True,'optimized_sha256':hashes}
   validate_photo(item,root);data['photos'].append(item)
   source_log=root/'WEBU-JOURNAL-IMAGE-LICENSES.md'
   if source_log.exists():
    with source_log.open('a',encoding='utf-8') as logfile:
     logfile.write(f'\n- {key}: [{creator or "Commons contributor"}]({link}), licencia [{lic}]({license_url}); automaticky prevzaté ako ilustračná fotografia.\n')
   return item
 return None
def choose_for_source(source,root=ROOT):
 """Allocate only an unused, reviewed catalog photo; otherwise hold for an editor."""
 data=load(root);key='blog-journal-review-'+source['source_date']+'-'+hashlib.sha256(source['doi'].encode()).hexdigest()[:12]+'.html'
 existing=photo_for(key,data)
 if existing:validate_photo(existing,root);return existing
 text=(source.get('title','')+' '+' '.join(source.get('selection_keywords',[]))).casefold()
 topics={topic for topic,terms in TOPICS.items() if any(term in text for term in terms)}
 used=set(data['assignments'].values());candidates=[p for p in data['photos'] if p['id'] not in used and not p.get('excluded_from_reuse') and not IRRELEVANT_COMMONS_TITLE.search(p.get('source_page','').replace('_',' ')) and topics.intersection(p['topics'])]
 candidates.sort(key=lambda p:(-len(topics.intersection(p['topics'])),p['id']))
 photo=candidates[0] if candidates else (acquire_curated_pexels_photo(source,data,root) or acquire_commons_photo(topics,data,root))
 if not photo:raise ValueError('needs_image: no unused, relevant licensed photograph from Pexels/Commons')
 validate_photo(photo,root);data['assignments'][key]=photo['id'];save(data,root);return photo

def picture(photo,lang,hero=False):
 alt=escape(photo['alt'][lang],quote=True);files=photo['files'];sizes='(max-width: 860px) calc(100vw - 40px), 820px' if hero else '(max-width: 800px) calc(100vw - 40px), 520px'
 return '<picture class="webu-journal-picture"><source type="image/webp" srcset="'+files['640']+' 640w, '+files['1280']+' 1280w" sizes="'+sizes+'"><img src="'+files['social']+'" width="1280" height="720" alt="'+alt+'" loading="'+('eager' if hero else 'lazy')+'"'+(' fetchpriority="high"' if hero else '')+' decoding="async"></picture>'
def hero(photo,lang):
 author=(photo.get('creator')+' / ') if photo.get('creator') else ''
 provider=photo.get('provider','Pexels');caption=('Illustrative photograph: ' if lang=='en' else 'Ilustračná fotografia: ')+author+provider
 return '<!-- WEBU-IMAGE-START --><figure class="webu-article-hero">'+picture(photo,lang,True)+'<figcaption><a href="'+escape(photo['source_page'],quote=True)+'" rel="noopener noreferrer">'+escape(caption)+'</a> · <a href="'+escape(photo['license_url'],quote=True)+'">'+escape(photo['license'])+'</a></figcaption></figure><!-- WEBU-IMAGE-END -->'
def stylesheet(raw):
 raw=re.sub(r'<link\b[^>]*href=["\']/journal-images\.css["\'][^>]*>','',raw)
 return raw.replace('</head>','<link rel="stylesheet" href="/journal-images.css"></head>',1)
def sync(root=ROOT):
 data=load(root);count=0
 for page in sorted(root.glob('blog-*.html')):
  if page.name=='blog-en.html':continue
  raw=page.read_text();photo=photo_for(page.name,data)
  if not photo:raise ValueError(page.name+': needs licensed image assignment')
  validate_photo(photo,root);lang='en' if page.name.endswith('-en.html') else 'sk'
  raw=re.sub(r'<!-- WEBU-IMAGE-START -->.*?<!-- WEBU-IMAGE-END -->','',raw,flags=re.S)
  # Replace only the known legacy opening image, preserving editorial text.
  raw=re.sub(r'<img\b[^>]*src="https://images\.unsplash\.com/photo-1460925895917-afdab827c52f[^>]*>','',raw)
  raw=re.sub(r'(</h1>)',lambda m:m.group(1)+hero(photo,lang),raw,count=1,flags=re.I)
  page.write_text(stylesheet(raw));count+=1
 for listing in ('blog.html','blog-en.html'):
  page=root/listing;raw=page.read_text();lang='en' if listing=='blog-en.html' else 'sk';seen=set()
  pattern=r'<a\b(?=[^>]*\bclass="vw-journal-card")(?=[^>]*\bhref="([^"]+)")[^>]*>.*?</a>'
  def card(match):
   name=urlsplit(match.group(1)).path.lstrip('/');key=group(name)
   if key in seen:return ''
   seen.add(key);photo=photo_for(name,data)
   if not photo:
    # The five original 2026-11-05 editorial cards already have their
    # individually sourced Pexels pictures, outside the newer image catalog.
    if name.startswith('journal-2026-11-05-') and '<picture' in match.group(0):
     return match.group(0)
    raise ValueError('Card image missing: '+name)
   text=match.group(0);text=re.sub(r'<picture\b.*?</picture>|<img\b[^>]*>','',text,flags=re.S)
   end=text.index('>')+1;return text[:end]+picture(photo,lang)+text[end:]
  raw=re.sub(pattern,card,raw,flags=re.S)
  raw=re.sub(r'(<div class="vw-journal-section-head">.*?</div><span>)\s*\d+\s+(?:články|článkov|articles)',lambda m:m.group(1)+str(len(seen))+(' articles' if lang=='en' else ' článkov'),raw,count=1,flags=re.S)
  def cover(match):
   opening=match.group(1)
   href=re.search(r'href="([^"]+)"',opening)
   photo=photo_for(href.group(1),data) if href else None
   if not photo:photo=photo_for('blog-luxus.html',data)
   return opening+picture(photo,lang,True)+match.group(2)
  raw=re.sub(r'(<a\b[^>]*class="vw-journal-cover"[^>]*>)(?:<picture\b.*?</picture>|<img\b[^>]*>)(.*?)</a>',lambda m:cover(m)+'</a>',raw,flags=re.S)
  page.write_text(stylesheet(raw))
 print('Licensed Journal images synchronized:',count,'article pages;',count//2,'topics; responsive cards and localized credits')
if __name__=='__main__':sync()
