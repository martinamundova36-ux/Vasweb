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
 automated=editorial.get('status')=='automated_abstract_editorial'
 row={'id':sk[:-5],'kind':'technical_fixture' if fixture else 'research_commentary','review_status':'technical_fixture' if fixture else 'automated_abstract_only' if automated else 'full_text_claim_comparison','reviewed_at':editorial.get('reviewed_at',str(__import__('datetime').date.today())),'source_records':editorial.get('references',[]),'scientific_full_text_compared':bool(editorial) and not automated,'source_restriction':automated,'methodology':evidence.get('methodology',{}),'results':evidence.get('statistics',[]),'practical_recommendations':evidence.get('editorial_separation','separate WEBU commentary, not verified study findings' if automated else 'test only'),'image':'licensed catalog assignment','publication':'automated_abstract_editorial' if automated else 'owner_approved' if editorial else 'isolated_test_only','notes':['Only publisher-supplied abstract and Crossref bibliography were checked automatically; no full-text or scientific review.' if automated else 'Record completeness and hash validation are not independent scientific peer review.'],'languages':{},'claim_review':{}}
 for lang,name in [('sk',sk),('en',sk[:-5]+'-en.html')]:
  raw=(root/name).read_text();article=editorial.get('languages',{}).get(lang,{})
  schemas=[json.loads(block) for block in re.findall(r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>',raw,re.S)]
  postings=[schema for schema in schemas if schema.get('@type')=='BlogPosting']
  if len(postings)!=1 or not postings[0].get('datePublished'):raise ValueError('Publication date missing from rendered BlogPosting')
  row['languages'][lang]={'path':name,'title':article.get('title','TEST ONLY'),'description':article.get('description','TEST ONLY'),'language_review':'AI-generated, abstract-scoped; not manually verified' if automated else 'recorded editorial SK/EN comparison' if editorial else 'isolated technical fixture','published_at':postings[0]['datePublished'],'modified_at':None,'seo':'technical pipeline passed','links':'local pipeline passed','content_sha256':digest(raw)}
  row['claim_review'][lang]=[{'section':s['heading'],'claim_kind':'unverified_abstract_based_commentary' if automated else 'recorded_editorial_comparison','source_ids':[r.get('id','source') for r in editorial.get('references',[])],'comparison':'Abstract-based AI commentary; no independent fact-check of research findings.' if automated else 'See original scientific_review evidence; technical test does not validate interpretation.'} for s in article.get('sections',[])]
 data['articles'].append(row);(root/REGISTER).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
