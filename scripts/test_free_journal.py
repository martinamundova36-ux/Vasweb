#!/usr/bin/env python3
"""Regression checks for reviewed-content publishing; no network or public writes."""
from pathlib import Path
import copy,importlib.util,json,shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('free_journal',ROOT/'.github/scripts/free_journal.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def rejected(call):
 try:call()
 except ValueError:return
 raise AssertionError('Unsafe publication input was accepted')
def main():
 source=next(json.loads(p.read_text()) for p in (ROOT/'journal-drafts').glob('*.json') if json.loads(p.read_text()).get('editorial'))
 m.validate_editorial(source)
 # A test must remain usable after the real article has already been published.
 source=copy.deepcopy(source);source['doi']='10.0000/reviewed-test-only';source['url']='https://doi.org/'+source['doi']
 for article in source['editorial']['languages'].values():
  article['title']+=' TEST ONLY';article['description']+=' TEST ONLY'
 source['editorial']['content_sha256']=m.editorial_digest(source['editorial']['languages'])
 for mutate in [lambda x:x.pop('editorial'),lambda x:x['editorial']['languages'].pop('en'),lambda x:x['editorial']['checks'].update(claims=False),lambda x:x['editorial']['languages']['sk'].update(title='Changed after review')]:
  bad=copy.deepcopy(source);mutate(bad);rejected(lambda:m.validate_editorial(bad))
 record={'DOI':source['doi'],'title':[source['title']],'author':[{'family':n} for n in source['authors']],'publisher':source['publisher'],'container-title':[source['venue']],'published':{'date-parts':[[int(x) for x in source['source_date'].split('-')]]},'type':'journal-article'}
 m.verify(record,source)
 for notice in [{'relation':{'is-retracted-by':[{'id':'10.1234/retraction'}]}},{'updated-by':[{'type':'retraction'}]},{'update-to':[{'type':'expression_of_concern'}]}]:
  bad=copy.deepcopy(record);bad.update(notice);rejected(lambda:m.verify(bad))
 with tempfile.TemporaryDirectory(prefix='webu-reviewed-test-') as temp:
  test=Path(temp)/'site';shutil.copytree(ROOT,test,ignore=shutil.ignore_patterns('.git','__pycache__'))
  subprocess.run(['git','init','-q'],cwd=test,check=True);subprocess.run(['git','add','.'],cwd=test,check=True)
  subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=test,check=True)
  m.ROOT=test;m.publish(source)
  for lang in ('sk','en'):
   name=m.render(source,lang)[0];html=(test/name).read_text()
   assert source['editorial']['languages'][lang]['lead'] in html
   assert name in (test/'sitemap.xml').read_text() and '/journal-share.js' in html
  before={p.name:p.read_bytes() for p in test.glob('blog*.html')}
  rejected(lambda:m.publish(source))
  assert before=={p.name:p.read_bytes() for p in test.glob('blog*.html')}
 print('PASS: exact reviewed SK/EN text, source notices, changed/missing review, duplicate atomic preflight and publication pipeline')
if __name__=='__main__':main()
