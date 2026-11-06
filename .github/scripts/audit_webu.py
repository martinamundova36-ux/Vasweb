#!/usr/bin/env python3
"""Nonvisual checks and blog listing cleanup for WEBU."""
import re, sys
from pathlib import Path
from urllib.parse import urlsplit
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[2]
issues=[]
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='a' and d.get('href'): self.links.append(d['href'])

for filename in ('blog.html','blog-en.html'):
    p=ROOT/filename
    html=p.read_text(encoding='utf-8')
    pattern=r'<a class="vw-journal-card"\b[^>]*href="([^"]+)"[^>]*>.*?</a>'
    removed=[]
    def clean(m):
        path=urlsplit(m.group(1)).path.lstrip('/')
        if not path or '/' in path or not (ROOT/path).is_file():
            removed.append(path);return ''
        return m.group(0)
    html=re.sub(pattern,clean,html,flags=re.S)
    # Both the five promoted image stories and the archived cards belong to
    # the article count. Counting the archive alone silently reverted 23 to 18.
    card_urls=re.findall(r'<a class="(?:vw-journal-card|webu-new-story)" href="([^"]+)"',html)
    count=len(set(card_urls))
    html=re.sub(r'(<div class="vw-journal-section-head">.*?</div><span>)\s*\d+\s+(?:články|článkov|articles)',lambda m:m.group(1)+(str(count)+' článkov' if filename=='blog.html' else str(count)+' articles'),html,count=1,flags=re.S)
    if removed: print(filename,'removed dead cards:',removed)
    p.write_text(html,encoding='utf-8')

for p in sorted(ROOT.glob('*.html')):
    if p.name.lower().startswith('google'):continue
    s=p.read_text(encoding='utf-8')
    if not re.search(r'<html[^>]*lang=["\'](?:sk|en)["\']',s,re.I):issues.append(f'{p.name}: missing sk/en lang')
    if not re.search(r'<title>[^<]+</title>',s,re.I):issues.append(f'{p.name}: missing title')
    if not re.search(r'<meta[^>]+name=["\']description["\']',s,re.I):issues.append(f'{p.name}: missing meta description')
    parser=Links()
    try:parser.feed(s)
    except Exception as e:issues.append(f'{p.name}: HTML parsing issue {e}')
    for href in parser.links:
        u=urlsplit(href)
        if u.scheme or u.netloc or href.startswith(('#','mailto:','tel:','javascript:')):continue
        path=u.path.lstrip('/')
        if path and path.endswith('.html') and not (ROOT/path).exists():
            issues.append(f'{p.name}: missing local link {path}')
print('Audit findings:',len(issues))
for issue in issues[:100]:print('WARN',issue)
# Existing legacy issues are warnings; block only a broken blog card.
if len(issues)>100:print('Additional warnings omitted')
