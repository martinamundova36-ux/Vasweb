#!/usr/bin/env python3
"""Detect unlabeled form controls and inaccessible embedded media."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self,html):
  super().__init__();self.controls=[];self.labels=set();self.inlabel=0;self.embeds=[];self.feed(html)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='label':
   if a.get('for'):self.labels.add(a['for'])
   self.inlabel+=1
  if tag in ('input','textarea','select') and a.get('type','').lower() not in ('hidden','submit','button','reset'):
   self.controls.append((tag,a.copy(),bool(self.inlabel)))
  if tag=='iframe' and not a.get('title'):self.embeds.append(a.get('src','(empty)'))
 def handle_endtag(self,tag):
  if tag=='label':self.inlabel=max(0,self.inlabel-1)

def main():
 errors=[];pages=list(ROOT.rglob('*.html'))
 for page in pages:
  doc=Document(page.read_text(encoding='utf-8'));name=page.relative_to(ROOT)
  for tag,a,wrapped in doc.controls:
   if not wrapped and a.get('id') not in doc.labels and not a.get('aria-label') and not a.get('aria-labelledby'):
    errors.append(f'{name}: unlabeled {tag} id={a.get("id")} name={a.get("name")}')
  for src in doc.embeds:errors.append(f'{name}: iframe missing title {src}')
 print(f'Form accessibility audit: {len(pages)} pages; {len(errors)} issues')
 for error in errors[:100]:print('WARN',error)
 return bool(errors)

if __name__=='__main__':sys.exit(main())
