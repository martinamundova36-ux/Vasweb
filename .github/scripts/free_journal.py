#!/usr/bin/env python3
"""Zero-AI-cost bibliographic draft workflow. No generated scientific findings."""
from pathlib import Path
import shutil,tempfile
import argparse,datetime as dt,hashlib,html,json,re,subprocess,sys,time,urllib.parse,urllib.request
ROOT=Path(__file__).resolve().parents[2]
SITE='https://www.webu.sk/'
NOW=dt.datetime.now(dt.timezone.utc).date()
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
 if record.get('relation',{}).get('is-retracted-by') or any(x.get('type')=='retraction' for x in record.get('update-to',[])):raise ValueError('Retraction flagged')
 if expected and (normal(title)!=normal(expected['title']) or doi!=expected['doi']):raise ValueError('Source metadata changed; review again')
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
def identifier(source):return source['source_date']+'-'+hashlib.sha256(source['doi'].encode()).hexdigest()[:12]
def render(source,lang):
 en=lang=='en';key=identifier(source);name='blog-journal-review-'+key+('-en' if en else '')+'.html';other='blog-journal-review-'+key+('' if en else '-en')+'.html'
 title=('Research record: ' if en else 'Výskumný prehľad: ')+source['title'];desc=(('Bibliographic overview: ' if en else 'Bibliografický prehľad: ')+source['title'])[:155]
 esc=lambda x:html.escape(str(x),quote=True)
 citation='; '.join(source['authors'])+' ('+source['source_date']+'). '+source['title']+'. '+source['venue']+'. '+source['publisher']+'.'
 heading='What was checked' if en else 'Čo bolo skontrolované'
 scope=('This is an automatically prepared bibliographic overview, not an original analysis of scientific findings. DOI, title, authors, publisher, venue and publication date were checked against Crossref. Full text, sample, methods, findings and peer-review status were not independently reviewed. An available abstract was used only to select the topic; it is not reproduced.' if en else 'Ide o automaticky pripravený bibliografický prehľad, nie originálnu analýzu vedeckých výsledkov. DOI, názov, autori, vydavateľ, periodikum a dátum boli skontrolované v Crossref. Celý text, vzorka, metodika, výsledky ani recenzné konanie neboli nezávisle posúdené. Dostupný abstrakt bol použitý iba na výber témy; nie je reprodukovaný.')
 questions=(['Which research question does the source address?','Do its participants, setting and methods match your business context?','What limitations and alternative explanations does the full text report?','What small, measurable pilot could test relevance to your own website?'] if en else ['Akú výskumnú otázku zdroj rieši?','Zodpovedajú jeho účastníci, prostredie a metódy vášmu podnikaniu?','Aké obmedzenia a alternatívne vysvetlenia uvádza celý text?','Aký malý merateľný pilot by overil využiteľnosť pre váš web?'])
 body='<h2>'+('Bibliographic source' if en else 'Bibliografický zdroj')+'</h2><p>'+esc(citation)+'</p><p><a href="'+esc(source['url'])+'">DOI: '+esc(source['doi'])+'</a></p><h2>'+heading+'</h2><p>'+scope+'</p><h2>'+('Editorial questions for readers' if en else 'Redakčné otázky pre čitateľa')+'</h2><p>'+('The following questions are editorial guidance, not results demonstrated by this study.' if en else 'Nasledujúce otázky sú redakčným odporúčaním, nie výsledkami preukázanými touto štúdiou.')+'</p><ul>'+''.join('<li>'+esc(q)+'</li>' for q in questions)+'</ul>'
 schema={'@context':'https://schema.org','@type':'BlogPosting','headline':title,'description':desc,'datePublished':str(NOW),'inLanguage':lang,'author':{'@type':'Organization','name':'WEBU'},'publisher':{'@type':'Organization','name':'WEBU'},'mainEntityOfPage':SITE+name,'citation':source['url']}
 sample=(ROOT/'blog-journal-podnikanie-v-nedostatku-2026-11-03.html').read_text();style=re.search(r'<style>.*?</style>',sample,re.S).group()
 page='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' | WEBU Journal</title><meta name="description" content="'+esc(desc)+'"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'+style+'</head><body><header><a href="/'+('blog-en.html' if en else 'blog.html')+'">WEBU Journal</a> · <a href="/'+other+'">'+('Slovenčina' if en else 'English')+'</a></header><main><p>'+('Bibliographic overview' if en else 'Bibliografický prehľad')+' · '+str(NOW)+'</p><h1>'+esc(title)+'</h1>'+body+'</main><footer>© WEBU</footer><script src="/privacy.js" defer></script></body></html>'
 return name,page,title,desc
