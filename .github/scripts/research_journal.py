#!/usr/bin/env python3
"""Daily research discovery; does not generate or publish articles."""
import datetime, json, os, urllib.parse, urllib.request, time
from pathlib import Path

TODAY=datetime.datetime.now(datetime.timezone.utc).date()
REPO=os.environ.get("GITHUB_REPOSITORY","")
TOKEN=os.environ.get("GH_TOKEN","")
TOPICS=[
 ("Podnikanie","entrepreneurship startups business strategy"),
 ("Financie","ecommerce checkout pricing customer payments"),
 ("Psychologia zakaznikov","consumer behavior purchasing psychology"),
 ("Marketing","digital marketing advertising conversion small business"),
 ("AI a technologie","artificial intelligence business productivity"),
 ("Manazment","leadership organizational psychology management"),
 ("Produktivita","business productivity digital transformation"),
 ("Buducnost prace","generative AI business customer service"),
 ("E-commerce","ecommerce digital commerce customer experience"),
 ("Vyskum a inovacie","website user experience usability conversion"),
]
CLIENT_KEYWORDS={"website":5,"usability":5,"conversion":6,"ecommerce":5,"e-commerce":5,"digital marketing":5,"seo":6,"customer trust":5,"customer experience":4,"small business":5,"pricing":4,"online booking":6,"appointment scheduling":6,"hospitality":3,"restaurant":3,"hotel":3,"business productivity":4,"digital transformation":4,"generative ai":3}
EXCLUDE_KEYWORDS={"vaccine":-10,"vaccination":-10,"leprosy":-10,"intensive care":-10,"icu":-10,"clinical":-6,"patient":-6,"medical":-5,"urban transformation":-5,"bibliometric":-5,"stigma":-6}
def relevance(work):
    inv=work.get("abstract_inverted_index") or {}
    words={position:word for word,positions in inv.items() for position in positions}
    abstract=" ".join(words[p] for p in sorted(words)).lower()
    title=(work.get("title") or "").lower()
    content=title+" "+abstract
    positive=[(k,v) for k,v in CLIENT_KEYWORDS.items() if k in content]
    negative=[(k,v) for k,v in EXCLUDE_KEYWORDS.items() if k in content]
    score=sum(v for _,v in positive)+sum(v for _,v in negative)
    if len(abstract)<120:score-=8
    return score,positive,negative,len(abstract)>=120

def get_json(url, headers=None):
    req=urllib.request.Request(url,headers={"User-Agent":"WEBU-Journal-Research/1.0 (https://www.webu.sk/)","Accept":"application/json",**(headers or {})})
    with urllib.request.urlopen(req,timeout=25) as response:
        return json.load(response)

def github(method,path,data=None):
    url="https://api.github.com/repos/"+REPO+path
    headers={"Authorization":"Bearer "+TOKEN,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}
    body=json.dumps(data,ensure_ascii=False).encode() if data is not None else None
    req=urllib.request.Request(url,data=body,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=30) as response:
        return json.load(response)

def main():
    if not REPO or not TOKEN:
        raise SystemExit("Missing GITHUB_REPOSITORY or GH_TOKEN")
    # Search recent published research with OpenAlex; metadata only is not full-text verification.
    seen=set()
    selected=[]
    errors=[]
    # Look first at the past 30 days, then 90 days, then one year.
    # OpenAlex metadata alone is not evidence of study findings.
    for category,query in TOPICS:
        found=False
        for days in (30,90,365):
            if found:
                break
            try:
                params=urllib.parse.urlencode({
                    "search":query,
                    "filter":"from_publication_date:"+(TODAY-datetime.timedelta(days=days)).isoformat()+",to_publication_date:"+TODAY.isoformat(),
                    "sort":"publication_date:desc","per-page":15
                })
                payload=get_json("https://api.openalex.org/works?"+params)
                for work in payload.get("results",[]):
                    wid=work.get("id")
                    title=(work.get("title") or "").strip()
                    doi=work.get("doi")
                    pubdate=work.get("publication_date")
                    if not wid or not title or not doi or not pubdate or wid in seen:
                        continue
                    authors=", ".join((a.get("author") or {}).get("display_name","") for a in work.get("authorships",[])[:4])
                    if not authors:
                        continue
                    score,positive,negative,has_abstract=relevance(work)
                    if not has_abstract or score<7 or not positive:
                        continue
                    seen.add(wid)
                    selected.append({
                        "category":category,"title":title,"authors":authors,
                        "date":pubdate,"doi":doi,"openalex":wid,
                        "type":work.get("type","unknown"),"lookback_days":days,
                        "peer_reviewed":"not verified", "score":score, "client_use":", ".join(k for k,_ in positive), "warnings":", ".join(k for k,_ in negative)
                    })
                    found=True
                    break
            except Exception as exc:
                errors.append(category+" ("+str(days)+" days): "+str(exc)[:200])
            time.sleep(0.2)
    selected.sort(key=lambda item:item["score"],reverse=True)
    if not selected:
        raise SystemExit("No verifiable research metadata found; no article published. Errors: "+"; ".join(errors))
    title="[WEBU VYSKUM] "+TODAY.isoformat()
    lines=["# WEBU Journal – denny prieskum zahranicnych studii", "",
       "**Stav:** len vyskumne podklady, NIE hotove clanky. Ziadne automaticke publikovanie.",
       "**Datum UTC:** "+TODAY.isoformat(),
       "**Najdenych relevantnych kandidatov:** "+str(len(selected)),
       "**Filter:** dostupny abstrakt, uzitocnost pre klientov WEBU, skore aspon 7; bez automatickeho publikovania.",
       "**Metodologia, vzorka, vysledky, recenzne konanie, licencia obrazka:** NEOVERENE; vyzaduju plny text a redakcnu kontrolu.",
       "", "## Kandidati"]
    for i,item in enumerate(selected,1):
        lines.extend(["",f"### {i}. {item['category']}: {item['title']}",
            "- Autori: "+item["authors"],"- Datum: "+item["date"],
            "- DOI: "+item["doi"],"- OpenAlex: "+item["openalex"],
            "- Typ zaznamu: "+item["type"],
            "- Okno vyhladavania: "+str(item["lookback_days"])+" dni",
            "- Skore uzitocnosti: "+str(item["score"]),
            "- Vyuzitelnost pre klienta: "+item["client_use"],
            "- Tematicke upozornenia: "+(item["warnings"] or "ziadne"),
            "- Status: automaticky posudeny abstrakt; metodika a zavery neoverene"])
    if errors: lines.extend(["","## Chyby pri hladani"]+["- "+e for e in errors])
    lines.extend(["","## Publikovanie","ZABLOKOVANE: bez overenia primarneho textu, metodologie, vysledkov, SK/EN obsahu, SEO a licencie obrazka."])
    # One report per day, reruns are idempotent.
    existing=github("GET","/issues?state=all&per_page=100")
    if any(x.get("title")==title for x in existing):
        print("Today's research report already exists; skipping.")
        return
    issue=github("POST","/issues",{"title":title,"body":"\n".join(lines)})
    print("Created research report:",issue["html_url"],"candidates:",len(selected),"published articles: 0")

if __name__=="__main__":
    main()
