#!/usr/bin/env python3
"""One-time, repeat-safe WEBU Journal URL migration, preserving editorial bodies."""
from pathlib import Path
import html
import json
import re
import sys
import unicodedata
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_url import slugify
OLD=re.compile(r"^blog-journal-review-\d{4}-\d{2}-\d{2}-[a-f0-9]{12}\.html$")
START='<!-- WEBU-REVIEWED-CONTENT-START -->'
END='<!-- WEBU-REVIEWED-CONTENT-END -->'

def main():
    mapping={}
    planned=set()
    originals=sorted(p for p in ROOT.glob('blog-journal-review-*.html') if OLD.fullmatch(p.name))
    for source in originals:
        raw=source.read_text(encoding='utf-8')
        match=re.search(r'<h1\b[^>]*>(.*?)</h1>',raw,re.I|re.S)
        if not match:raise RuntimeError('Missing article title: '+source.name)
        title=html.unescape(re.sub('<[^>]+>','',match.group(1))).strip()
        base='blog-journal-'+slugify(title)
        candidate=base+'.html'
        n=2
        while candidate in planned or (ROOT/candidate).exists():
            candidate=base+'-'+str(n)+'.html';n+=1
        old_en=source.name[:-5]+'-en.html'
        if not (ROOT/old_en).exists():raise RuntimeError('Missing English pair: '+old_en)
        new_en=candidate[:-5]+'-en.html'
        if (ROOT/new_en).exists():raise RuntimeError('English slug collision: '+new_en)
        mapping[source.name]=candidate
        mapping[old_en]=new_en
        planned.update((candidate,new_en))
    if not mapping:
        print('No legacy numeric URLs found; migration already complete')
        return
    print('Migrating',len(mapping),'language pages')
    # Preserve original article body text and reviewed content hashes exactly.
    for old,new in mapping.items():
        source=ROOT/old
        target=ROOT/new
        if not source.exists() or target.exists():raise RuntimeError('Unsafe rename: '+old)
        source.rename(target)
    for page in ROOT.rglob('*.html'):
        if 'student-house-portal' in page.parts or 'ukazky' in page.parts:continue
        raw=page.read_text(encoding='utf-8')
        if START in raw and END in raw:
            before,tail=raw.split(START,1)
            protected,after=tail.split(END,1)
            for old,new in mapping.items():
                before=before.replace(old,new)
                after=after.replace(old,new)
            updated=before+START+protected+END+after
        else:
            updated=raw
            for old,new in mapping.items():updated=updated.replace(old,new)
        if updated!=raw:page.write_text(updated,encoding='utf-8')
    register=ROOT/'journal-reports/journal-audit-register.json'
    data=json.loads(register.read_text(encoding='utf-8'))
    for item in data['articles']:
        for row in item.get('languages',{}).values():
            row['path']=mapping.get(row['path'],row['path'])
        oldid=item.get('id','')+'.html'
        if oldid in mapping:item['id']=mapping[oldid][:-5]
    register.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    images=ROOT/'journal-images.json'
    catalog=json.loads(images.read_text(encoding='utf-8'))
    assignments=catalog.get('assignments',{})
    for old,new in mapping.items():
        if old in assignments:assignments[new]=assignments.pop(old)
    images.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for old,new in mapping.items():
        url='https://www.webu.sk/'+new
        page=('<!doctype html><html lang="'+('en' if old.endswith('-en.html') else 'sk')+'"><head>'
          '<meta charset="utf-8"><meta name="robots" content="noindex,follow">'
          '<meta http-equiv="refresh" content="0;url=/'+new+'">'
          '<link rel="canonical" href="'+url+'">'
          '<title>WEBU Journal – Redirect</title></head><body>'
          '<p>Article moved / Článok presunutý: <a href="/'+new+'">'+html.escape(url)+'</a></p>'
          '<script>location.replace('+json.dumps('/'+new)+')</script></body></html>')
        (ROOT/old).write_text(page,encoding='utf-8')
    report=ROOT/'journal-reports/journal-url-migration.json'
    report.write_text(json.dumps({'kind':'client_redirect_not_http_301','mapping':mapping},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Migrated',len(mapping),'URLs. GitHub Pages legacy redirects use meta refresh, not HTTP 301.')

if __name__=='__main__':main()
