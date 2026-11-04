#!/usr/bin/env python3
"""Publikovanie WEBU blogu z GitHub Issue Form; iba štandardná knižnica."""
import os, re, html, json, unicodedata, datetime
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
body = os.environ.get("ISSUE_BODY", "")
fields = {}
for match in re.finditer(r"^### (.+)\n\n(.*?)(?=\n### |\Z)", body, re.M | re.S):
    fields[match.group(1).strip()] = match.group(2).strip()

def field(name):
    value = fields.get(name, "").strip()
    if value in ("_No response_", "No response"):
        return ""
    return value

title = field("Názov článku")
desc = field("Krátky popis pre Google a blog")
category = field("Kategória")
content = field("Text článku")
image = field("URL obrázka (https://)")
if re.search(r"doi\.org/|10\.\d{4,9}/",content,re.I):
    raise SystemExit("Vedecký článok vyžaduje existujúci dvojjazyčný review workflow a scientific_review; Issue Form vedeckú kontrolu neobchádza.")
if not all([title, desc, category, content]):
    raise SystemExit("Chýbajú povinné polia. Článok sa nepublikoval.")
if len(title) > 140 or len(desc) > 350 or len(content) > 60000:
    raise SystemExit("Príliš dlhý názov, popis alebo článok.")
if image and (urlparse(image).scheme != "https" or not urlparse(image).netloc):
    raise SystemExit("Obrázok musí mať platnú HTTPS adresu.")

def esc(x):
    return html.escape(x, quote=True)

slug = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode().lower()
slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")[:75]
if not slug:
    raise SystemExit("Názov neumožňuje vytvoriť URL.")
filename = "blog-" + slug + ".html"
path = ROOT / filename
if path.exists():
    raise SystemExit("Článok s rovnakou adresou už existuje; nič sa neprepísalo.")
paragraphs = []
for block in re.split(r"\n\s*\n", content):
    block = block.strip()
    if not block:
        continue
    if block.startswith("## "):
        paragraphs.append("<h3>" + esc(block[3:]) + "</h3>")
    else:
        paragraphs.append("<p>" + esc(block).replace("\n", "<br>") + "</p>")
article_body = "\n".join(paragraphs)
sample = (ROOT / "blog-seo-webstranky.html").read_text(encoding="utf-8")
style = re.search(r"<style>.*?</style>", sample, re.S)
if not style:
    raise SystemExit("Chýba štýl WEBU článkov.")
url = "https://www.webu.sk/" + filename
schema = json.dumps({"@context":"https://schema.org","@type":"BlogPosting","headline":title,"description":desc,"inLanguage":"sk","datePublished":datetime.date.today().isoformat(),"mainEntityOfPage":url,"publisher":{"@type":"Organization","name":"WEBU","url":"https://www.webu.sk/"}},ensure_ascii=False).replace("<", "\\u003c")
page = ('<!doctype html><html lang="sk"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="description" content="' + esc(desc) + '">'
        '<meta name="robots" content="index,follow">'
        '<link rel="canonical" href="' + esc(url) + '">'
        '<title>' + esc(title) + ' | WEBU Journal</title>'
        + style.group(0) + '<script type="application/ld+json">' + schema + '</script>'
        '</head><body><header><nav class="nav"><a class="logo" href="/">web<span>u</span></a>'
        '<a class="back" href="/blog.html">← Všetky články</a></nav></header>'
        '<main><div class="hero"><div class="wrap"><small>WEBU JOURNAL · ' + esc(category) + '</small>'
        '<h1>' + esc(title) + '</h1></div></div>'
        '<article class="wrap article"><p class="vw-lead">' + esc(desc) + '</p>'
        + article_body + '<p style="margin-top:32px"><a href="/blog.html">← Všetky články WEBU Journal</a></p>'
        '</article><div class="cta"><div class="wrap"><p>Viac o tvorbe webstránok</p>'
        '<a href="/sluzby.html">Pozrieť služby ↗</a></div></div></main>'
        '<footer>© WEBU · <a href="/ochrana-osobnych-udajov.html">Ochrana osobných údajov</a></footer>'
        '<script src="/privacy.js" defer></script></body></html>')
from journal_images import choose_for_source,load,save,group
# Only the reviewed license catalog can supply the final image; arbitrary URL is ignored.
photo_source={'doi':'issue:'+filename,'source_date':datetime.date.today().isoformat(),'title':title}
photo=choose_for_source(photo_source,ROOT)
data=load(ROOT)
import hashlib
allocated='blog-journal-review-'+photo_source['source_date']+'-'+hashlib.sha256(photo_source['doi'].encode()).hexdigest()[:12]+'.html'
data['assignments'][filename]=data['assignments'].pop(allocated);save(data,ROOT)
image=photo['files']['social']
path.write_text(page, encoding="utf-8")

blog = ROOT / "blog.html"
listing = blog.read_text(encoding="utf-8")
card = ('<a class="vw-journal-card" href="/' + filename + '"><img src="' + esc(image) + '" alt="' + esc(title) + '" loading="lazy"><div>'
        '<small>' + esc(category) + ' · ' + datetime.date.today().strftime("%d.%m.%Y") + '</small>'
        '<h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p><span>Čítať celý článok ↗</span></div></a>')
needle = '<div class="vw-journal-grid">'
if needle not in listing:
    raise SystemExit("Nenašla sa mriežka článkov WEBU.")
listing = listing.replace(needle, needle + card, 1)
listing = re.sub(r'(<div class="vw-journal-section-head">.*?</div><span>)\d+ články', lambda m: m.group(1) + str(len(re.findall(r'class="vw-journal-card"', listing))) + ' článkov', listing, count=1, flags=re.S)
blog.write_text(listing, encoding="utf-8")

sitemap = ROOT / "sitemap.xml"
xml = sitemap.read_text(encoding="utf-8")
if url in xml:
    raise SystemExit("URL už je v sitemap.")
entry = '<url><loc>' + url + '</loc></url>'
if '</urlset>' not in xml:
    raise SystemExit("Sitemap nie je platná.")
xml = xml.replace('</urlset>', entry + '</urlset>')
ET.fromstring(xml)
sitemap.write_text(xml, encoding="utf-8")
print("Publikované:", url)
