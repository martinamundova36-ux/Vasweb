#!/usr/bin/env python3
"""Technical image/licence-record checks. Not legal or scientific peer review."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_images import load,photo_for,validate_photo,group,SITE
class Page(HTMLParser):
 def __init__(self):super().__init__();self.images=[];self.meta={};self.schema=[];self.in_json=False;self.buf='';self.cards=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='img':self.images.append(d)
  if t=='meta':self.meta[d.get('property',d.get('name'))]=d.get('content')
  if t=='a' and d.get('class') in ('vw-journal-card','webu-new-story'):self.cards.append(d['href'])
  if t=='script' and d.get('type')=='application/ld+json':self.in_json=True;self.buf=''
 def handle_data(self,s):
  if self.in_json:self.buf+=s
 def handle_endtag(self,t):
  if t=='script' and self.in_json:self.schema.append(json.loads(self.buf));self.in_json=False

def main():
 data=load(ROOT);seen={};count=0
 published={}
 # Newly published editorial pages may be authored outside the DOI draft pipeline.
 # Include their real publication dates when validating the five featured stories.
 for item in ROOT.glob('blog-journal-2026-*.html'):
  match=re.search(r'2026-\d{2}-\d{2}',item.name)
  if match:published[group(item.name).removesuffix('.html')]=match.group(0)
 for draft in (ROOT/'journal-drafts').glob('*.json'):
  source=json.loads(draft.read_text())
  if source.get('published_at') and source.get('editorial'):
   published['blog-journal-review-'+draft.stem]=source['published_at']
 for photo in data['photos']:
  validate_photo(photo,ROOT)
  for key,path in photo['files'].items():
   digest=hashlib.sha256((ROOT/path.lstrip('/')).read_bytes()).hexdigest()
   assert digest==photo['optimized_sha256'][key],path+': optimized asset changed'
 for key,value in data['assignments'].items():
  assert value not in seen,'Different article topics reuse photo: '+key+' and '+seen.get(value,'')
  seen[value]=key
 external_seen={}
 for file in sorted(ROOT.glob('blog-*.html')):
  if file.name=='blog-en.html':continue
  raw=file.read_text();p=Page();p.feed(raw);photo=photo_for(file.name,data)
  lang='en' if file.name.endswith('-en.html') else 'sk'
  if photo:
   src=photo['files']['social'];image=SITE+src.lstrip('/')
   heroes=[i for i in p.images if i.get('src')==src];assert len(heroes)==1,file.name+': missing/duplicate hero'
   hero=heroes[0]
   assert all(hero.get(k)==v for k,v in {'width':'1280','height':'720','alt':photo['alt'][lang],'loading':'eager','fetchpriority':'high'}.items()),file.name+': hero attributes'
   assert p.meta.get('og:image')==image and p.meta.get('og:image:alt')==photo['alt'][lang] and p.meta.get('twitter:image')==image,file.name+': social image'
   schema=next(j for j in p.schema if j.get('@type')=='BlogPosting')
   assert schema.get('image',{}).get('url')==image and schema['image'].get('width')==1280,file.name+': structured image'
   assert '/journal-images.css' in raw and 'type="image/webp"' in raw,file.name+': responsive image missing'
  else:
   # Hand-edited, research-sourced 2026 articles use separately credited Pexels photos.
   # Do not waive provenance, uniqueness, metadata or semantic image checks.
   assert file.name.startswith('blog-journal-2026-'),file.name+': missing catalog photograph'
   heroes=[i for i in p.images if i.get('src','').startswith('https://images.pexels.com/photos/')]
   assert len(heroes)==1,file.name+': missing/duplicate Pexels photograph'
   hero=heroes[0];src=hero['src']
   assert re.match(r'^https://images\.pexels\.com/photos/(\d+)/pexels-photo-\1\.jpeg\?',src),file.name+': nonstandard Pexels photo'
   assert all(hero.get(k)==v for k,v in {'width':'1280','height':'720','loading':'eager','fetchpriority':'high'}.items()) and hero.get('alt'),file.name+': hero attributes'
   assert 'https://www.pexels.com/license/' in raw and 'https://www.pexels.com/photo/' in raw,file.name+': missing source/license links'
   assert '/journal-images.css' in raw and '<figure class="webu-hero">' in raw,file.name+': missing hero markup'
   assert p.meta.get('og:image')==src and p.meta.get('twitter:image')==src,file.name+': social image'
   schema=next(j for j in p.schema if j.get('@type')=='BlogPosting')
   assert schema.get('image',{}).get('url')==src and schema['image'].get('width')==1280,file.name+': structured image'
   topic=group(file.name)
   assert src not in external_seen or external_seen[src]==topic,file.name+': photograph reused for different topics'
   external_seen[src]=topic
  count+=1
 for name in ('blog.html','blog-en.html'):
  raw=(ROOT/name).read_text();p=Page();p.feed(raw)
  assert len({group(url) for url in p.cards})==len(p.cards),name+': duplicate cards'
  newest=re.findall(r'<a class="webu-new-story" href="([^"]+)"',raw)
  assert len(newest)==min(5,len(published)),name+': newest stories not promoted'
  featured_dates=[published.get(url.rsplit('/',1)[-1].removesuffix('.html').removesuffix('-en')) for url in newest]
  assert all(featured_dates) and featured_dates==sorted(featured_dates,reverse=True),name+': featured articles not newest first'
  cover=re.search(r'<a href="([^"]+)" class="vw-journal-cover">',raw)
  assert cover and cover.group(1)==newest[0],name+': cover is not latest article'
  pictured=set()
  for card in re.findall(r'<a\b[^>]*class="(?:vw-journal-card|webu-new-story)"[^>]*>.*?</a>',raw,re.S):
   fragment=Page();fragment.feed(card);assert len(fragment.images)==1,name+': image missing on a card'
   img=fragment.images[0];assert img.get('loading')=='lazy',name+': card not lazy'
   photo=photo_for(fragment.cards[0],data)
   if photo:
    assert img.get('width')=='1280' and img.get('height')=='720'
    assert img['src']==photo['files']['social']
   elif fragment.cards[0].startswith('/journal-2026-11-05-'):
    # Older one-off 2026-11-05 stories predate the curated image catalog.
    assert img.get('width')=='1280' and img.get('height')=='720'
    assert img['src'].startswith('https://images.pexels.com/photos/')
   else:
    # Manually published 2026 stories carry an individually sourced Pexels image.
    assert fragment.cards[0].startswith('/blog-journal-2026-'),name+': unrecognized card source'
    assert img.get('width')=='640' and img.get('height')=='360',name+': wrong card image dimensions'
    article=ROOT/fragment.cards[0].lstrip('/')
    assert article.is_file(),name+': missing linked article'
    ap=Page();ap.feed(article.read_text())
    hero=next((i for i in ap.images if i.get('src','').startswith('https://images.pexels.com/photos/')),None)
    assert hero,article.name+': missing credited hero'
    card_id=re.search(r'/photos/(\d+)/',img.get('src',''))
    hero_id=re.search(r'/photos/(\d+)/',hero['src'])
    assert card_id and hero_id and card_id.group(1)==hero_id.group(1),name+': card image mismatch'
   assert img['src'] not in pictured,name+': two article cards share an image'
   pictured.add(img['src'])
   image_pos=card.find('<picture') if '<picture' in card else card.find('<img')
   assert image_pos>=0 and image_pos<card.index('<h3'),name+': card image must precede heading'
 print('PASS: '+str(count)+' article pages; unique photos per topic; SK/EN alt; licensed catalog hashes; responsive/lazy cards; eager heroes; OG/Twitter/BlogPosting images')
if __name__=='__main__':main()
