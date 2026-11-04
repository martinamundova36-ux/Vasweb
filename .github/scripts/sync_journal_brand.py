#!/usr/bin/env python3
"""Use WEBU Journal as the visible editorial brand, keeping all existing URLs."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
changed=0
for p in root.rglob("*.html"):
    if ".git" in p.parts: continue
    original=p.read_text(encoding="utf-8")
    s=re.sub(r'(<a\b[^>]*href=["\'][^"\']*blog(?:-en)?\.html["\'][^>]*>)\s*Blog\s*(</a>)',r'\1WEBU Journal\2',original,flags=re.I)
    if p.name=="blog.html":
        s=s.replace("Blog o tvorbe webstránok, SEO a podnikaní | WEBU","WEBU Journal | Tvorba webstránok, SEO a podnikanie")
    if p.name=="blog-en.html":
        s=s.replace("Website Design, SEO and Business Blog | WEBU Journal","WEBU Journal | Website Design, SEO and Business")
    if s!=original:
        p.write_text(s,encoding="utf-8")
        changed+=1
print(f"WEBU Journal branding synchronized in {changed} HTML files")
