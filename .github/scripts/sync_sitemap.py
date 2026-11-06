#!/usr/bin/env python3
"""Synchronize WEBU sitemap with public top-level HTML pages."""
from datetime import datetime
from pathlib import Path
import subprocess
from urllib.parse import quote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://www.webu.sk"
EXCLUDE = {"index.html"}
pages = sorted(
    p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*.html")
    if p.is_file() and ".git" not in p.parts and not p.name.lower().startswith("google")
    and 'http-equiv="refresh"' not in p.read_text(encoding="utf-8").lower()
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
