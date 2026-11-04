#!/usr/bin/env python3
"""One pre-publication pipeline shared by both existing publishers."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[2]
for script in ('audit_webu.py','link_journal_articles.py','seo_journal.py','sync_journal_brand.py','sync_favicon.py','sync_sitemap.py'):
 subprocess.run(['python3',str(ROOT/'.github/scripts'/script)],cwd=ROOT,check=True)
subprocess.run(['python3','scripts/seo_audit.py'],cwd=ROOT,check=True)
