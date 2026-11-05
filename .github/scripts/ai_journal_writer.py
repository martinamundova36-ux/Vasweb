#!/usr/bin/env python3
"""Automatically create bilingual WEBU Journal article manuscripts via Gemini free-tier API.
Creates drafts only; never marks scientific checks complete or publishes pages.
No API call without explicit GEMINI_API_KEY secret; billing is never configured here.
"""
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[2]
TODAY=dt.datetime.now(ZoneInfo("Europe/Bratislava")).date().isoformat()
MODEL=os.environ.get("WEBU_GEMINI_MODEL","gemini-2.5-flash-lite")
HEADINGS_SK=["Úvod","Čo skúmala štúdia","Hlavné zistenia a význam","Metodika a limity","Praktický návrh WEBU","Záver"]
HEADINGS_EN=["Introduction","What the study examined","Findings and interpretation","Methodology and limitations","WEBU practical proposal","Conclusion"]

def load_abstract(source):
    doi=urllib.parse.quote(source["doi"],safe="/")
    req=urllib.request.Request("https://api.crossref.org/works/"+doi,headers={"User-Agent":"WEBU-Journal/2.0 (https://www.webu.sk/)"})
    with urllib.request.urlopen(req,timeout=25) as response:
        record=json.load(response)["message"]
    if record.get("DOI","").casefold()!=source["doi"].casefold():
        raise ValueError("Source DOI mismatch")
    abstract=html.unescape(re.sub(r"<[^>]+>"," ",record.get("abstract","")))
    abstract=re.sub(r"\\s+"," ",abstract).strip()
    if len(abstract.split())<80:
        raise ValueError("Insufficient primary-source abstract: do not invent findings")
    return abstract[:14000]

def generate(source,abstract,api_key):
    url="https://generativelanguage.googleapis.com/v1beta/models/"+urllib.parse.quote(MODEL,safe="")+":generateContent"
    prompt="""Create TWO DISTINCT, polished, genuinely useful and original WEBU Journal editorial article drafts in Slovak and English.
Return ONLY JSON with two properties 'sk' and 'en'. Each contains 'title', 'description' (50-160 chars), 'lead' and 'sections'.
Each 'sections' must contain EXACTLY six objects with a 'heading' and 'paragraphs' (array of 2-3 substantive original paragraphs).
The section headings in order MUST be:
SK: """+json.dumps(HEADINGS_SK,ensure_ascii=False)+"""
EN: """+json.dumps(HEADINGS_EN)+"""
Study source metadata: """+json.dumps({k:source.get(k) for k in ("title","authors","venue","source_date","doi","url")},ensure_ascii=False)+"""
Publisher-supplied abstract, NOT verified against complete article: """+abstract+"""
CRITICAL accuracy rules:
- Treat the abstract as a secondary-access source excerpt. Say explicitly 'podľa abstraktu'/ 'according to the abstract' for every study result.
- Only include numbers, methods, population and findings if they occur EXPLICITLY in the abstract.
- Never invent sample sizes, effect estimates, significance, tests, verified full-text findings or other citations.
- Do not infer causation from associations, or make claims about Slovakia based on another population.
- Separate WEBU's practical recommendations from study conclusions and label them editorial recommendations.
- Discuss unverified full text and limits of the abstract honestly.
- Use helpful practical WEBU examples for owners of small businesses, web design, marketing and workplace management.
- Produce substantial, readable copy, not filler or repeated template paragraphs.
- No external references apart from the verified DOI.
"""
    request={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.35,"maxOutputTokens":7000}}
    req=urllib.request.Request(url,data=json.dumps(request,ensure_ascii=False).encode(),headers={"Content-Type":"application/json","x-goog-api-key":api_key},method="POST")
    with urllib.request.urlopen(req,timeout=120) as response:
        payload=json.load(response)
    response_text=payload["candidates"][0]["content"]["parts"][0]["text"]
    result=json.loads(response_text)
    if set(result)!={"sk","en"}:raise ValueError("Missing bilingual output")
    for lang,headings in (("sk",HEADINGS_SK),("en",HEADINGS_EN)):
        article=result[lang]
        if not article.get("title") or not 50<=len(article.get("description",""))<=160:raise ValueError("Invalid article metadata "+lang)
        sections=article.get("sections",[])
        if [s.get("heading") for s in sections]!=headings:raise ValueError("Article structure mismatch "+lang)
        if not all(len(s.get("paragraphs",[]))>=2 for s in sections):raise ValueError("Incomplete article section "+lang)
        count=len(" ".join([article.get("lead","")]+[p for s in sections for p in s["paragraphs"]]).split())
        if count<300:raise ValueError("Article too short "+lang)
    return result

