#!/usr/bin/env python3
"""Check local fragments, duplicate HTML IDs and dead on-page navigation."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlsplit
import sys

ROOT=Path(__file__).resolve().parents[1]

class Document(HTMLParser):
 def __init__(self,html):
  super().__init__();self.ids=[];self.links=[];self.feed(html)
 def handle_starttag(self,tag,attrs):
  attr=dict(attrs)
  if attr.get('id'):self.ids.append(attr['id'])
  if tag=='a' and attr.get('href'):self.links.append(attr['href'])

def main():
 docs={p.resolve():Document(p.read_text(encoding='utf-8')) for p in ROOT.rglob('*.html')}
 errors=[]
 for page,doc in docs.items():
  rel=page.relative_to(ROOT).as_posix()
  for ident,count in Counter(doc.ids).items():
   if count>1:errors.append(f'{rel}: duplicate id #{ident} ({count})')
  for href in doc.links:
   url=urlsplit(href)
   if not url.fragment or (url.scheme or url.netloc) and url.netloc!='www.webu.sk':continue
   if url.path and not url.path.endswith(('.html','/')):continue
   if url.path.startswith('/'):
    target=ROOT/url.path.lstrip('/')
   elif url.path:
    target=page.parent/url.path
   else:target=page
   if target.is_dir():target=target/'index.html'
   target=target.resolve()
   if target not in docs:continue
   fragment=unquote(url.fragment)
   if fragment not in docs[target].ids:errors.append(f'{rel}: missing fragment {href}')
 print(f'Fragment audit: {len(docs)} HTML pages; {len(errors)} errors')
 for error in errors:print('ERROR',error)
 return bool(errors)

if __name__=='__main__':sys.exit(main())
