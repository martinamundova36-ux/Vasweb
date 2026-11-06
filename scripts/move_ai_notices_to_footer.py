#!/usr/bin/env python3
"""One-time, idempotent migration of legacy WEBU AI notices into article footers.

The original article body, study citations and disclosure methodology links stay
unchanged, apart from removing the duplicated disclosure box. Recorded content
hashes are refreshed only for the pages that this presentation migration edits.
"""
from pathlib import Path
from datetime import datetime,timezone
import json,re,sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_review_records import digest,REGISTER

LEGACY_NOTICE=re.compile(r'<aside class="webu-review-transparency">.*?</aside>',re.S)
HISTORIC_TOP_NOTICE=re.compile(r'<div class="notice"><strong>.*?</div>',re.S)

def footer_notice(lang,abstract_only=False):
    en=lang=='en'
    if abstract_only:
        summary=('AI-assisted article based on a study abstract; the full text has not been independently verified. '
                 if en else 'Článok s pomocou AI podľa abstraktu štúdie; plný text nebol nezávisle overený. ')
    else:
        summary=('Prepared and reviewed with AI assistance; not an independent scientific peer review. '
                 if en else 'Text pripravený a revidovaný s pomocou AI; nejde o nezávislé vedecké recenzné posúdenie. ')
    method='/journal-metodika'+('-en' if en else '')+'.html'
    return '<p class="webu-journal-footer-note">'+summary+'<a href="'+method+'">'+('Methodology' if en else 'Metodika')+'</a></p>'

def move_to_footer(raw,lang,legacy=False):
    changed=False
    if legacy:
        raw,n=LEGACY_NOTICE.subn('',raw)
        if n!=1:raise ValueError('Expected exactly one legacy disclosure, got '+str(n))
        changed=True
    if 'webu-journal-footer-note' not in raw:
        if '<footer' in raw:
            raw,n=re.subn(r'(</footer>)',footer_notice(lang,abstract_only=not legacy)+r'\1',raw,count=1)
        else:
            raw,n=re.subn(r'(</div>)(?=<script[^>]+src="/journal-share\.js")',footer_notice(lang,abstract_only=True)+r'\1',raw,count=1)
        if n!=1:raise ValueError('No uniquely identifiable article footer')
        changed=True
    return raw,changed

def migrate(root=ROOT):
    touched=set()
    for page in sorted(root.glob('blog-*.html')):
        raw=page.read_text(encoding='utf-8')
        if not LEGACY_NOTICE.search(raw):continue
        lang='en' if page.name.endswith('-en.html') else 'sk'
        updated,changed=move_to_footer(raw,lang,legacy=True)
        if changed:page.write_text(updated,encoding='utf-8');touched.add(page.name)

    # These 2026-11-05 research-inspired pages preceded the reviewed-article
    # generator. They already had DOI and method/source notes, but no AI footer.
    for page in sorted(root.glob('journal-2026-11-05-*.html')):
        raw=page.read_text(encoding='utf-8')
        lang='en' if page.name.endswith('-en.html') else 'sk'
        raw,removed=HISTORIC_TOP_NOTICE.subn('',raw)
        updated,changed=move_to_footer(raw,lang)
        if changed or removed:page.write_text(updated,encoding='utf-8');touched.add(page.name)

    if touched:
        register=root/REGISTER;data=json.loads(register.read_text(encoding='utf-8'))
        changed_records=0
        for entry in data['articles']:
            for row in entry['languages'].values():
                if row['path'] not in touched:continue
                row['content_sha256']=digest((root/row['path']).read_text(encoding='utf-8'))
                row['modified_at']=datetime.now(timezone.utc).isoformat()
                changed_records+=1
        register.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('AI disclosure moved to footer:',len(touched),'pages;',changed_records,'registered language pages')
    else:
        print('AI disclosure layout already normalized; no files changed')
    return touched

if __name__=='__main__':migrate()
