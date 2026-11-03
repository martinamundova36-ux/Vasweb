#!/usr/bin/env python3
"""Daily research discovery; does not generate or publish articles."""
import datetime, json, os, urllib.parse, urllib.request, time
from pathlib import Path

TODAY=datetime.datetime.now(datetime.timezone.utc).date()
REPO=os.environ.get("GITHUB_REPOSITORY","")
TOKEN=os.environ.get("GH_TOKEN","")
TOPICS=[
 ("Podnikanie","entrepreneurship startups business strategy"),
 ("Financie","business finance financial decision making"),
 ("Psychologia zakaznikov","consumer behavior purchasing psychology"),
 ("Marketing","marketing advertising brand effectiveness"),
 ("AI a technologie","artificial intelligence business productivity"),
 ("Manazment","leadership organizational psychology management"),
 ("Produktivita","decision making behavioral economics productivity"),
 ("Buducnost prace","future of work employment innovation"),
 ("E-commerce","ecommerce digital commerce customer experience"),
 ("Vyskum a inovacie","business innovation economic research"),
]
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
                    seen.add(wid)
                    selected.append({
                        "category":category,"title":title,"authors":authors,
                        "date":pubdate,"doi":doi,"openalex":wid,
                        "type":work.get("type","unknown"),"lookback_days":days,
                        "peer_reviewed":"not verified"
                    })
                    found=True
                    break
            except Exception as exc:
                errors.append(category+" ("+str(days)+" days): "+str(exc)[:200])
            time.sleep(0.2)
    if not selected:
        raise SystemExit("No verifiable research metadata found; no article published. Errors: "+"; ".join(errors))
    title="[WEBU VYSKUM] "+TODAY.isoformat()
    lines=["# WEBU Journal – denny prieskum zahranicnych studii", "",
       "**Stav:** len vyskumne podklady, NIE hotove clanky. Ziadne automaticke publikovanie.",
       "**Datum UTC:** "+TODAY.isoformat(),
       "**Najdenych kandidatov:** "+str(len(selected)),
       "**Metodologia, vzorka, vysledky, recenzne konanie, licencia obrazka:** NEOVERENE; vyzaduju plny text a redakcnu kontrolu.",
       "", "## Kandidati"]
    for i,item in enumerate(selected,1):
        lines.extend(["",f"### {i}. {item['category']}: {item['title']}",
            "- Autori: "+item["authors"],"- Datum: "+item["date"],
            "- DOI: "+item["doi"],"- OpenAlex: "+item["openalex"],
            "- Typ zaznamu: "+item["type"],
            "- Okno vyhladavania: "+str(item["lookback_days"])+" dni",
            "- Status: metadata najdene; obsah a zavery neoverene"])
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
