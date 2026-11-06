#!/usr/bin/env python3
"""Zero-AI-cost bibliographic draft workflow. No generated scientific findings."""
from pathlib import Path
import shutil,tempfile
import urllib.error
import argparse,datetime as dt,hashlib,html,json,re,subprocess,sys,time,urllib.parse,urllib.request
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[2]
SITE='https://www.webu.sk/'
NOW=dt.datetime.now(ZoneInfo('Europe/Bratislava')).date()
KEYWORDS={'digital marketing','small business','entrepreneurship','customer','e-commerce','ecommerce','organizational','workplace','productivity','artificial intelligence','usability','consumer','leadership'}
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'WEBU-Bibliographic-Review/1.0 (https://www.webu.sk/)','Accept':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def clean(value):return html.unescape(re.sub('<[^>]*>',' ',value)).strip()
def normal(value):return re.sub(r'\s+',' ',value.casefold()).strip()
def verify(record,expected=None):
 doi=record.get('DOI','').lower();title=clean((record.get('title') or [''])[0]);authors=record.get('author') or []
 parts=(record.get('published') or {}).get('date-parts',[[]])[0]
 if not re.fullmatch(r'10\.\d{4,9}/\S+',doi) or not title or not authors or not record.get('publisher') or not record.get('container-title'):raise ValueError('Incomplete DOI bibliography')
 if record.get('type') not in ('journal-article','proceedings-article'):raise ValueError('Unsupported source type')
 if len(parts)<3:raise ValueError('Source needs a full publication date')
 date=dt.date(*parts[:3])
 if date>NOW:raise ValueError('Future-dated source')
 relations=record.get('relation') or {}
 if any(relations.get(k) for k in ('is-retracted-by','is-retraction-of')):raise ValueError('Retraction flagged')
 notices=(record.get('update-to') or [])+(record.get('updated-by') or [])
 if any(x.get('type','').lower().replace('_','-') in ('retraction','withdrawal','expression-of-concern','correction','erratum','corrigendum','addendum') for x in notices):raise ValueError('Source integrity notice requires review')
 if any(relations.get(k) for k in ('is-corrected-by','is-updated-by')):raise ValueError('Correction/update relation requires editorial review')
 if expected:
  current={'title':title,'doi':doi,'authors':[' '.join(filter(None,[a.get('given'),a.get('family')])) for a in authors],'publisher':record['publisher'],'venue':record['container-title'][0],'source_date':date.isoformat(),'type':record['type']}
  for field,value in current.items():
   old=expected.get(field)
   if isinstance(value,list):
    same=isinstance(old,list) and [normal(x) for x in value]==[normal(x) for x in old]
   else:same=isinstance(old,str) and normal(value)==normal(old)
   if not same:raise ValueError('Source '+field+' changed; review again')
 abstract=clean(record.get('abstract',''))
 matched=sorted(k for k in KEYWORDS if k in (title+' '+abstract).casefold())
 return {'doi':doi,'title':title,'authors':[' '.join(filter(None,[a.get('given'),a.get('family')])) for a in authors],'publisher':record['publisher'],'venue':record['container-title'][0],'source_date':date.isoformat(),'type':record['type'],'url':'https://doi.org/'+doi,'abstract_available':bool(abstract),'abstract_words':len(abstract.split()),'selection_keywords':matched,'verified_at':NOW.isoformat(),'full_text_reviewed':False,'source':'Crossref REST API','content_kind':'bibliographic overview, not scientific analysis'}
def seen_dois():
 seen=set()
 for p in ROOT.glob('blog-*.html'):
  seen.update(x.lower() for x in re.findall(r'https://doi.org/([^\s"<>]+)',p.read_text()))
 for p in (ROOT/'journal-drafts').glob('*.json'):
  try:seen.add(json.loads(p.read_text())['doi'].lower())
  except (ValueError,KeyError):pass
 return seen
def seen_titles():
 titles=set()
 for path in (ROOT/'journal-drafts').glob('*.json'):
  value=json.loads(path.read_text()).get('title','')
  if value:titles.add(normal(value))
 for path in ROOT.glob('blog-*.html'):
  for value in re.findall(r'<h1[^>]*>(.*?)</h1>',path.read_text(),re.S):titles.add(normal(clean(value)))
 return titles