def markdown(source,result):
    lines=["<!-- WEBU-AI-MANUSCRIPT-V1 -->","# WEBU Journal — automaticky pripravený odborný text / Automated editorial manuscript","",
           "**ČAKÁ NA ODBORNÚ KONTROLU / AWAITS SCIENTIFIC REVIEW — Nie je publikovaný / Not published.**","",
           "Zdroj / Source: "+source["url"],"",
           "Výskumné tvrdenia pochádzajú iba z dostupného abstraktu; overenie plného textu a odborné schválenie je povinné.","",
           "Research claims are based only on the available abstract; full-text verification and editorial approval remain mandatory.",""]
    for lang in ("sk","en"):
        a=result[lang]
        lines.extend(["## "+("Slovenská verzia" if lang=="sk" else "English version"),"",
                      "# "+a["title"],"",a["lead"],""])
        for section in a["sections"]:
            lines.extend(["### "+section["heading"],""])
            for paragraph in section["paragraphs"]:lines.extend([paragraph,""])
        lines.extend(["### "+("Zdroje a redakčná transparentnosť" if lang=="sk" else "Sources and editorial transparency"),"",
                      ", ".join(source["authors"])+f" ({source['source_date'][:4]}). "+source["title"]+". "+source["venue"]+". "+source["url"],""])
    return "\n".join(lines)

def main():
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("--self-test",action="store_true")
    args=ap.parse_args()
    if args.self_test:
        assert len(HEADINGS_SK)==len(HEADINGS_EN)==6
        sample={"doi":"10.1234/abc","title":"Example","authors":["A"],"venue":"Journal","source_date":"2026-01-01","url":"https://doi.org/10.1234/abc"}
        result={lang:{"title":"Example","lead":"Example","description":"Example description of at least fifty characters in length.","sections":[{"heading":heading,"paragraphs":["a","b"]} for heading in hs]} for lang,hs in (("sk",HEADINGS_SK),("en",HEADINGS_EN))}
        text=markdown(sample,result)
        assert "WEBU-AI-MANUSCRIPT-V1" in text and "Slovenská verzia" in text and "English version" in text
        print("PASS: bilingual manuscript formatting, no publishing")
        return
    key=os.environ.get("GEMINI_API_KEY","")
    output=ROOT/"journal-articles-pending"
    output.mkdir(exist_ok=True)
    if not key:
        raise SystemExit("GEMINI_API_KEY is missing. Add the repository Actions secret; no manuscript published.")
    drafts=ROOT/"journal-drafts"
    count=0
    for source_path in sorted(drafts.glob("*.json")):
        source=json.loads(source_path.read_text())
        if source.get("drafted_at")!=TODAY or source.get("published_at") or source.get("test_only"):continue
        destination=output/(source_path.stem+".md")
        if destination.exists():continue
        try:
            abstract=load_abstract(source)
            generated=generate(source,abstract,key)
            destination.write_text(markdown(source,generated),encoding="utf-8")
            count+=1
            print("DRAFT generated:",source_path.stem)
        except Exception as exc:
            print("HOLD",source_path.stem,str(exc)[:250],file=sys.stderr)
    print(json.dumps({"date":TODAY,"new_manuscripts":count,"publication":"blocked pending science review"}))
if __name__=="__main__":main()
