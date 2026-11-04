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
  if t=='a' and d.get('class')=='vw-journal-card':self.cards.append(d['href'])
  if t=='script' and d.get('type')=='application/ld+json':self.in_json=True;self.buf=''
 def handle_data(self,s):
  if self.in_json:self.buf+=s
 def handle_endtag(self,t):
  if t=='script' and self.in_json:self.schema.append(json.loads(self.buf));self.in_json=False

def main():
 data=load(ROOT);seen={};count=0
 for photo in data['photos']:
  validate_photo(photo,ROOT)
  for key,path in photo['files'].items():
   digest=hashlib.sha256((ROOT/path.lstrip('/')).read_bytes()).hexdigest()
   assert digest==photo['optimized_sha256'][key],path+': optimized asset changed'
 for key,value in data['assignments'].items():
  assert value not in seen,'Different article topics reuse photo: '+key+' and '+seen.get(value,'')
  seen[value]=key
 for file in sorted(ROOT.glob('blog-*.html')):
  if file.name=='blog-en.html':continue
  raw=file.read_text();p=Page();p.feed(raw);photo=photo_for(file.name,data);assert photo,file.name+': missing photo'
  lang='en' if file.name.endswith('-en.html') else 'sk';src=photo['files']['social'];image=SITE+src.lstrip('/')
  heroes=[i for i in p.images if i.get('src')==src];assert len(heroes)==1,file.name+': missing/duplicate hero'
  hero=heroes[0]
  assert all(hero.get(k)==v for k,v in {'width':'1280','height':'720','alt':photo['alt'][lang],'loading':'eager','fetchpriority':'high'}.items()),file.name+': hero attributes'
  assert p.meta.get('og:image')==image and p.meta.get('og:image:alt')==photo['alt'][lang] and p.meta.get('twitter:image')==image,file.name+': social image'
  schema=next(j for j in p.schema if j.get('@type')=='BlogPosting')
  assert schema.get('image',{}).get('url')==image and schema['image'].get('width')==1280,file.name+': structured image'
  assert '/journal-images.css' in raw and 'type="image/webp"' in raw,file.name+': responsive image missing'
  count+=1
 for name in ('blog.html','blog-en.html'):
  raw=(ROOT/name).read_text();p=Page();p.feed(raw)
  assert len({group(url) for url in p.cards})==len(p.cards),name+': duplicate cards'
  for card in re.findall(r'<a\b[^>]*class="vw-journal-card"[^>]*>.*?</a>',raw,re.S):
   fragment=Page();fragment.feed(card);assert len(fragment.images)==1,name+': image missing on a card'
   img=fragment.images[0];assert img.get('loading')=='lazy' and img.get('width')=='1280' and img.get('height')=='720'
   photo=photo_for(fragment.cards[0],data);assert img['src']==photo['files']['social']
   assert card.index('<picture')<card.index('<h3'),name+': card image must precede heading'
 print('PASS: '+str(count)+' article pages; unique photos per topic; SK/EN alt; licensed catalog hashes; responsive/lazy cards; eager heroes; OG/Twitter/BlogPosting images')
if __name__=='__main__':main()
