#!/usr/bin/env python3
"""Synchronize WEBU sitemap with canonical, indexable HTML pages."""
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import subprocess
from urllib.parse import quote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://www.webu.sk"
EXCLUDE = {"index.html"}


class IndexingMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.noindex = False
        self.redirect = False
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            meta = dict(attrs)
            if meta.get("name", "").lower() in ("robots", "googlebot"):
                self.noindex |= "noindex" in meta.get("content", "").lower()
            self.redirect |= meta.get("http-equiv", "").lower() == "refresh"
        elif tag == "link":
            link = dict(attrs)
            if link.get("rel", "").lower() == "canonical":
                self.canonical = link.get("href")


def indexable(path):
    metadata = IndexingMetadata()
    metadata.feed(path.read_text(encoding="utf-8"))
    relative_path = path.relative_to(ROOT).as_posix()
    expected = BASE + ("/" if relative_path == "index.html" else "/" + quote(relative_path))
    return not metadata.noindex and not metadata.redirect and (
        metadata.canonical is None or metadata.canonical == expected
    )


pages = sorted(
    p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*.html")
    if p.is_file() and ".git" not in p.parts and not p.name.lower().startswith("google")
    and indexable(p)
)
entries = [(BASE + "/", "index.html")]
entries += [(BASE + "/" + quote(name), name) for name in pages if name not in EXCLUDE]


def content_last_modified(path):
    """Use a real committed file change, never the checkout's file mtime."""
    result = subprocess.run(
        ["git", "log", "-1", "--format=%cI", "--", path],
        cwd=ROOT, capture_output=True, text=True, check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        return datetime.fromisoformat(result.stdout.strip()).date().isoformat()
    except ValueError:
        return None


ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
root = ET.Element(ns + "urlset")
for url, path in entries:
    entry = ET.SubElement(root, ns + "url")
    ET.SubElement(entry, ns + "loc").text = url
    lastmod = content_last_modified(path)
    if lastmod:
        ET.SubElement(entry, ns + "lastmod").text = lastmod
ET.indent(root, space="  ")
output = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode") + "\n"
(ROOT / "sitemap.xml").write_text(output, encoding="utf-8")
print(f"Sitemap synchronized: {len(entries)} public URLs")
