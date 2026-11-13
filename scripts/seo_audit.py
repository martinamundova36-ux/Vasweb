#!/usr/bin/env python3
"""Blocking static SEO checks. Does not assert Google index or research validity."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,re,sys,datetime,xml.etree.ElementTree as ET
from urllib.robotparser import RobotFileParser
ROOT=Path(__file__).resolve().parents[1];SITE='https://www.webu.sk/'
class Page(HTMLParser):
 def __init__(self,raw):
  super().__init__();self.links=[];self.canon=[];self.alts={};self.meta={};self.h1=0;self.lang='';self.title='';self.in_title=False;self.in_json=False;self.json=[];self.scripts=[];self.feed(raw)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang','')
  if tag=='h1':self.h1+=1
  if tag=='title':self.in_title=True
  if tag=='meta':
   key=a.get('name',a.get('property',''));value=a.get('content','')
   self.meta[key]=(self.meta.get(key,'')+','+value) if key in ('robots','googlebot') else value
  if tag=='link':
   if a.get('rel')=='canonical':self.canon.append(a.get('href'))
   if a.get('rel')=='alternate' and a.get('hreflang'):self.alts[a['hreflang']]=a.get('href')
  if tag=='a':self.links.append(a.get('href',''))
  if tag in ('script','img','link'):
   asset=a.get('src') or (a.get('href') if tag=='link' and a.get('rel') in ('stylesheet','icon','shortcut icon') else '')
   if asset:self.links.append(asset)
  if tag=='script':
   self.scripts.append(urlsplit(a.get('src','')).path)
   if a.get('type')=='application/ld+json':self.in_json=True
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  if tag=='script':self.in_json=False
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.in_json:self.json.append(data)
def main():
 errors=[];warnings=[];pages={p.relative_to(ROOT).as_posix():Page(p.read_text()) for p in ROOT.rglob('*.html') if '.git' not in p.parts and not p.name.startswith('google')}
 sitemap={x.text for x in ET.parse(ROOT/'sitemap.xml').iter() if x.tag.endswith('}loc')}
 articles={name:p for name,p in pages.items() if name.startswith('blog-') and name!='blog-en.html'}
 robots=RobotFileParser();robots.parse((ROOT/'robots.txt').read_text().splitlines())
 titles={};descs={}
 for name,p in pages.items():
  redirect='http-equiv="refresh"' in (ROOT/name).read_text().lower()
  # Private noindex application screens are not canonical SEO landing pages.
  if redirect or 'noindex' in (p.meta.get('robots','')+','+p.meta.get('googlebot','')).lower():continue
  if not p.title.strip():errors.append(name+': missing title')
  if not p.meta.get('description'):warnings.append(name+': missing description')
  if p.h1!=1:warnings.append(name+': H1 count '+str(p.h1))
  if not name.startswith('ukazky/'):
   titles.setdefault(p.title,[]).append(name);descs.setdefault(p.meta.get('description'),[]).append(name)
   expected=SITE+('' if name=='index.html' else name)
   if p.canon!=[expected]:errors.append(name+': incorrect canonical '+str(p.canon))
   for lang,target in p.alts.items():
    other=pages.get(target.removeprefix(SITE) or 'index.html')
    if not other:errors.append(name+': nonexistent alternate '+target)
    elif lang!='x-default' and other.lang!=lang:errors.append(name+': alternate language mismatch')
    elif other.alts!=p.alts:errors.append(name+': non-reciprocal alternates')
  for link in p.links:
   u=urlsplit(link)
   if u.scheme and u.scheme not in ('http','https'):continue
   if u.netloc and u.netloc!='www.webu.sk':continue
   if not u.path:continue
   target=ROOT/unquote(u.path.lstrip('/')) if u.path.startswith('/') else (ROOT/name).parent/unquote(u.path)
   if not target.exists():errors.append(name+': broken local link '+link)
  for raw in p.json:
   try:
    obj=json.loads(raw)
    if not name.startswith('ukazky/'):
     for node in obj.get('@graph',[obj]) if isinstance(obj,dict) else []:
      if node.get('@type') in ('WebPage','CollectionPage','ContactPage','AboutPage'):
       if node.get('url')!=expected:errors.append(name+': structured page URL differs from canonical')
       if node.get('inLanguage')!=p.lang:errors.append(name+': structured page language differs from HTML')
   except ValueError:errors.append(name+': invalid JSON-LD')
  if name in ('index.html','index-en.html'):
   nodes=[]
   for raw in p.json:
    try:
     obj=json.loads(raw)
     if isinstance(obj,dict):nodes.extend(obj.get('@graph',[obj]))
    except ValueError:continue
   for kind in ('WebSite','WebPage'):
    matches=[node for node in nodes if node.get('@type')==kind]
    if len(matches)!=1:errors.append(name+': requires one '+kind+' entity')
    if kind=='WebSite' and any(node.get('url')!=SITE for node in matches):errors.append(name+': WebSite URL must be the domain home page')
 for value,names in titles.items():
  if len(names)>1:errors.append('Duplicate title: '+', '.join(names))
 for value,names in descs.items():
  if value and len(names)>1:warnings.append('Duplicate description: '+', '.join(names))
 for url in sitemap:
  u=urlsplit(url)
  name=unquote(u.path.lstrip('/')) or 'index.html'
  page=pages.get(name)
  if u.scheme!='https' or u.netloc!='www.webu.sk' or u.query or u.fragment or not page:
   errors.append('Invalid or missing sitemap page: '+url);continue
  directives=(page.meta.get('robots','')+','+page.meta.get('googlebot','')).lower()
  if 'noindex' in directives:errors.append(name+': noindex URL in sitemap')
  if 'http-equiv="refresh"' in (ROOT/name).read_text().lower():errors.append(name+': redirected URL in sitemap')
  if page.canon and page.canon!=[url]:errors.append(name+': non-canonical URL in sitemap')
 for name,p in articles.items():
  def fail(msg):errors.append(name+': '+msg)
  raw=(ROOT/name).read_text()
  if p.meta.get('author')!='Martina Mundová':fail('incorrect author meta tag')
  if '<p class="webu-author-credit"' not in raw or 'Martina Mundová</strong>' not in raw:fail('missing visible Martina Mundová author credit')
  if p.h1!=1:fail('requires exactly one H1')
  if 'noindex' in (p.meta.get('robots','')+p.meta.get('googlebot','')).lower():fail('noindex article')
  if SITE+name not in sitemap:fail('not in sitemap')
  if not robots.can_fetch('Googlebot',SITE+name):fail('blocked by robots')
  listing=pages['blog-en.html' if p.lang=='en' else 'blog.html']
  if not any(urlsplit(x).path.lstrip('/')==name for x in listing.links):fail('not linked from Journal')
  schemas=[]
  for raw in p.json:
   try:
    obj=json.loads(raw)
    if obj.get('@type')=='BlogPosting':schemas.append(obj)
   except (ValueError,AttributeError):pass
  if len(schemas)!=1:fail('requires one BlogPosting')
  for obj in schemas:
   if obj.get('author')!={'@type':'Person','name':'Martina Mundová'}:fail('incorrect BlogPosting person author')
   for field in ('headline','description','datePublished','author','publisher','mainEntityOfPage'):
    if not obj.get(field):fail('missing '+field)
   try:
    if datetime.date.fromisoformat(obj['datePublished'][:10])>datetime.date.today():fail('future publication date')
   except (ValueError,KeyError):fail('invalid publication date')
  if '/journal-share.js' not in p.scripts:fail('missing article sharing')
  if not any(urlsplit(x).path.lstrip('/') in articles and urlsplit(x).path.lstrip('/')!=name for x in p.links):fail('no related article link')
 print(f'SEO audit: {len(pages)} pages, {len(articles)} articles, {len(sitemap)} sitemap URLs')
 for w in warnings:print('WARN',w)
 for e in errors:print('ERROR',e)
 print(f'Blocking errors: {len(errors)}; warnings: {len(warnings)}')
 return bool(errors)
if __name__=='__main__':sys.exit(main())
