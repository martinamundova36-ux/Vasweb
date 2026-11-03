#!/usr/bin/env python3
"""WEBU Journal: research-backed bilingual publishing; fail closed on weak sources."""
import datetime as dt, html, json, os, re, time, urllib.parse, urllib.request, unicodedata
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[2]
BASE="https://www.webu.sk/"
API=os.getenv("OPENAI_API_KEY","")
TODAY=dt.datetime.now(dt.timezone.utc).date()
TOPICS=[
 ("Podnikanie","entrepreneurship startup business performance"),
 ("Financie","corporate finance small business investment"),
 ("Psychológia zákazníkov","consumer behavior purchase decisions"),
 ("Marketing","marketing brand advertising effectiveness"),
 ("Technológie","artificial intelligence business productivity"),
 ("Manažment","leadership organizational behavior"),
 ("Behaviorálna ekonómia","behavioral economics decision making"),
 ("Budúcnosť práce","future of work innovation"),
 ("E-commerce","ecommerce customer experience"),
 ("Inovácie","business innovation entrepreneurship")
]
def fetch(url,headers=None,body=None):
    h={"User-Agent":"WEBU-Journal/1.0 (https://www.webu.sk/)","Accept":"application/json",**(headers or {})}
    req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers=h)
    with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)

def abstract(work):
    index=work.get("abstract_inverted_index") or {}
    if not index:return ""
    positions=[(p,word) for word,nums in index.items() for p in nums]
    return " ".join(word for _,word in sorted(positions))

def research():
    used=set()
    candidates=[]
    for category,query in TOPICS:
        for days in (30,90,365):
            params=urllib.parse.urlencode({"search":query,"filter":"from_publication_date:"+(TODAY-dt.timedelta(days=days)).isoformat()+",to_publication_date:"+TODAY.isoformat()+",has_abstract:true","sort":"publication_date:desc","per-page":15})
            try: works=fetch("https://api.openalex.org/works?"+params).get("results",[])
            except Exception as exc:
                print("Research search failed",category,days,str(exc)[:160])
                continue
            for w in works:
                a=abstract(w)
                doi=w.get("doi")
                authors=[(x.get("author") or {}).get("display_name","") for x in w.get("authorships",[])[:5]]
                if not doi or len(a.split())<130 or not all([w.get("title"),w.get("publication_date"),any(authors)]):continue
                if doi in used:continue
                if w.get("type") not in ("article","preprint","report","working-paper"):continue
                used.add(doi)
                candidates.append({"category":category,"title":w["title"],"date":w["publication_date"],"authors":", ".join(x for x in authors if x),"doi":doi,"abstract":a,"type":w.get("type"),"venue":((w.get("primary_location") or {}).get("source") or {}).get("display_name") or "Not specified"})
                break
            if any(x["category"]==category for x in candidates):break
        if len(candidates)>=10:break
    return candidates

def model(article):
    instructions=("You are a rigorous bilingual science editor. Use ONLY the supplied primary-study metadata and abstract. "
      "Never invent methodology, sample size, numerical results, causal claims, peer-review status, or conclusions. "
      "If abstract does not support a useful accurate article, set eligible false. "
      "Write original Slovak and English versions with matching factual claims, 5 sections each, "
      "including methods as known, findings, business implications, practical applications, and limitations. "
      "Clearly say where the abstract lacks details. Do not imply full text was reviewed. "
      "Return JSON object only with keys eligible (boolean), reason (string), sk and en (objects). "
      "Each language object must have title, description (max 160 chars), and sections array of objects heading and paragraphs "
      "(paragraphs array of strings). Minimum 5 sections. No fake citations. No markdown.")
    response=fetch("https://api.openai.com/v1/responses",{
      "model":"gpt-4.1-mini","instructions":instructions,
      "input":json.dumps(article,ensure_ascii=False),"max_output_tokens":6500
    },{"Authorization":"Bearer "+API,"Content-Type":"application/json"})
    raw="".join(p.get("text","") for item in response.get("output",[]) for p in item.get("content",[]) if p.get("type")=="output_text")
    return json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())

def slug(text):
    return re.sub("[^a-z0-9]+","-",unicodedata.normalize("NFKD",text).encode("ascii","ignore").decode().lower()).strip("-")[:60]

def esc(text):return html.escape(str(text),quote=True)

