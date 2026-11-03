#!/usr/bin/env python3
"""Idempotent internal-link maintenance for existing and future WEBU blog articles."""
from pathlib import Path
import re, html
ROOT=Path(__file__).resolve().parents[2]
ARTICLES=sorted(p for p in ROOT.glob("blog-*.html") if p.name not in ("blog.html","blog-en.html"))
BEGIN="<!-- WEBU-RELATED-START -->"
END="<!-- WEBU-RELATED-END -->"
STOP={"ako","preco","prečo","ktore","ktoré","what","when","with","your","from","that","the","and","for","webu","journal","article","clanky","články","website","webstranka","webstránka","business","podnikanie"}
def title(text,filename):
    m=re.search(r"<h1\b[^>]*>(.*?)</h1>",text,re.I|re.S)
    return html.unescape(re.sub(r"<[^>]*>","",m.group(1))).strip() if m else filename.stem.replace("-"," ")
def language(text,p):
    m=re.search(r'<html\b[^>]*lang=["\']([^"\']+)',text[:300],re.I)
    return "en" if (m and m.group(1).startswith("en")) or p.stem.endswith("-en") else "sk"
def tokens(s):
    return set(w for w in re.findall(r"[^\W\d_]{4,}",s.casefold()) if w not in STOP)
def group(p):
    n=p.name
    if any(w in n for w in ("seo","web","cena","cost","pricing","roi","chyb")):return "website"
    if any(w in n for w in ("dovera","trust","platby","payment","zakaz")):return "trust"
    if any(w in n for w in ("ai-","osobnost","technolog")):return "technology"
    if any(w in n for w in ("udrzatel","data")):return "data"
    return "business"
def main():
    pages=[]
    for p in ARTICLES:
        s=p.read_text(encoding="utf-8")
        pages.append({"path":p,"content":s,"title":title(s,p.name),"lang":language(s,p),"tokens":tokens(title(s,p.name)),"group":group(p)})
    changed=0
    for item in pages:
        candidates=[other for other in pages if other["path"]!=item["path"] and other["lang"]==item["lang"]]
        candidates.sort(key=lambda o:(-(len(item["tokens"]&o["tokens"])*4+(3 if item["group"]==o["group"] else 0)),o["path"].name))
        chosen=candidates[:3]
        if len(chosen)<2:raise RuntimeError("Not enough same-language articles")
        en=item["lang"]=="en"
        heading="Related articles" if en else "Súvisiace články"
        links="".join('<li><a href="/'+html.escape(x["path"].name,quote=True)+'">'+html.escape(x["title"])+'</a></li>' for x in chosen)
        services="services and web design" if en else "tvorbe webstránok a službách"
        portfolio="portfolio of website projects" if en else "portfóliu realizácií"
        contact="contact WEBU" if en else "kontaktujte WEBU"
        servicepath="/sluzby-en.html" if en else "/sluzby.html"
        portpath="/portfolio-en.html" if en else "/portfolio.html"
        contactpath="/kontakt-en.html" if en else "/kontakt.html"
        section=(BEGIN+'<aside class="webu-related" aria-label="'+heading+'" style="max-width:820px;margin:32px auto;padding:24px;border:1px solid #e4d4a9;border-radius:16px;background:#fffaf0;color:#17233a">'
                 +'<h2 style="margin:0 0 12px;font-size:25px">'+heading+'</h2><ul style="padding-left:22px">'+links+'</ul>'
                 +'<p style="font-size:15px">'+('Explore more about ' if en else 'Viac informácií o ')
                 +'<a href="'+servicepath+'">'+services+'</a>, <a href="'+portpath+'">'+portfolio+'</a>; '
                 +'<a href="'+contactpath+'">'+contact+'</a>.</p></aside>'+END)
        s=item["content"]
        if BEGIN in s and END in s:
            s=re.sub(re.escape(BEGIN)+r".*?"+re.escape(END),lambda _:section,s,flags=re.S)
        else:
            if "</article>" in s:s=s.replace("</article>",section+"</article>",1)
            elif "</main>" in s:s=s.replace("</main>",section+"</main>",1)
            else:raise RuntimeError("Missing article container: "+item["path"].name)
        if s!=item["content"]:
            item["path"].write_text(s,encoding="utf-8")
            changed+=1
    print("WEBU related links synchronized:",changed,"articles checked:",len(pages))
if __name__=="__main__":main()
