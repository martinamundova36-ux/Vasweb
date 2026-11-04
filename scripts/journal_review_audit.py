#!/usr/bin/env python3
"""Validate editorial evidence records and content integrity, not scientific truth."""
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_review_records import digest,REGISTER
from seo_audit import Page

def audit(root=ROOT):
 data=json.loads((root/REGISTER).read_text());seen=set();errors=[]
 for item in data['articles']:
  langs=item.get('languages',{})
  if set(langs)!={'sk','en'}:errors.append(item['id']+': incomplete SK/EN review');continue
  if item.get('scientific_full_text_compared') and not any(r.get('access') in ('full_text','preprint_full_text') for r in item.get('source_records',[])):errors.append(item['id']+': full-text label lacks full-text evidence')
  if item['kind']!='technical_fixture' and not item.get('source_records'):errors.append(item['id']+': no professional/scientific source record')
  for lang,row in langs.items():
   name=row['path'];seen.add(name)
   if not (root/name).is_file():errors.append(name+': article missing');continue
   raw=(root/name).read_text();p=Page(raw)
   try:
    if row.get('content_sha256')!=digest(raw):errors.append(name+': content changed after recorded review')
   except ValueError as e:errors.append(name+': '+str(e))
   if item['kind']=='technical_fixture':continue
   if row['title'] not in raw or p.title!=row['title']+' | WEBU Journal':errors.append(name+': reviewed title mismatch')
   if p.meta.get('description')!=row['description']:errors.append(name+': reviewed description mismatch')
   if p.lang!=lang or p.h1!=1:errors.append(name+': language/H1 mismatch')
   if len(re.findall(r'<h2\b',raw))<7:errors.append(name+': incomplete editorial sections')
   if not item.get('claim_review',{}).get(lang):errors.append(name+': no section-level claim review')
   method='/journal-metodika'+('-en' if lang=='en' else '')+'.html'
   if method not in p.links:errors.append(name+': methodology/AI transparency link missing')
   for source in item['source_records']:
    if not source.get('apa7') or source.get('url') not in p.links:errors.append(name+': source citation/link missing')
   schemas=[json.loads(x) for x in p.json if json.loads(x).get('@type')=='BlogPosting']
   if len(schemas)!=1:errors.append(name+': BlogPosting mismatch')
   elif schemas[0].get('datePublished')!=row['published_at']:errors.append(name+': original publication date changed')
 pages={p.name for p in root.glob('blog-*.html') if p.name!='blog-en.html'}
 errors += [p+': no accountable review record' for p in sorted(pages-seen)]
 return data,errors

def main():
 data,errors=audit();full=sum(a.get('scientific_full_text_compared',False) for a in data['articles'])
 print(f'Editorial register: {len(data["articles"])} topics / {sum(len(a["languages"]) for a in data["articles"])} language pages; {full} full-text research comparisons (including labelled preprint).')
 print('Technical validation of records and content hashes only; not independent scientific peer review.')
 for e in errors:print('ERROR',e)
 print('Blocking record/integrity errors:',len(errors));return bool(errors)
if __name__=='__main__':sys.exit(main())