def discover(config):
 selected=[];seen=seen_dois();errors=[]
 for topic in config['topics']:
  params=urllib.parse.urlencode({'query':topic,'filter':'from-pub-date:'+(NOW-dt.timedelta(days=config['lookback_days'])).isoformat()+',until-pub-date:'+str(NOW)+',type:journal-article','rows':12,'sort':'published','order':'desc'})
  try:
   for record in fetch('https://api.crossref.org/works?'+params)['message']['items']:
    try:
     source=verify(record)
     if source['doi'] in seen or not source['abstract_available'] or source['abstract_words']<80 or len(source['selection_keywords'])<config['minimum_relevance_score']:continue
     confirmed=verify(fetch('https://api.crossref.org/works/'+urllib.parse.quote(source['doi'],safe='/'))['message'],source)
     selected.append(confirmed);seen.add(source['doi']);break
    except (ValueError,KeyError):continue
  except Exception as exc:errors.append(topic+': '+str(exc)[:150])
  if len(selected)>=config['max_candidates_per_run']:break
  time.sleep(1)
 return selected,errors
def publish(source):
 for lang,listing_name in [('sk','blog.html'),('en','blog-en.html')]:
  name,page,title,desc=render(source,lang)
  if (ROOT/name).exists():raise ValueError('Article URL already exists')
  listing=ROOT/listing_name;text=listing.read_text();marker='<div class="vw-journal-grid">'
  if marker not in text:raise ValueError('Journal listing missing')
  card='<a class="vw-journal-card" href="/'+name+'"><div><small>'+('Bibliographic overview' if lang=='en' else 'Bibliografický prehľad')+'</small><h3>'+html.escape(title)+'</h3><p>'+html.escape(desc)+'</p><span>'+('Read more' if lang=='en' else 'Čítať viac')+'</span></div></a>'
  (ROOT/name).write_text(page);listing.write_text(text.replace(marker,marker+card,1))
 subprocess.run([sys.executable,str(ROOT/'.github/scripts/prepare_journal.py')],cwd=ROOT,check=True)
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
  if source.get('published_at'):raise SystemExit('Draft already published')
  source=verify(fetch('https://api.crossref.org/works/'+urllib.parse.quote(source['doi'],safe='/'))['message'],source)
  # Explicit workflow_dispatch publish action is the owner's approval.
  source['approved_by']=__import__('os').environ.get('GITHUB_ACTOR','manual-owner');publish(source)
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
  original_root=ROOT
  with tempfile.TemporaryDirectory(prefix='webu-journal-test-') as temp:
   test=Path(temp)/'site';shutil.copytree(ROOT,test,ignore=shutil.ignore_patterns('.git','__pycache__'))
   subprocess.run(['git','init','-q'],cwd=test,check=True)
   subprocess.run(['git','add','.'],cwd=test,check=True)
   subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=test,check=True)
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
  key=identifier(source);(folder/(key+'.json')).write_text(json.dumps(source,ensure_ascii=False,indent=2))
  draft='# WEBU Journal – bibliografický návrh / draft\n\nID: '+key+'\n\n'+source['title']+'\n\nDOI: '+source['url']+'\n\nTento návrh nie je publikovaný na webe. Neobsahuje nezávisle overené vedecké výsledky.\n\n'
  for lang in ('sk','en'):
   name,page,title,desc=render(source,lang);draft+='## '+lang.upper()+'\n\n'+title+'\n\n'+desc+'\n\n'
  draft+='## Pred schválením\n\n- Otvoriť DOI a overiť bibliografiu.\n- Posúdiť tematickú užitočnosť pre čitateľov.\n- Pri dopĺňaní vedeckých záverov overiť abstrakt/plný text, metódu, vzorku a limity.\n- Schválenie publikuje iba označený bibliografický prehľad; plná vedecká analýza sa negeneruje.\n'
  (folder/(key+'.md')).write_text(draft)
 report={'date':str(NOW),'mode':'drafts_require_approval','draft_ids':[identifier(s) for s in selected],'published_urls':[],'errors':errors,'ai_cost_eur':0,'google_index_status':'not inspected'}
 out=ROOT/'journal-reports';out.mkdir(exist_ok=True);(out/('free-discovery-'+str(NOW)+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
