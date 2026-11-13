#!/usr/bin/env python3
"""Conservative, repeatable SEO metadata maintenance for WEBU Journal."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import html, json, re, sys, subprocess
ROOT=Path(__file__).resolve().parents[2]
SITE="https://www.webu.sk/"
ARTICLES=sorted(p for p in ROOT.glob("blog-*.html") if p.name!="blog-en.html")
BEGIN="<!-- WEBU-SEO-START -->"
END="<!-- WEBU-SEO-END -->"
class Parser(HTMLParser):
    def __init__(self):
        super().__init__();self.images=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=="img":self.images.append(d)
        if tag=="a" and d.get("href"):self.links.append(d["href"])
def text(s):
    return html.unescape(re.sub(r"<[^>]+>","",s)).strip()
def meta(s,name):
    for tag in re.findall(r"<meta\b[^>]*>",s,re.I):
        if re.search(r'\bname=["\']'+name+r'["\']',tag,re.I):
            m=re.search(r'\bcontent=["\'](.*?)["\']',tag,re.I|re.S)
            if m:return html.unescape(m.group(1))
    return ""
def tag(s,kind):
    m=re.search(r"<"+kind+r"\b[^>]*>(.*?)</"+kind+r">",s,re.I|re.S)
    return text(m.group(1)) if m else ""
PAIRS={"blog-5-chyb-na-webstranke.html":"blog-5-website-mistakes-en.html","blog-cena.html":"blog-pricing-business-en.html","blog-dovera.html":"blog-customer-trust-en.html","blog-luxus.html":"blog-luxury-en.html","blog-web.html":"blog-website-roi-en.html","blog-kolko-stoji-webstranka.html":"blog-website-cost-en.html","blog-seo-webstranky.html":"blog-seo-websites-en.html"}
def alternate(p):
    pairs={**PAIRS, **{v:k for k,v in PAIRS.items()}}
    n=p.name
    other=ROOT/pairs.get(n, n[:-8]+".html" if n.endswith("-en.html") else n[:-5]+"-en.html")
    return other if other.is_file() else None

def dates(p,s):
    existing=[]
    for raw in re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',s,re.S|re.I):
        try:
            obj=json.loads(raw)
            if obj.get("@type")=="BlogPosting":existing.append(obj)
        except (ValueError,AttributeError):pass
    published=next((j["datePublished"] for j in existing if j.get("datePublished")),None)
    if not published:
        date=re.search(r"-(20\d{2})-(\d{2})-(\d{2})(?:-en)?\.html$",p.name)
        if date:published="-".join(date.groups())
    # Earliest tracked appearance is evidence for legacy publication dates.
    if not published:
        result=subprocess.run(["git","log","--follow","--diff-filter=A","--format=%as","--",p.name],cwd=ROOT,capture_output=True,text=True,check=True)
        published=next(iter(result.stdout.splitlines()),None)
    if not published:raise ValueError("No evidenced publication date: "+p.name)
    modified=next((j["dateModified"] for j in existing if j.get("dateModified")),None)
    return published,modified

def strip_article_schema(s):
    def keep(m):
        try:return "" if json.loads(m.group(1)).get("@type")=="BlogPosting" else m.group(0)
        except (ValueError,AttributeError):return m.group(0)
    s=re.sub(re.escape(BEGIN)+r".*?"+re.escape(END),"",s,flags=re.S)
    return re.sub(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',keep,s,flags=re.S|re.I)

def social(s,title,desc,url,article=True,image=None,image_alt=""):
    s=re.sub(r'<meta\b[^>]*(?:name|property)=["\'](?:og:[^"\']*|twitter:[^"\']*)["\'][^>]*>',"",s,flags=re.I)
    values={"og:type":"article" if article else "website","og:site_name":"WEBU","og:title":title,"og:description":desc,"og:url":url,"twitter:card":"summary","twitter:title":title,"twitter:description":desc}
    if image:values.update({"og:image":image,"og:image:width":"1280","og:image:height":"720","og:image:type":"image/jpeg","og:image:alt":image_alt,"twitter:card":"summary_large_image","twitter:image":image,"twitter:image:alt":image_alt})
    fragment="".join('<meta '+('property' if k.startswith('og:') else 'name')+'="'+k+'" content="'+html.escape(v,quote=True)+'">' for k,v in values.items())
    return s.replace("</head>",fragment+"</head>",1)

def main():
    errors=[];changed=0;warnings=[]
    for p in ARTICLES:
        s=p.read_text(encoding="utf-8")
        lang="en" if re.search(r'<html[^>]*lang=["\']en',s[:300],re.I) else "sk"
        title=tag(s,"h1") or tag(s,"title")
        desc=meta(s,"description")
        if not desc:
            m=re.search(r"<p\b[^>]*>(.*?)</p>",s,re.I|re.S)
            desc=text(m.group(1))[:155] if m else title
        desc=desc[:160]
        if not title:errors.append(p.name+": missing heading/title");continue
        url=SITE+p.name
        other=alternate(p)
        parser=Parser();parser.feed(s)
        for href in parser.links:
            u=urlsplit(href)
            if u.scheme or u.netloc or href.startswith(("#","mailto:","tel:")):continue
            local=u.path.lstrip("/")
            if local.endswith(".html") and not (ROOT/local).exists():errors.append(p.name+": broken link "+local)
        for img in parser.images:
            if not img.get("alt"):warnings.append(p.name+": image missing alt")
        # Accept a verified Pexels editorial hero as well as optimized local photos.
        # The old local-only check stripped image metadata from newly authored pages.
        hero=next((i for i in parser.images if i.get("src", "").startswith(("/assets/journal/","https://images.pexels.com/photos/"))),{})
        image=(SITE+hero["src"].lstrip("/") if hero["src"].startswith("/") else hero["src"]) if hero else None
        schema={"@context":"https://schema.org","@type":"BlogPosting","headline":title,"description":desc,"inLanguage":lang,"mainEntityOfPage":{"@type":"WebPage","@id":url},"url":url,"publisher":{"@type":"Organization","name":"WEBU","url":SITE},"author":{"@type":"Person","name":"Martina Mundová"}}
        schema['citation']=[h for h in parser.links if h.startswith(('https://doi.org/','https://www.w3.org/','https://developers.google.com/','https://www.itl.nist.gov/','https://openstax.org/','https://credibility.stanford.edu/','https://www.pcisecuritystandards.org/','https://web.dev/'))]
        if image:schema["image"]={"@type":"ImageObject","url":image,"width":1280,"height":720,"caption":hero.get("alt","")}
        published,modified=dates(p,s)
        schema["datePublished"]=published
        if modified:schema["dateModified"]=modified
        s=strip_article_schema(s)
        fragment=BEGIN+'<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace("<","\\u003c")+'</script>'+END
        if BEGIN in s and END in s:s=re.sub(re.escape(BEGIN)+r".*?"+re.escape(END),lambda _:fragment,s,flags=re.S)
        else:s=s.replace("</head>",fragment+"</head>",1)
        # Normalize canonical and bilingual alternates; preserve existing stylesheet and content.
        s=re.sub(r'<link\b(?=[^>]*\brel=["\'](?:canonical|alternate)["\'])[^>]*>',"",s,flags=re.I)
        links='<link rel="canonical" href="'+html.escape(url,quote=True)+'">'
        if other:
            sk=p if lang=="sk" else other
            en=p if lang=="en" else other
            # Avoid false language pairs when an old filename has an unrelated counterpart.
            other_s=other.read_text(encoding="utf-8")
            other_lang="en" if re.search(r'<html[^>]*lang=["\']en',other_s[:300],re.I) else "sk"
            if other_lang!=lang:
                links+=''.join('<link rel="alternate" hreflang="'+l+'" href="'+SITE+f.name+'">' for l,f in (("sk",sk),("en",en),("x-default",sk)))
            else:warnings.append(p.name+": language pair has same language")
        s=s.replace("</head>",links+"</head>",1)
        s=social(s,tag(s,"title"),desc,url,image=image,image_alt=hero.get("alt",""))
        if '/journal-share.js' not in s:s=s.replace('</body>','<script src="/journal-share.js?v=20261104-seo2" defer></script></body>')
        if not meta(s,"description"):
            s=s.replace("</head>",'<meta name="description" content="'+html.escape(desc,quote=True)+'"></head>',1)
        if s!=p.read_text(encoding="utf-8"):
            p.write_text(s,encoding="utf-8");changed+=1
    print("SEO articles checked",len(ARTICLES),"updated",changed,"warnings",len(warnings),"errors",len(errors))
    for x in warnings[:30]:print("WARN",x)
    for x in errors[:40]:print("ERROR",x)
    if errors:sys.exit(1)
if __name__=="__main__":main()
