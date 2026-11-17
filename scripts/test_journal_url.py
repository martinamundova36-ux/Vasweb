#!/usr/bin/env python3
"""Published WEBU article URLs are immutable when research copy is corrected."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.github/scripts'))
from journal_url import article_names

def main():
    source={'title':'Original title', 'editorial':{'languages':{'sk':{'title':'Nový opravený názov'}}},
            'published_at':'2026-11-17',
            'published_urls':['https://www.webu.sk/blog-journal-original-title.html',
                              'https://www.webu.sk/blog-journal-original-title-en.html']}
    assert article_names(source)==('blog-journal-original-title.html','blog-journal-original-title-en.html')
    source.pop('published_at')
    assert article_names(source)==('blog-journal-novy-opraveny-nazov.html','blog-journal-novy-opraveny-nazov-en.html')
    print('PASS: copyediting published headings never mutates the public URL')
if __name__=='__main__':
    main()