def render(data,source,lang,filename,other):
    english=lang=="en"
    title=data["title"]
    description=data["description"]
    url=BASE+filename
    other_url=BASE+other
    back="All articles" if english else "Všetky články"
    source_label="Research source" if english else "Výskumný zdroj"
    caution=("Article based on a publicly available study abstract; full text and peer-review status were not independently verified."
             if english else "Článok vychádza z verejne dostupného abstraktu štúdie; úplný text ani recenzné konanie neboli nezávisle overené.")
    sections="".join("<section><h2>"+esc(sec["heading"])+"</h2>"+"".join("<p>"+esc(p)+"</p>" for p in sec["paragraphs"])+"</section>" for sec in data["sections"])
    citation=esc(source["authors"])+" ("+esc(source["date"])+"). "+esc(source["title"])+". "+esc(source["venue"])+"."
    schema=json.dumps({"@context":"https://schema.org","@type":"BlogPosting","headline":title,"description":description,"datePublished":str(TODAY),"dateModified":str(TODAY),"inLanguage":lang,"mainEntityOfPage":url,"citation":source["doi"],"publisher":{"@type":"Organization","name":"WEBU","url":BASE}},ensure_ascii=False).replace("<","\\u003c")
    # Original SVG visual: no third-party image rights needed.
    visual='<svg role="img" aria-label="WEBU Journal research illustration" viewBox="0 0 800 180" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="180" fill="#0c1930"/><circle cx="660" cy="90" r="65" fill="none" stroke="#f4c766" stroke-width="3"/><path d="M70 115h500M90 85h400M130 55h280" stroke="#f4c766" stroke-width="3" opacity=".7"/></svg>'
    return ('<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      '<title>'+esc(title)+' | WEBU Journal</title><meta name="description" content="'+esc(description)+'">'
      '<meta name="robots" content="index,follow"><link rel="canonical" href="'+esc(url)+'">'
      '<link rel="alternate" hreflang="'+lang+'" href="'+esc(url)+'">'
      '<link rel="alternate" hreflang="'+("sk" if english else "en")+'" href="'+esc(other_url)+'">'
      '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(url)+'">'
      '<script type="application/ld+json">'+schema+'</script>'
      '<style>body{margin:0;background:#f7f9fd;color:#17233a;font:17px/1.8 system-ui,sans-serif}header,footer{background:#0c1930;color:white;padding:22px}header a,footer a{color:#f4c766}main{max-width:820px;margin:auto;padding:30px 24px 75px}h1{font-size:clamp(32px,5vw,52px);line-height:1.15}h2{margin-top:35px;font-size:26px}a{color:#194f85}svg{max-width:100%;height:auto;border-radius:16px}.note{background:#eef1f6;padding:16px;border-left:4px solid #f4c766}small{color:#596779}</style>'
      '</head><body><header><a href="/'+('blog-en.html' if english else 'blog.html')+'">WEBU Journal · '+back+'</a> · <a href="/'+other+'">'+("Slovenčina" if english else "English")+'</a></header>'
      '<main>'+visual+'<p><small>'+esc(source["category"])+' · '+str(TODAY)+'</small></p><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p>'
      +sections+'<section><h2>'+source_label+'</h2><p>'+citation+' <a rel="noopener noreferrer" href="'+esc(source["doi"])+'">DOI</a></p>'
      '<p class="note">'+caution+'</p></section></main><footer>© WEBU · <a href="/'+('blog-en.html' if english else 'blog.html')+'">'+back+'</a></footer>'
      '<script src="/privacy.js" defer></script></body></html>')

def publish(source,pair):
    if not pair.get("eligible"):raise ValueError("Model rejected source: "+str(pair.get("reason")))
    for lang in ("sk","en"):
        obj=pair.get(lang,{})
        if not isinstance(obj,dict) or len(obj.get("sections",[]))<5 or not obj.get("title") or len(obj.get("description",""))>160:raise ValueError("Invalid bilingual structure")
        if any(not x.get("heading") or not x.get("paragraphs") for x in obj["sections"]):raise ValueError("Missing section")
    key=slug(source["title"])[:43]+"-"+str(TODAY)
    sk="blog-journal-"+key+".html"
    en="blog-journal-"+key+"-en.html"
    if (ROOT/sk).exists() or (ROOT/en).exists():return False
    outputs={}
    for lang,name,other in (("sk",sk,en),("en",en,sk)):
        outputs[name]=render(pair[lang],source,lang,name,other)
        listing=ROOT/("blog.html" if lang=="sk" else "blog-en.html")
        content=listing.read_text(encoding="utf-8")
        marker='<div class="vw-journal-grid">'
        if marker not in content:raise ValueError("Blog grid missing")
        title=pair[lang]["title"]
        description=pair[lang]["description"]
        label="Read full article ↗" if lang=="en" else "Čítať celý článok ↗"
        card='<a class="vw-journal-card" href="/'+name+'"><div><small>'+esc(source["category"])+' · '+str(TODAY)+'</small><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p><span>'+label+'</span></div></a>'
        outputs[listing.name]=content.replace(marker,marker+card,1)
    for name,content in outputs.items():(ROOT/name).write_text(content,encoding="utf-8")
    return True

def main():
    if not API:raise SystemExit("OPENAI_API_KEY missing; publishing disabled")
    log={"date":str(TODAY),"found":0,"published":0,"rejected":[]}
    items=research()
    log["found"]=len(items)
    for source in items:
        if log["published"]>=5:break
        try:
            pair=model(source)
            if publish(source,pair):log["published"]+=1
        except Exception as exc:log["rejected"].append({"doi":source["doi"],"reason":str(exc)[:200]})
        time.sleep(0.3)
    import subprocess
    subprocess.run(["python3",str(ROOT/".github/scripts/sync_sitemap.py")],check=True)
    report=ROOT/"journal-reports"
    report.mkdir(exist_ok=True)
    (report/(str(TODAY)+".json")).write_text(json.dumps(log,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(log,ensure_ascii=False))
    if not log["published"]:raise SystemExit("No articles passed publication checks")

if __name__=="__main__":main()
