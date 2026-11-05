#!/usr/bin/env python3
"""Regression checks for reviewed-content publishing; no network or public writes."""
from pathlib import Path
import copy,datetime,importlib.util,json,shutil,subprocess,tempfile,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/".github/scripts"))
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('free_journal',ROOT/'.github/scripts/free_journal.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def rejected(call):
 try:call()
 except ValueError:return
 raise AssertionError('Unsafe publication input was accepted')
def main():
 source=next(json.loads(p.read_text()) for p in (ROOT/'journal-drafts').glob('*.json') if json.loads(p.read_text()).get('editorial') and json.loads(p.read_text()).get('published_at'))
 # Freeze the archived review fixture date; real publication still uses today.
 m.NOW=datetime.date.fromisoformat(source["editorial"]["reviewed_at"])
 m.validate_editorial(source)
 # A test must remain usable after the real article has already been published.
 source=copy.deepcopy(source);source['doi']='10.0000/reviewed-test-only';source['url']='https://doi.org/'+source['doi']
 for article in source['editorial']['languages'].values():
  article['title']+=' TEST ONLY';article['description']+=' TEST ONLY'
 source['editorial']['content_sha256']=m.editorial_digest(source['editorial']['languages'])
 source['editorial']['scientific_review']['content_sha256']=source['editorial']['content_sha256']
 for mutate in [lambda x:x.pop('editorial'),lambda x:x['editorial'].pop('references'),lambda x:x['editorial']['languages']['sk'].update(sections=x['editorial']['languages']['sk']['sections'][:3]),lambda x:x['editorial']['scientific_review'].pop('source_quality'),lambda x:x['editorial']['scientific_review']['source_quality'].update(decision='hold'),lambda x:x['editorial'].pop('scientific_review'),lambda x:x['editorial']['scientific_review'].update(source_access='abstract_only'),lambda x:x['editorial']['scientific_review'].update(unverified_claims=['unknown effect']),lambda x:x['editorial']['scientific_review']['methodology'].pop('sample'),lambda x:x['editorial']['scientific_review']['integrity'].update(status='correction_requires_review'),lambda x:x['editorial']['languages'].pop('en'),lambda x:x['editorial']['checks'].update(claims=False),lambda x:x['editorial']['languages']['sk'].update(title='Changed after review')]:
  bad=copy.deepcopy(source);mutate(bad);rejected(lambda:m.validate_editorial(bad))
 from unittest.mock import patch
 class Response:
  def __init__(self,media,body=b'',status=200):self.headers={'Content-Type':media};self.body=body;self.status=status
  def __enter__(self):return self
  def __exit__(self,*args):pass
  def read(self,n):return self.body[:n]
 for media,body in [('text/html; charset=utf-8',b'<html>'),('application/pdf',b'%PDF-1.7'),('application/xml',b'<?xml')]:
  with patch.object(m.urllib.request,'urlopen',return_value=Response(media,body)):
   assert m.check_source_availability('https://example.invalid/source')==media.split(';')[0]
 for response in [Response('application/pdf',b'<html>'),Response('application/octet-stream',b'data'),Response('text/html',b'',403)]:
  with patch.object(m.urllib.request,'urlopen',return_value=response):rejected(lambda:m.check_source_availability('https://example.invalid/source'))
 record={'DOI':source['doi'],'title':[source['title']],'author':[{'family':n} for n in source['authors']],'publisher':source['publisher'],'container-title':[source['venue']],'published':{'date-parts':[[int(x) for x in source['source_date'].split('-')]]},'type':'journal-article'}
 m.verify(record,source)
 for notice in [{'relation':{'is-retracted-by':[{'id':'10.1234/retraction'}]}},{'updated-by':[{'type':'retraction'}]},{'update-to':[{'type':'expression_of_concern'}]},{'updated-by':[{'type':'correction'}]},{'relation':{'is-corrected-by':[{'id':'10.0000/fix'}]}}]:
  bad=copy.deepcopy(record);bad.update(notice);rejected(lambda:m.verify(bad))
 with tempfile.TemporaryDirectory(prefix='webu-reviewed-test-') as temp:
  test=Path(temp)/'site';shutil.copytree(ROOT,test,ignore=shutil.ignore_patterns('.git','__pycache__'))
  subprocess.run(['git','init','-q'],cwd=test,check=True);subprocess.run(['git','add','.'],cwd=test,check=True)
  subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=test,check=True)
  # Reserve an isolated licensed-image fixture: production assignments must stay intact.
  # A real catalog may have exhausted all suitable photos; that must not break
  # this publication regression test, which runs only in a temporary copy.
  catalog=test/'journal-images.json'
  image_data=json.loads(catalog.read_text())
  fixture=copy.deepcopy(image_data['photos'][0])
  fixture['id']='test-only-reviewed-publication-image'
  fixture['topics']=sorted(set().union(*(set(photo['topics']) for photo in image_data['photos'])))
  image_data['photos'].append(fixture)
  catalog.write_text(json.dumps(image_data,ensure_ascii=False,indent=2)+'\n')
  m.ROOT=test;m.publish(source)
  for lang in ('sk','en'):
   name=m.render(source,lang)[0];html=(test/name).read_text()
   assert source['editorial']['languages'][lang]['lead'] in html
   assert name in (test/'sitemap.xml').read_text() and '/journal-share.js' in html
  from journal_images import choose_for_source
  # Exhaustion holds publication before either language or listing can change.
  catalog=test/'journal-images.json';original_catalog=catalog.read_text();data=json.loads(original_catalog)
  for i,photo in enumerate(data['photos']):data['assignments']['reserved-test-'+str(i)+'.html']=photo['id']
  catalog.write_text(json.dumps(data));blocked=copy.deepcopy(source);blocked['doi']='10.0000/no-image-test'
  before={p.name:p.read_bytes() for p in test.glob('blog*.html')}
  rejected(lambda:m.publish(blocked))
  assert before=={p.name:p.read_bytes() for p in test.glob('blog*.html')}
  catalog.write_text(original_catalog)
  before={p.name:p.read_bytes() for p in test.glob('blog*.html')}
  rejected(lambda:m.publish(source))
  assert before=={p.name:p.read_bytes() for p in test.glob('blog*.html')}
 print('PASS: exact reviewed SK/EN text, source-quality holds, HTML/PDF/XML availability and PDF signature, source notices, changed/missing review, duplicate atomic preflight and publication pipeline')
if __name__=='__main__':main()
