#!/usr/bin/env python3
"""Offline checks: transparent abstract-only publication cannot imitate review."""
import copy
import datetime as dt
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from ai_journal_writer import HEADINGS_SK,HEADINGS_EN
from auto_publish_verified import attach_abstract_editorial,eligible,TODAY
import free_journal
from free_journal import validate_editorial,render

def reject(fn):
    try:fn()
    except (ValueError,KeyError,TypeError):return
    raise AssertionError('Unsafe article was accepted')

def language(headings,lang):
    paragraph='According to the publisher abstract, this topic may help business owners ask better questions and test small practical changes before adopting wider recommendations. Every practical example remains editorial advice rather than an independently verified result of the scientific study.'
    return {'title':'Rozhodovanie o webe na základe dôkazov' if lang=='sk' else 'Evidence-informed website decisions',
            'description':'Redakčný pohľad na abstrakt vedeckej štúdie a praktické otázky pre malé firmy.' if lang=='sk' else 'A transparent editorial discussion of a study abstract and practical questions for small businesses.',
            'lead':paragraph,
            'sections':[{'heading':heading,'paragraphs':[paragraph,paragraph]} for heading in headings]}

def main():
    source={'doi':'10.1234/example','title':'An example of workplace technology',
            'url':'https://doi.org/10.1234/example','source_date':'2026-01-01',
            'authors':['A. Researcher'],'venue':'Example Journal','publisher':'Example Publisher','abstract_available':True,
            'abstract_words':200,'drafted_at':TODAY}
    manifest={'schema':'webu-abstract-manuscript-v1','source_doi':source['doi'],
              'generated_on':TODAY,'abstract_scope':'crossref_abstract_only',
              'languages':{'sk':language(HEADINGS_SK,'sk'),'en':language(HEADINGS_EN,'en')}}
    src=attach_abstract_editorial(source,manifest)
    assert validate_editorial(src)['status']=='automated_abstract_editorial'
    for lang in ('sk','en'):
        _,page,_,_=render(src,lang)
        assert 'the full text was not independently verified' in page or 'celý text nebol nezávisle overený' in page
        assert page.count('webu-journal-footer-note')==1 and 'webu-source-scope' not in page
        assert '/journal-metodika' in page and source['doi'] in page
    tampered=copy.deepcopy(src)
    tampered['editorial']['languages']['sk']['lead']='A new unreviewed claim.'
    reject(lambda:validate_editorial(tampered))
    for field,value in [('source_doi','10.1234/different'),('generated_on','2020-01-01'),
                        ('abstract_scope','full_text')]:
        bad=copy.deepcopy(manifest);bad[field]=value
        reject(lambda:attach_abstract_editorial(source,bad))
    bad=copy.deepcopy(manifest);bad['languages'].pop('en')
    reject(lambda:attach_abstract_editorial(source,bad))
    bad=copy.deepcopy(manifest);bad['languages']['sk']['sections'][0]['heading']='Unapproved section'
    reject(lambda:attach_abstract_editorial(source,bad))
    with tempfile.TemporaryDirectory() as directory:
        root=Path(directory)
        (root/'journal-drafts').mkdir();(root/'journal-articles-pending').mkdir()
        (root/'journal-drafts'/'example.json').write_text(json.dumps(source))
        assert not eligible(root), 'An unreviewed bibliography alone must not be published'
        (root/'journal-articles-pending'/'example.json').write_text(json.dumps(manifest))
        assert eligible(root)==['example'], 'A structured source-bound manuscript can enter the publication gate'
    with tempfile.TemporaryDirectory(prefix='webu-abstract-test-') as directory:
        root=Path(directory)/'site'
        shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','__pycache__'))
        subprocess.run(['git','init','-q'],cwd=root,check=True)
        subprocess.run(['git','add','.'],cwd=root,check=True)
        subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=root,check=True)
        catalog=root/'journal-images.json';data=json.loads(catalog.read_text())
        fixture=copy.deepcopy(data['photos'][0]);fixture.update(id='test-only-abstract-image',topics=['workplace'])
        data['photos'].append(fixture);catalog.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
        old=free_journal.ROOT;free_journal.ROOT=root
        try:
            free_journal.publish(src)
            register=json.loads((root/'journal-reports/journal-audit-register.json').read_text())
            record=next(x for x in register['articles'] if x['publication']=='automated_abstract_editorial')
            assert not record['scientific_full_text_compared']
            assert record['review_status']=='automated_abstract_only'
            for lang in ('sk','en'):
                name=free_journal.render(src,lang)[0]
                assert (root/name).is_file() and name in (root/'sitemap.xml').read_text()
                generated=(root/name).read_text()
                assert 'webu-source-scope' not in generated
                assert generated.count('webu-journal-footer-note')==1
                assert generated.index('webu-journal-footer-note')>generated.index('WEBU-REVIEWED-CONTENT-END')
        finally:free_journal.ROOT=old
    print('PASS: abstract-scoped SK/EN articles, evidence binding, transparent disclaimer, tamper rejection, no bibliography-only publication')

if __name__=='__main__':main()
