#!/usr/bin/env python3
"""Regression tests: review records cannot silently bless content or invent full-text checks."""
from pathlib import Path
import copy,json,shutil,tempfile,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'));sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_review_audit import audit
from journal_review_records import digest,REGISTER

def main():
 data,errors=audit();assert not errors,errors
 with tempfile.TemporaryDirectory(prefix='webu-review-record-') as folder:
  root=Path(folder)/'site';shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','__pycache__'))
  source=copy.deepcopy(data);file=root/source['articles'][0]['languages']['sk']['path'];raw=file.read_text()
  file.write_text(raw.replace('Namiesto', 'Opravené namiesto',1) if 'Namiesto' in raw else raw.replace('</h1>',' changed</h1>',1))
  assert any('content changed' in x for x in audit(root)[1])
  file.write_text(raw)
  # Generated related-link changes do not change the reviewed body hash.
  altered=raw.replace('WEBU-RELATED-START -->','WEBU-RELATED-START --><p>Generated link module change</p>')
  assert digest(raw)==digest(altered)
  for mutation in [lambda d:d['articles'][0].update(scientific_full_text_compared=True),lambda d:d['articles'][0]['languages'].pop('en')]:
   changed=copy.deepcopy(source);mutation(changed);(root/REGISTER).write_text(json.dumps(changed));assert audit(root)[1]
 print('PASS: reviewed text tampering rejected, generated-link maintenance stable, missing translation and false full-text labels rejected')
if __name__=='__main__':main()
