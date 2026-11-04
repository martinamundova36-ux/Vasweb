#!/usr/bin/env python3
"""Crossref checks for today's WEBU research issue. Bibliography only, not findings."""
import datetime, difflib, json, os, re, urllib.parse, urllib.request
repo=os.environ["GITHUB_REPOSITORY"]
token=os.environ["GH_TOKEN"]
today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
def request(url, method="GET", data=None):
    headers={"Accept":"application/json","User-Agent":"WEBU-Journal/1.0 (https://www.webu.sk/)"}
    if "api.github.com" in url: headers.update({"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json"})
    payload=json.dumps(data).encode() if data is not None else None
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers,method=method,data=payload),timeout=25) as r:return json.load(r)
base="https://api.github.com/repos/"+repo
issues=request(base+"/issues?state=all&per_page=100")
issue=next((x for x in issues if x["title"]=="[WEBU VYSKUM] "+today),None)
if not issue:
    print("No research issue today; nothing to verify")
    raise SystemExit(0)
body=issue["body"].split("\n## Automaticke overenie DOI / Crossref")[0]
entries=re.findall(r"### (\\d+)\\. ([^\\n]+)[\\s\\S]*?- DOI: (https?://[^\\s]+)",body)
lines=["","## Automaticke overenie DOI / Crossref","","> Automaticky sa overuju iba bibliograficke metadata. Vysledky, metodika, recenzne konanie a interpretacia NIE SU overene.",""]
for num,title,doi_url in entries:
    doi=doi_url.split("doi.org/")[-1]
    try:
        record=request("https://api.crossref.org/works/"+urllib.parse.quote(doi,safe="/"))["message"]
        name=(record.get("title") or [""])[0]
        normalized=lambda s:re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
        expected=title.split(": ",1)[-1]
        ratio=difflib.SequenceMatcher(None,normalized(expected),normalized(name)).ratio()
        if record.get("DOI","").lower()==doi.lower() and ratio>=0.85 and record.get("author"):
            status="METADATA OVERENE"
        else:status="NEZHODA - NEPOUZIVAT BEZ RUCNEJ KONTROLY"
        lines.append(f"- {num}. **{status}**: {expected} | zhoda nazvu {ratio:.0%} | {doi_url}")
    except Exception as exc:
        lines.append(f"- {num}. **NEOVERENE - NEPOUZIVAT BEZ RUCNEJ KONTROLY**: {doi_url} | {str(exc)[:90]}")
lines.extend(["","**Redakcna brana:** Publikovanie zostava zablokovane az do overenia plneho textu, vysledkov, tvrdeni a licencii."])
request(base+"/issues/"+str(issue["number"]),"PATCH",{"body":body+"\n".join(lines)})
print("Crossref verification appended for",len(entries),"candidates")
