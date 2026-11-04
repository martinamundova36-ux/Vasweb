#!/usr/bin/env python3
"""Maintain accountable editorial records; never claim automatic scientific review."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
REGISTER='journal-reports/journal-audit-register.json'
START='<!-- WEBU-REVIEWED-CONTENT-START -->';END='<!-- WEBU-REVIEWED-CONTENT-END -->'
def digest(raw):
 if START not in raw or END not in raw:raise ValueError('Reviewed content boundaries missing')
 text=raw.split(START,1)[1].split(END,1)[0]
 for begin,end in [('WEBU-IMAGE-START','WEBU-IMAGE-END'),('WEBU-RELATED-START','WEBU-RELATED-END')]:text=re.sub('<!-- '+begin+' -->.*?<!-- '+end+' -->','',text,flags=re.S)
 return hashlib.sha256(text.encode()).hexdigest()
def record_published(source,root=ROOT):
 # Called only after the existing publisher has rendered and prepared both languages.
 data=json.loads((root/REGISTER).read_text());editorial=source.get('editorial') or {}
 fixture=source['doi'].startswith('10.0000/') and 'TEST ONLY' in source['title']
 if not editorial and not fixture:raise ValueError('A complete reviewed bilingual article is required for the publication register')
 key=source['source_date']+'-'+hashlib.sha256(source['doi'].encode()).hexdigest()[:12];sk='blog-journal-review-'+key+'.html'
 if any(a['id']==sk[:-5] for a in data['articles']):raise ValueError('Editorial register entry already exists')
 evidence=editorial.get('scientific_review',{})
 row={'id':sk[:-5],'kind':'technical_fixture' if fixture else 'research_commentary','review_status':'technical_fixture' if fixture else 'full_text_claim_comparison','reviewed_at':editorial.get('reviewed_at',str(__import__('datetime').date.today())),'source_records':editorial.get('references',[]),'scientific_full_text_compared':bool(editorial),'source_restriction':False,'methodology':evidence.get('methodology',{}),'results':evidence.get('statistics',[]),'practical_recommendations':evidence.get('editorial_separation','test only'),'image':'licensed catalog assignment','publication':'owner_approved' if editorial else 'isolated_test_only','notes':['Record completeness and hash validation are not independent scientific peer review.'],'languages':{},'claim_review':{}}
 for lang,name in [('sk',sk),('en',sk[:-5]+'-en.html')]:
  raw=(root/name).read_text();article=editorial.get('languages',{}).get(lang,{})
  row['languages'][lang]={'path':name,'title':article.get('title','TEST ONLY'),'description':article.get('description','TEST ONLY'),'language_review':'recorded editorial SK/EN comparison' if editorial else 'isolated technical fixture','published_at':str(__import__('datetime').date.today()),'modified_at':None,'seo':'technical pipeline passed','links':'local pipeline passed','content_sha256':digest(raw)}
  row['claim_review'][lang]=[{'section':s['heading'],'claim_kind':'recorded_editorial_comparison','source_ids':[r.get('id','source') for r in editorial.get('references',[])],'comparison':'See original scientific_review evidence; technical test does not validate interpretation.'} for s in article.get('sections',[])]
 data['articles'].append(row);(root/REGISTER).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
