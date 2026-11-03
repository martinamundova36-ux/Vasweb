#!/usr/bin/env python3
"""Synchronize WEBU sitemap with public top-level HTML pages."""
from pathlib import Path
from urllib.parse import quote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://www.webu.sk"
EXCLUDE = {"index.html"}
pages = sorted(
    p.name for p in ROOT.glob("*.html")
    if p.is_file() and not p.name.lower().startswith("google")
)
urls = [BASE + "/"] + [BASE + "/" + quote(name) for name in pages if name not in EXCLUDE]
ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
root = ET.Element(ns + "urlset")
for url in urls:
    ET.SubElement(ET.SubElement(root, ns + "url"), ns + "loc").text = url
ET.indent(root, space="  ")
output = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode") + "\n"
(ROOT / "sitemap.xml").write_text(output, encoding="utf-8")
print(f"Sitemap synchronized: {len(urls)} public URLs")