def publication_capacity(folder,limit):
 return max(0,limit-sum(json.loads(p.read_text()).get('published_at')==str(NOW) for p in folder.glob('*.json')))
def identifier(source):return source['source_date']+'-'+hashlib.sha256(source['doi'].encode()).hexdigest()[:12]
def editorial_digest(languages):
 return hashlib.sha256(json.dumps(languages,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def check_source_availability(url):
 # HTTP/MIME availability only; this does not read or scientifically assess the source.
 req=urllib.request.Request(url,headers={'User-Agent':'WEBU-Source-Availability/1.0 (https://www.webu.sk/)'})
 with urllib.request.urlopen(req,timeout=30) as response:
  media=response.headers.get('Content-Type','').split(';')[0].strip().lower()
  if response.status!=200 or media not in ('text/html','application/xhtml+xml','application/pdf','application/xml','text/xml'):raise ValueError('Scientific source unavailable or unsupported; editorial review required')
  if media=='application/pdf' and response.read(5)!=b'%PDF-':raise ValueError('Scientific PDF content does not match its declared type')
 return media

def validate_scientific_evidence(editorial):
 # This gate checks an accountable review record, never the truth of a study.
 review=editorial.get('scientific_review') or {}
 if review.get('status')!='completed_editorial_source_comparison':raise ValueError('Scientific source comparison requires editorial review')
 if review.get('source_access')!='full_text':raise ValueError('Full text unavailable: disclose this and request editorial review; do not publish unverifiable findings')
 for field in ('reviewed_by','reviewed_at','source_url','causality','limitations','bilingual_alignment','editorial_separation','technical_test_scope'):
  if not review.get(field):raise ValueError('Scientific review evidence missing: '+field)
 if review.get('source_url')!=editorial.get('source_url'):raise ValueError('Reviewed scientific source changed')
 if review.get('content_sha256')!=editorial.get('content_sha256'):raise ValueError('Scientific review is not bound to this bilingual text')
 quality=review.get('source_quality') or {}
 if quality.get('decision') not in ('accepted','accepted_with_limitations') or not quality.get('rationale') or not isinstance(quality.get('concerns'),list):raise ValueError('Source quality is missing or on hold; editorial quality review required')
 if review.get('unverified_claims')!=[]:raise ValueError('Unverified findings require editorial resolution')
 if not all(review.get('methodology',{}).get(k) for k in ('design','sample','locator')):raise ValueError('Method/sample evidence missing')
 if not review.get('statistics') or any(not all(c.get(k) for k in ('claim_id','estimate','endpoint','locator','interpretation')) for c in review['statistics']):raise ValueError('Statistical claim evidence missing (or explain explicitly why no numerical claim is made)')
 integrity=review.get('integrity') or {}
 if integrity.get('status')!='checked_no_notice_found' or not integrity.get('sources') or not integrity.get('scope'):raise ValueError('Publication corrections/retractions require editorial review')
 try:
  dates=[dt.date.fromisoformat(review['reviewed_at']),dt.date.fromisoformat(integrity['checked_at'])]
 except (ValueError,KeyError):raise ValueError('Scientific review date invalid')
 if any(d>NOW or (NOW-d).days>30 for d in dates):raise ValueError('Scientific/integrity review needs refresh (30-day maximum)')
 return review

def validate_editorial(source):
 editorial=source.get('editorial') or {}
 if editorial.get('status')=='automated_abstract_editorial':
  # Automated research-inspired commentary is deliberately NOT a full-text
  # scientific review. Keep it separate from the owner's review evidence.
  if editorial.get('source_scope')!='verified_crossref_abstract_only':raise ValueError('Automated source scope missing')
  if editorial.get('source_url')!=source.get('url'):raise ValueError('Automated source URL changed')
  if editorial.get('content_sha256')!=editorial_digest(editorial.get('languages',{})):raise ValueError('Automated text changed after generation')
  if set(editorial.get('languages',{}))!={'sk','en'}:raise ValueError('Automated article requires SK and EN')
  if normal(editorial['languages']['sk'].get('title',''))==normal(editorial['languages']['en'].get('title','')):raise ValueError('SK and EN titles must be localized')
  if editorial.get('generated_by')!='gemini_from_abstract' or not editorial.get('generated_at'):raise ValueError('Automated generation provenance missing')
  if not editorial.get('references') or editorial['references'][0].get('url')!=source['url'] or not editorial['references'][0].get('apa7'):raise ValueError('DOI reference missing')
  for lang,article in editorial['languages'].items():
   if not article.get('title') or not article.get('lead') or not 50<=len(article.get('description',''))<=160:raise ValueError('Automated metadata incomplete: '+lang)
   sections=article.get('sections',[])
   if len(sections)!=6 or any(not s.get('heading') or len(s.get('paragraphs',[]))<2 for s in sections):raise ValueError('Automated article sections incomplete: '+lang)
   if len(' '.join([article['lead']]+[p for s in sections for p in s['paragraphs']]).split())<300:raise ValueError('Automated article too short: '+lang)
  return editorial
 if editorial.get('status')!='ready_for_owner_approval':raise ValueError('A reviewed bilingual article is required; bibliographic templates cannot be published')
 if set(editorial.get('languages',{}))!={'sk','en'}:raise ValueError('Both SK and EN articles are required')
 if not all(editorial.get('checks',{}).get(k) is True for k in ('bibliography','source','claims','relevance','bilingual')):raise ValueError('Editorial checks incomplete')
 if not editorial.get('references') or any(not r.get('apa7') or not r.get('url','').startswith('https://') for r in editorial.get('references',[])):raise ValueError('Verified APA7 reference records required')
 if not editorial.get('source_url','').startswith('https://') or not editorial.get('source_scope'):raise ValueError('Source review evidence missing')
 try:reviewed=dt.date.fromisoformat(editorial['reviewed_at'])
 except (ValueError,KeyError):raise ValueError('Invalid editorial review date')
 if reviewed>NOW:raise ValueError('Future editorial review')
 if editorial.get('content_sha256')!=editorial_digest(editorial['languages']):raise ValueError('Article content changed after review')
 validate_scientific_evidence(editorial)
 for lang,article in editorial['languages'].items():
  if not article.get('title') or not article.get('lead') or not 50<=len(article.get('description',''))<=160:raise ValueError('Article metadata incomplete: '+lang)
  sections=article.get('sections',[])
  if len(sections)<5 or any(not x.get('heading') or not x.get('paragraphs') for x in sections):raise ValueError('Article sections incomplete: '+lang)
  if len((' '.join([article['lead']]+[p for x in sections for p in x.get('paragraphs',[])+x.get('items',[])])).split())<180:raise ValueError('Article is only an outline: '+lang)
 return editorial

def render(source,lang):
 en=lang=='en';key=identifier(source);name='blog-journal-review-'+key+('-en' if en else '')+'.html';other='blog-journal-review-'+key+('' if en else '-en')+'.html'
 title=('Research record: ' if en else 'Výskumný prehľad: ')+source['title'];desc=(('Bibliographic overview: ' if en else 'Bibliografický prehľad: ')+source['title'])[:155]
 esc=lambda x:html.escape(str(x),quote=True)
 citation='; '.join(source['authors'])+' ('+source['source_date']+'). '+source['title']+'. '+source['venue']+'. '+source['publisher']+'.'
 heading='What was checked' if en else 'Čo bolo skontrolované'
 scope=('This is an automatically prepared bibliographic overview, not an original analysis of scientific findings. DOI, title, authors, publisher, venue and publication date were checked against Crossref. Full text, sample, methods, findings and peer-review status were not independently reviewed. An available abstract was used only to select the topic; it is not reproduced.' if en else 'Ide o automaticky pripravený bibliografický prehľad, nie originálnu analýzu vedeckých výsledkov. DOI, názov, autori, vydavateľ, periodikum a dátum boli skontrolované v Crossref. Celý text, vzorka, metodika, výsledky ani recenzné konanie neboli nezávisle posúdené. Dostupný abstrakt bol použitý iba na výber témy; nie je reprodukovaný.')
 questions=(['Which research question does the source address?','Do its participants, setting and methods match your business context?','What limitations and alternative explanations does the full text report?','What small, measurable pilot could test relevance to your own website?'] if en else ['Akú výskumnú otázku zdroj rieši?','Zodpovedajú jeho účastníci, prostredie a metódy vášmu podnikaniu?','Aké obmedzenia a alternatívne vysvetlenia uvádza celý text?','Aký malý merateľný pilot by overil využiteľnosť pre váš web?'])
 body='<h2>'+('Bibliographic source' if en else 'Bibliografický zdroj')+'</h2><p>'+esc(citation)+'</p><p><a href="'+esc(source['url'])+'">DOI: '+esc(source['doi'])+'</a></p><h2>'+heading+'</h2><p>'+scope+'</p><h2>'+('Editorial questions for readers' if en else 'Redakčné otázky pre čitateľa')+'</h2><p>'+('The following questions are editorial guidance, not results demonstrated by this study.' if en else 'Nasledujúce otázky sú redakčným odporúčaním, nie výsledkami preukázanými touto štúdiou.')+'</p><ul>'+''.join('<li>'+esc(q)+'</li>' for q in questions)+'</ul>'
 if source.get('editorial'):
  editorial=validate_editorial(source);article=editorial['languages'][lang]
  title=article['title'];desc=article['description']
  automated=editorial['status']=='automated_abstract_editorial'
  disclosure=('This AI-assisted editorial summary is based on the publisher-supplied abstract and DOI record, not on an independently verified full text. The study findings, methods and statistics have not been independently checked. Practical advice is WEBU editorial guidance, not a conclusion proved by the study.' if en else 'Tento redakčný prehľad pripravený s pomocou AI vychádza z abstraktu vydavateľa a záznamu DOI, nie z nezávisle overeného plného textu. Zistenia, metodika a štatistiky štúdie neboli nezávisle skontrolované. Praktické odporúčania sú redakčným návrhom WEBU, nie záverom preukázaným štúdiou.')
  body=('<aside class="webu-source-scope"><p>'+esc(disclosure)+'</p></aside>' if automated else '')+'<p>'+esc(article['lead'])+'</p>'
  for section in article['sections']:
   body+='<h2>'+esc(section['heading'])+'</h2>'+''.join('<p>'+esc(p)+'</p>' for p in section['paragraphs'])
   if section.get('items'):body+='<ul>'+''.join('<li>'+esc(i)+'</li>' for i in section['items'])+'</ul>'
  body+='<h2>'+('Scientific sources' if en else 'Vedecké zdroje')+'</h2>'+''.join('<p>'+esc(r['apa7'])+' <a href="'+esc(r['url'])+'">'+esc(r['url'])+'</a></p>' for r in editorial['references'])
  method='/journal-metodika'+('-en' if en else '')+'.html'
  body+='<aside><h2>'+('Editorial transparency' if en else 'Redakčná transparentnosť')+'</h2><p>'+('Automated abstract-based commentary; no independent scientific peer review or full-text comparison. ' if automated and en else 'Automatický komentár založený na abstrakte; bez nezávislého vedeckého posúdenia či porovnania plného textu. ' if automated else 'Prepared with AI assistance; editorial source comparison is not independent scientific peer review. ' if en else 'Pripravené s pomocou AI; redakčné porovnanie zdroja nie je nezávislým vedeckým recenzným konaním. ')+'<a href="'+method+'">'+('Editorial methodology and corrections' if en else 'Redakčná metodika a opravy')+'</a></p></aside>'

 schema={'@context':'https://schema.org','@type':'BlogPosting','headline':title,'description':desc,'datePublished':str(NOW),'inLanguage':lang,'author':{'@type':'Organization','name':'WEBU'},'publisher':{'@type':'Organization','name':'WEBU'},'mainEntityOfPage':SITE+name,'citation':source['url']}
 sample=(ROOT/'blog-journal-podnikanie-v-nedostatku-2026-11-03.html').read_text();style=re.search(r'<style>.*?</style>',sample,re.S).group()
 page='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' | WEBU Journal</title><meta name="description" content="'+esc(desc)+'"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'+style+'<link rel="stylesheet" href="/journal-editorial.css?v=20261104-r2"></head><body><header><a href="/'+('blog-en.html' if en else 'blog.html')+'">WEBU Journal</a> · <a href="/'+other+'">'+('Slovenčina' if en else 'English')+'</a></header><main><!-- WEBU-REVIEWED-CONTENT-START --><article class="webu-reviewed-article"><p>'+(('Research-inspired editorial' if en else 'Výskumná inšpirácia') if source.get('editorial') else ('Bibliographic overview' if en else 'Bibliografický prehľad'))+' · '+str(NOW)+'</p><h1>'+esc(title)+'</h1><p>'+('Author: ' if en else 'Autor: ')+'<a href="/journal-metodika'+('-en' if en else '')+'.html#redakcia">WEBU</a></p>'+body+'</article><!-- WEBU-REVIEWED-CONTENT-END --></main><footer>© WEBU</footer><script src="/privacy.js" defer></script></body></html>'
 return name,page,title,desc
def discover(config):
 selected=[];seen=seen_dois();titles=seen_titles();errors=[]
 for topic in config['topics']:
  params=urllib.parse.urlencode({'query':topic,'filter':'from-pub-date:'+(NOW-dt.timedelta(days=config['lookback_days'])).isoformat()+',until-pub-date:'+str(NOW)+',type:journal-article','rows':12,'sort':'published','order':'desc'})
  try:
   for record in fetch('https://api.crossref.org/works?'+params)['message']['items']:
    try:
     source=verify(record)
     if source['doi'] in seen or normal(source['title']) in titles or not source['abstract_available'] or source['abstract_words']<80 or len(source['selection_keywords'])<config['minimum_relevance_score']:continue
     confirmed=verify(fetch('https://api.crossref.org/works/'+urllib.parse.quote(source['doi'],safe='/'))['message'],source)
     selected.append(confirmed);seen.add(source['doi']);titles.add(normal(source['title']));break
    except (ValueError,KeyError):continue
  except urllib.error.HTTPError as exc:
   errors.append(topic+': HTTP '+str(exc.code)+'; Retry-After='+str(exc.headers.get('Retry-After','unspecified')))
   if exc.code==429:break
  except Exception as exc:errors.append(topic+': '+str(exc)[:150])
  if len(selected)>=config['max_candidates_per_run']:break
  time.sleep(1)
 return selected,errors
def publish(source):
 # Preflight both languages before any local writes; failed jobs never commit.
 for lang,listing_name in [('sk','blog.html'),('en','blog-en.html')]:
  if (ROOT/render(source,lang)[0]).exists():raise ValueError('Article URL already exists')
  if '<div class="vw-journal-grid">' not in (ROOT/listing_name).read_text():raise ValueError('Journal listing missing')
 from journal_images import choose_for_source
 photo=choose_for_source(source,ROOT);source['image_id']=photo['id'];source['image_status']='licensed_catalog_assignment'
 for lang,listing_name in [('sk','blog.html'),('en','blog-en.html')]:
  name,page,title,desc=render(source,lang)
  if (ROOT/name).exists():raise ValueError('Article URL already exists')
  listing=ROOT/listing_name;text=listing.read_text();marker='<div class="vw-journal-grid">'
  if marker not in text:raise ValueError('Journal listing missing')
  card='<a class="vw-journal-card" href="/'+name+'"><div><small>'+(('Research-inspired editorial' if lang=='en' else 'Výskumná inšpirácia') if source.get('editorial') else ('Bibliographic overview' if lang=='en' else 'Bibliografický prehľad'))+'</small><h3>'+html.escape(title)+'</h3><p>'+html.escape(desc)+'</p><span>'+('Read more' if lang=='en' else 'Čítať viac')+'</span></div></a>'
  (ROOT/name).write_text(page);listing.write_text(text.replace(marker,marker+card,1))
 subprocess.run([sys.executable,str(ROOT/'.github/scripts/prepare_journal.py')],cwd=ROOT,check=True)
 from journal_review_records import record_published
 record_published(source,ROOT)
 subprocess.run([sys.executable,'scripts/journal_review_audit.py'],cwd=ROOT,check=True)
 subprocess.run([sys.executable,'scripts/journal_audit.py','--publish-gate'],cwd=ROOT,check=True)
def main():
 global ROOT
 ap=argparse.ArgumentParser();ap.add_argument('--action',choices=['draft','publish','self-test'],default='draft');ap.add_argument('--draft-id');args=ap.parse_args()
 config=json.loads((ROOT/'journal-config.json').read_text())
 if config.get('paid_ai_enabled'):raise SystemExit('Paid AI is forbidden in this workflow')
 folder=ROOT/'journal-drafts';folder.mkdir(exist_ok=True)
 if args.action=='publish':
  if not args.draft_id or not re.fullmatch(r'\d{4}-\d{2}-\d{2}-[a-f0-9]{12}',args.draft_id):raise SystemExit('Select an exact draft ID')
  path=folder/(args.draft_id+'.json');source=json.loads(path.read_text())
  if source.get('test_only'):raise SystemExit('Notification test fixtures can never be published')
  if source.get('published_at'):raise SystemExit('Draft already published')
  if not publication_capacity(folder,config['target_studies_per_day']):raise SystemExit('Daily publication cap reached')
  editorial=validate_editorial(source)
  # For an automated abstract digest, the fresh Crossref record is the
  # declared source. A full-text comparison is never claimed.
  if editorial['status']!='automated_abstract_editorial':check_source_availability(editorial['source_url'])
  drafted_at=source.get('drafted_at',source.get('verified_at'))
  source=verify(fetch('https://api.crossref.org/works/'+urllib.parse.quote(source['doi'],safe='/'))['message'],source)
  if not source['abstract_available'] or source['abstract_words']<80 or len(source['selection_keywords'])<config['minimum_relevance_score']:raise ValueError('Current source evidence or relevance is insufficient')
  source['drafted_at']=drafted_at;source['editorial']=editorial
  source['full_text_reviewed']=editorial.get('review_level')=='full_text_sections'
  source['approved_by']=('abstract_automation' if editorial['status']=='automated_abstract_editorial' else 'verified_automation' if __import__('os').environ.get('WEBU_AUTOPUBLISH_VERIFIED')=='true' else __import__('os').environ.get('GITHUB_ACTOR','manual-owner'));source['approved_content_sha256']=editorial['content_sha256'];publish(source)
  source['published_at']=str(NOW);source['published_urls']=[SITE+render(source,lang)[0] for lang in ('sk','en')];path.write_text(json.dumps(source,ensure_ascii=False,indent=2));print(json.dumps(source,ensure_ascii=False));return
 if args.action=='self-test':
  source={'doi':'10.0000/test-only','title':'Digital marketing and small business — TEST ONLY','authors':['Test Author'],'publisher':'Test publisher','venue':'Test fixture','url':'https://doi.org/10.0000/test-only','source_date':'2026-01-01','type':'journal-article'}
  for lang in ('sk','en'):
   name,page,title,desc=render(source,lang)
   assert page.count('<h1>')==1 and 'BlogPosting' in page and source['doi'] in page and len(desc)<=160
   from html.parser import HTMLParser
   HTMLParser().feed(page)
  future={'DOI':'10.1234/test','title':['x'],'author':[{'family':'x'}],'publisher':'x','container-title':['x'],'published':{'date-parts':[[NOW.year+1,1,1]]},'type':'journal-article'}
  try:verify(future)
  except ValueError:pass
  else:raise AssertionError('Future source accepted')
  record={'DOI':'10.1234/test','title':['Digital marketing'],'author':[{'given':'A','family':'Author'}],'publisher':'Publisher','container-title':['Venue'],'published':{'date-parts':[[2026,1,1]]},'type':'journal-article'}
  verified=verify(record)
  assert verify(record,verified)==verified
  for field,new in [('authors',['Other Author']),('source_date','2025-01-01'),('publisher','Other Publisher'),('venue','Other Venue')]:
   changed=dict(verified);changed[field]=new
   try:verify(record,changed)
   except ValueError:pass
   else:raise AssertionError('Changed '+field+' accepted')
  with tempfile.TemporaryDirectory() as cap:
   for i in range(5):Path(cap,str(i)+'.json').write_text(json.dumps({'published_at':str(NOW)}))
   assert publication_capacity(Path(cap),5)==0
  original_root=ROOT
  with tempfile.TemporaryDirectory(prefix='webu-journal-test-') as temp:
   test=Path(temp)/'site';shutil.copytree(ROOT,test,ignore=shutil.ignore_patterns('.git','__pycache__'))
   subprocess.run(['git','init','-q'],cwd=test,check=True)
   subprocess.run(['git','add','.'],cwd=test,check=True)
   subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=test,check=True)
   # A synthetic licensed-image catalog entry is confined to this disposable test copy.
   # Production image assignments and the no-reuse rule remain untouched.
   catalog_path=test/'journal-images.json'
   catalog=json.loads(catalog_path.read_text())
   fixture=next((p for p in catalog['photos'] if 'business' in p.get('topics',[])),None)
   if fixture is None:raise AssertionError('Self-test requires an existing licensed business photo')
   fixture=dict(fixture);fixture['id']='self-test-business-photo'
   catalog['photos'].append(fixture)
   catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
   ROOT=test
   try:
    publish(source)
    assert all(render(source,l)[0] in (ROOT/'sitemap.xml').read_text() for l in ('sk','en'))
    try:publish(source)
    except ValueError:pass
    else:raise AssertionError('Duplicate accepted')
   finally:ROOT=original_root
  print('PASS: isolated SK/EN publication, listings, sitemap, SEO/editorial gates, duplicate/future-date rejection; no public article or AI call');return
 existing=[json.loads(p.read_text()) for p in folder.glob('*.json')]
 daily=sum(x.get('drafted_at',x['verified_at'])==str(NOW) for x in existing)
 remaining=max(0,config['target_studies_per_day']-daily)
 config['max_candidates_per_run']=min(config['max_candidates_per_run'],remaining)
 selected,errors=([],['Daily quality cap reached']) if not remaining else discover(config)
 for source in selected:
  source['drafted_at']=str(NOW)
  source['scientific_review_status']='needs_editorial_review'
  source['scientific_review_note']='Bibliographic metadata and abstract selection only. Full text, sample, methodology, statistical interpretation and bilingual claims require documented editorial source comparison.'
  from journal_images import choose_for_source
  try:
   photo=choose_for_source(source,ROOT);source['image_id']=photo['id'];source['image_status']='licensed_catalog_assignment_pending_editorial_relevance_check'
  except ValueError as exc:source['image_status']='needs_image';source['image_note']=str(exc)
  key=identifier(source);(folder/(key+'.json')).write_text(json.dumps(source,ensure_ascii=False,indent=2))
  draft='# WEBU Journal – bibliografický návrh / draft\n\nID: '+key+'\n\n'+source['title']+'\n\nDOI: '+source['url']+'\n\nTento návrh nie je publikovaný na webe. Neobsahuje nezávisle overené vedecké výsledky.\n\n'
  for lang in ('sk','en'):
   name,page,title,desc=render(source,lang);draft+='## '+lang.upper()+'\n\n'+title+'\n\n'+desc+'\n\n'
  draft+='## Pred schválením\n\n- Otvoriť DOI a overiť bibliografiu.\n- Posúdiť tematickú užitočnosť pre čitateľov.\n- Pri dopĺňaní vedeckých záverov overiť abstrakt/plný text, metódu, vzorku a limity.\n- Pred publikovaním je povinný overený dvojjazyčný článok a záznam scientific_review; automatický návrh nie je vedecky posúdený článok.\n'
  (folder/(key+'.md')).write_text(draft)
 previous_path=ROOT/'journal-reports'/('free-discovery-'+str(NOW)+'.json')
 previous=json.loads(previous_path.read_text()) if previous_path.exists() else {}
 report={'date':str(NOW),'mode':'drafts_require_approval','generator_capability':'bibliographic_candidates_only','complete_articles_automatically_written':0,'draft_ids':sorted(set(previous.get('draft_ids',[]))|{p.stem for p in folder.glob('*.json') if json.loads(p.read_text()).get('drafted_at',json.loads(p.read_text()).get('verified_at'))==str(NOW)}),'published_urls':[],'errors':errors,'ai_cost_eur':0,'google_index_status':'not inspected'}
 out=ROOT/'journal-reports';out.mkdir(exist_ok=True);(out/('free-discovery-'+str(NOW)+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
 if remaining and errors and not selected:raise SystemExit('Discovery failed; inspect the recorded source errors before retrying')
if __name__=='__main__':main()
