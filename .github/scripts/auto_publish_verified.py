#!/usr/bin/env python3
"""Publish source-scoped bilingual editorials without pretending to peer review.

Previously human-reviewed articles retain the full-text gate. AI articles
are explicitly identified as abstract-only research-inspired commentaries.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
from zoneinfo import ZoneInfo
from free_journal import validate_editorial, editorial_digest
from ai_journal_writer import HEADINGS_SK, HEADINGS_EN

ROOT=Path(__file__).resolve().parents[2]
TODAY=dt.datetime.now(ZoneInfo("Europe/Bratislava")).date().isoformat()

def eligible(root=ROOT):
    paths=[]
    for path in sorted((root/"journal-drafts").glob("*.json")):
        src=json.loads(path.read_text(encoding="utf-8"))
        if src.get("test_only") or src.get("published_at") or src.get("drafted_at")!=TODAY:continue
        reviewed=False
        try:validate_editorial(src);reviewed=True
        except (ValueError,KeyError,TypeError):pass
        if not reviewed and not (root/"journal-articles-pending"/(path.stem+".json")).is_file():continue
        paths.append(path.stem)
    return paths

def attach_abstract_editorial(src, manuscript):
    """Validate machine-readable source binding and create a truthful record."""
    if manuscript.get('schema')!='webu-abstract-manuscript-v1':raise ValueError('Unrecognized AI manuscript')
    if manuscript.get('source_doi')!=src['doi'] or manuscript.get('generated_on')!=TODAY:raise ValueError('Manuscript DOI/day mismatch')
    if manuscript.get('abstract_scope')!='crossref_abstract_only':raise ValueError('Abstract source scope missing')
    if not src.get('abstract_available') or src.get('abstract_words',0)<80:raise ValueError('Original source has no usable abstract')
    texts=manuscript.get('languages') or {}
    if set(texts)!={'sk','en'}:raise ValueError('Incomplete bilingual manuscript')
    for lang,headings in (('sk',HEADINGS_SK),('en',HEADINGS_EN)):
        if [section.get('heading') for section in texts[lang].get('sections',[])]!=headings:
            raise ValueError('Changed or incomplete AI structure: '+lang)
    reference=', '.join(src['authors'])+f" ({src['source_date'][:4]}). "+src['title']+'. '+src['venue']+'. '+src['url']
    src=dict(src)
    src['editorial']={
        'status':'automated_abstract_editorial',
        'generated_by':'gemini_from_abstract',
        'generated_at':TODAY,
        'source_url':src['url'],
        'source_scope':'verified_crossref_abstract_only',
        'review_level':'abstract_only',
        'reviewed_at':TODAY,
        'content_sha256':editorial_digest(texts),
        'languages':texts,
        'references':[{'id':'doi-source','url':src['url'],'apa7':reference,'access':'abstract'}]
    }
    validate_editorial(src)
    return src

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test:
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            tmp=Path(folder);(tmp/"journal-drafts").mkdir()
            (tmp/"journal-drafts"/(TODAY+"-abc.json")).write_text(json.dumps({"drafted_at":TODAY,"doi":"10.1234/test"}))
            assert not eligible(tmp), "Unwritten bibliographic candidates must not be published"
        sample={'doi':'10.1234/test','url':'https://doi.org/10.1234/test','title':'Test',
                'venue':'Journal','authors':['A. Author'],'source_date':'2026-01-01',
                'abstract_available':True,'abstract_words':120}
        try:attach_abstract_editorial(sample,{'schema':'webu-abstract-manuscript-v1','source_doi':'bad'})
        except ValueError:pass
        else:raise AssertionError('Incorrect manuscript source was accepted')
        print("PASS: unfinished bibliographies and mismatched AI sources remain unpublished")
        return
    published=[];held=[]
    for name in eligible():
        path=ROOT/'journal-drafts'/(name+'.json')
        src=json.loads(path.read_text(encoding='utf-8'))
        try:
            validate_editorial(src)
        except (ValueError,KeyError,TypeError):
            manuscript_path=ROOT/'journal-articles-pending'/(name+'.json')
            try:
                manuscript=json.loads(manuscript_path.read_text(encoding='utf-8'))
                src=attach_abstract_editorial(src,manuscript)
                path.write_text(json.dumps(src,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            except (ValueError,KeyError,TypeError) as exc:
                held.append({'id':name,'reason':str(exc)})
                continue
        cmd=[sys.executable,str(ROOT/".github/scripts/free_journal.py"),"--action","publish","--draft-id",name]
        env=os.environ.copy();env["WEBU_AUTOPUBLISH_VERIFIED"]="true"
        attempt=subprocess.run(cmd,cwd=ROOT,env=env,text=True,capture_output=True)
        if attempt.returncode:
            held.append({"id":name,"reason":attempt.stderr[-300:] or attempt.stdout[-300:]})
        else:published.append(name)
    pending=0
    for path in (ROOT/"journal-drafts").glob("*.json"):
        source=json.loads(path.read_text())
        pending+=bool(source.get("drafted_at")==TODAY and not source.get("published_at") and not source.get("test_only"))
    all_published=sorted(
        path.stem
        for path in (ROOT/'journal-drafts').glob('*.json')
        if (lambda item: item.get('published_at')==TODAY and item.get('approved_by') in ('abstract_automation','verified_automation'))(json.loads(path.read_text()))
    )
    summary={"date":TODAY,"automatically_published":all_published,"published_this_run":published,
                      "held_due_to_missing_review_or_gates":pending,
                      "publication_errors":held,"mode":"transparent_abstract_editorials"}
    report=ROOT/'journal-reports'/('automatic-publication-'+TODAY+'.json')
    report.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":main()
