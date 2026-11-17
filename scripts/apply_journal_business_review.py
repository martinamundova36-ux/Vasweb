#!/usr/bin/env python3
"""One-off, source-bound correction of forced website-sales tangents.

Revises the entrepreneurial relevance section of the five 2026-11-17 bilingual
WEBU Journal research summaries, preserving original study results, research
citations, public URLs, publication dates, design, and media.
The integrity registry and source manuscripts are updated in the same run.
This is editorial clarification, NOT new full-text scientific peer review.
"""
import argparse
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from free_journal import editorial_digest
from journal_review_records import digest, REGISTER

MANIFEST=ROOT/'journal-reports/business-relevance-copyedits-2026-11-17.json'
OLD={'sk':'Praktický návrh WEBU','en':'WEBU practical proposal'}
NEXT={'sk':'Záver','en':'Conclusion'}

def replace_text(obj,old,new):
    if isinstance(obj,str):
        return obj.replace(old,new)
    if isinstance(obj,list):
        return [replace_text(value,old,new) for value in obj]
    if isinstance(obj,dict):
        return {key:replace_text(value,old,new) for key,value in obj.items()}
    return obj

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--self-test',action='store_true')
    args=parser.parse_args()
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert len(manifest['revisions'])==5
    assert set(manifest['heads'])=={'sk','en'}
    assert all(set(item)=={'sk','en','replace_sk','replace_en'} for item in manifest['revisions'].values())
    if args.self_test:
        print('PASS: five documented bilingual source-bound article revision plans')
        return
    if not args.apply:
        raise SystemExit('Use --apply to edit the five approved research summaries')

    register_path=ROOT/REGISTER
    register=json.loads(register_path.read_text(encoding='utf-8'))
    rows={row['id']:row for row in register['articles']}
    staged={}
    report=[]
    # Preflight all ten pages before changing anything.
    for source_id,edit in manifest['revisions'].items():
        source_path=ROOT/'journal-drafts'/(source_id+'.json')
        source=json.loads(source_path.read_text(encoding='utf-8'))
        if source.get('published_at')!='2026-11-17':
            raise ValueError('Unexpected article date: '+source_id)
        if source['editorial']['status']!='automated_abstract_editorial':
            raise ValueError('Unexpected article type: '+source_id)
        if len(source.get('published_urls',[]))!=2:
            raise ValueError('Missing pinned public URLs: '+source_id)
        sk_name=source['published_urls'][0].split('/')[-1]
        row=rows.get(sk_name.removesuffix('.html'))
        if row is None:raise ValueError('No matching accountable review record: '+sk_name)
        filenames={}
        for lang,url in zip(('sk','en'),source['published_urls']):
            filename=url.split('/')[-1]
            filepath=ROOT/filename
            raw=filepath.read_text(encoding='utf-8')
            if digest(raw)!=row['languages'][lang]['content_sha256']:
                raise ValueError('Edited or mismatched article: '+filename)
            filenames[lang]=(filepath,raw)
        staged[source_id]=(source_path,source,row,filenames,edit)

    changes=[]
    for source_id,(source_path,source,row,filenames,edit) in staged.items():
        changed=False
        for lang in ('sk','en'):
            text_obj=source['editorial']['languages'][lang]
            sec=text_obj['sections'][4]
            heading=manifest['heads'][lang]
            old_head=OLD[lang]
            page_path,raw=filenames[lang]
            if sec['heading']==heading:
                continue
            if sec['heading']!=old_head:
                raise ValueError('Unexpected section format: '+page_path.name)
            # The new section is written from a bounded, human-auditable revision.
            paragraphs=edit[lang]
            if len(paragraphs)<2 or any(len(p.split())<25 for p in paragraphs):
                raise ValueError('Incomplete evidence-limited revision: '+page_path.name)
            section='<h2>'+heading+'</h2>'+''.join('<p>'+html.escape(p,quote=True)+'</p>' for p in paragraphs)
            old=re.compile(re.escape('<h2>'+old_head+'</h2>')+r'.*?(?='+re.escape('<h2>'+NEXT[lang]+'</h2>')+')',re.S)
            raw,n=old.subn(lambda m:section,raw,count=1)
            if n!=1:raise ValueError('Cannot safely locate editorial section: '+page_path.name)
            sec['heading']=heading
            sec['paragraphs']=paragraphs
            sec.pop('items',None)
            for before,after in edit['replace_'+lang]:
                # A context edit must match BOTH reviewed HTML and the source manuscript.
                if before not in json.dumps(text_obj,ensure_ascii=False):
                    raise ValueError('Source phrase not found: '+before[:60])
                escaped_before=html.escape(before,quote=True)
                if escaped_before not in raw:
                    raise ValueError('HTML phrase not found: '+before[:60])
                text_obj=replace_text(text_obj,before,after)
                raw=raw.replace(escaped_before,html.escape(after,quote=True))
            source['editorial']['languages'][lang]=text_obj
            row['languages'][lang]['content_sha256']=digest(raw)
            row['languages'][lang]['modified_at']='2026-11-17'
            for note in row.get('claim_review',{}).get(lang,[]):
                if note.get('section')==old_head:note['section']=heading
            changes.append((page_path,raw))
            changed=True
        if changed:
            new_hash=editorial_digest(source['editorial']['languages'])
            source['editorial']['content_sha256']=new_hash
            source['approved_content_sha256']=new_hash
            source.setdefault('copyedit_history',[]).append({
                'date':'2026-11-17',
                'scope':'Remove forced web-design tie-in; clarify genuine business relevance and source limits',
                'new_full_text_scientific_review':False})
            row.setdefault('notes',[]).append(
                '2026-11-17: Article text clarified for entrepreneur research readers; '
                'NOT a new verification of full study or a new publication.')
            changes.append((source_path,json.dumps(source,ensure_ascii=False,indent=2)+'\n'))
            report.append({'draft':source_id,'sk':row['languages']['sk']['path'],
                           'en':row['languages']['en']['path'],'publication_date_preserved':True})
    if not report:
        print('No pending corrections; all five revisions already applied')
        return
    changes.append((register_path,json.dumps(register,ensure_ascii=False,indent=2)+'\n'))
    output=ROOT/'journal-reports/business-relevance-applied-2026-11-17.json'
    changes.append((output,json.dumps({'date':'2026-11-17','type':'source-bounded editorial corrections',
                      'topics':report,'scientific_peer_review_claimed':False},ensure_ascii=False,indent=2)+'\n'))
    for path,content in changes:
        path.write_text(content,encoding='utf-8')
    print('WEBU research relevance copyedit finished:',len(report),'topics /',2*len(report),'language pages')

if __name__=='__main__':
    main()
