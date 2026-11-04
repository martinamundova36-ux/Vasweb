#!/usr/bin/env python3
"""Curated, licensed local images shared by Journal cards, articles and publishers."""
from pathlib import Path
from urllib.parse import urlsplit
from html import escape
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
SITE='https://www.webu.sk/'
PAIRS={'blog-5-chyb-na-webstranke.html':'blog-5-website-mistakes-en.html','blog-cena.html':'blog-pricing-business-en.html','blog-dovera.html':'blog-customer-trust-en.html','blog-luxus.html':'blog-luxury-en.html','blog-web.html':'blog-website-roi-en.html','blog-kolko-stoji-webstranka.html':'blog-website-cost-en.html','blog-seo-webstranky.html':'blog-seo-websites-en.html'}
TOPICS={'workplace':['employee','workforce','workplace','zamestnan','pracovn'], 'ai':['artificial intelligence','chatbot','konverz','chatgpt'], 'pricing':['pricing','price','cenotvor','ceny','cenu'], 'data':['data','dáta','udržateľ','sustainab'], 'business':['business','entrepreneur','podnik','marketing','resources'], 'trust':['trust','dôver'], 'payments':['payment','platb'], 'seo':['seo','search engine'], 'webdesign':['website','webstrán','web design'], 'budget':['budget','rozpočet'], 'analytics':['analytics','analýz'], 'branding':['brand','značk','luxury','luxus']}
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
 if photo.get('license')!='Pexels License' or photo.get('license_url')!='https://www.pexels.com/license/' or not photo.get('commercial_use_verified_at') or not photo.get('source_page','').startswith('https://www.pexels.com/photo/'):raise ValueError('Image license evidence missing')
 if photo.get('width')!=1280 or photo.get('height')!=720 or not all(photo.get('alt',{}).get(l) for l in ('sk','en')):raise ValueError('Image size or localized alt missing')
 for name in photo['files'].values():
  if not name.startswith('/assets/journal/') or not (root/name.lstrip('/')).is_file():raise ValueError('Local image missing: '+name)
def choose_for_source(source,root=ROOT):
 """Allocate only an unused, reviewed catalog photo; otherwise hold for an editor."""
 data=load(root);key='blog-journal-review-'+source['source_date']+'-'+hashlib.sha256(source['doi'].encode()).hexdigest()[:12]+'.html'
 existing=photo_for(key,data)
 if existing:validate_photo(existing,root);return existing
 text=(source.get('title','')+' '+' '.join(source.get('selection_keywords',[]))).casefold()
 topics={topic for topic,terms in TOPICS.items() if any(term in text for term in terms)}
 used=set(data['assignments'].values());candidates=[p for p in data['photos'] if p['id'] not in used and topics.intersection(p['topics'])]
 candidates.sort(key=lambda p:(-len(topics.intersection(p['topics'])),p['id']))
 if not candidates:raise ValueError('needs_image: no unused, relevant licensed photo; editorial image selection required')
 photo=candidates[0];validate_photo(photo,root);data['assignments'][key]=photo['id'];save(data,root);return photo

def picture(photo,lang,hero=False):
 alt=escape(photo['alt'][lang],quote=True);files=photo['files'];sizes='(max-width: 860px) calc(100vw - 40px), 820px' if hero else '(max-width: 800px) calc(100vw - 40px), 520px'
 return '<picture class="webu-journal-picture"><source type="image/webp" srcset="'+files['640']+' 640w, '+files['1280']+' 1280w" sizes="'+sizes+'"><img src="'+files['social']+'" width="1280" height="720" alt="'+alt+'" loading="'+('eager' if hero else 'lazy')+'"'+(' fetchpriority="high"' if hero else '')+' decoding="async"></picture>'
def hero(photo,lang):
 author=(photo.get('creator')+' / ') if photo.get('creator') else ''
 caption=('Illustrative photograph: ' if lang=='en' else 'Ilustračná fotografia: ')+author+'Pexels'
 return '<!-- WEBU-IMAGE-START --><figure class="webu-article-hero">'+picture(photo,lang,True)+'<figcaption><a href="'+escape(photo['source_page'],quote=True)+'" rel="noopener noreferrer">'+escape(caption)+'</a> · <a href="'+photo['license_url']+'">Pexels License</a></figcaption></figure><!-- WEBU-IMAGE-END -->'
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
   if not photo:raise ValueError('Card image missing: '+name)
   text=match.group(0);text=re.sub(r'<picture\b.*?</picture>|<img\b[^>]*>','',text,flags=re.S)
   end=text.index('>')+1;return text[:end]+picture(photo,lang)+text[end:]
  raw=re.sub(pattern,card,raw,flags=re.S)
  raw=re.sub(r'(<div class="vw-journal-section-head">.*?</div><span>)\s*\d+\s+(?:články|článkov|articles)',lambda m:m.group(1)+str(len(seen))+(' articles' if lang=='en' else ' článkov'),raw,count=1,flags=re.S)
  def cover(match):
   opening=match.group(1);photo=photo_for('blog-luxus.html',data)
   return opening+picture(photo,lang,True)+match.group(2)
  raw=re.sub(r'(<a\b[^>]*class="vw-journal-cover"[^>]*>)(?:<picture\b.*?</picture>|<img\b[^>]*>)(.*?)</a>',lambda m:cover(m)+'</a>',raw,flags=re.S)
  page.write_text(stylesheet(raw))
 print('Licensed Journal images synchronized:',count,'article pages;',count//2,'topics; responsive cards and localized credits')
if __name__=='__main__':sync()
