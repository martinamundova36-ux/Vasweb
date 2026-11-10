#!/usr/bin/env python3
"""Create bilingual abstract-scoped editorial manuscripts via Gemini.
The JSON carries no claim of full-text comparison or scientific peer review.
No API call without explicit GEMINI_API_KEY; no paid plan is configured here.
"""
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[2]
TODAY=dt.datetime.now(ZoneInfo("Europe/Bratislava")).date().isoformat()
MODEL=os.environ.get("WEBU_GEMINI_MODEL","gemini-3.5-flash-lite")
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

def available_models(api_key):
    req=urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",headers={"x-goog-api-key":api_key})
    with urllib.request.urlopen(req,timeout=30) as response:
        data=json.load(response)
    return {m["name"].split("/",1)[-1] for m in data.get("models",[]) if "generateContent" in m.get("supportedGenerationMethods",[])}

def request_with_retries(model,request,key):
    url="https://generativelanguage.googleapis.com/v1beta/models/"+urllib.parse.quote(model,safe="")+":generateContent"
    for attempt in range(3):
        req=urllib.request.Request(url,data=json.dumps(request,ensure_ascii=False).encode(),headers={"Content-Type":"application/json","x-goog-api-key":key},method="POST")
        try:
            with urllib.request.urlopen(req,timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code not in (429,500,502,503,504) or attempt==2:raise
        except (urllib.error.URLError,TimeoutError):
            if attempt==2:raise
        time.sleep(2**attempt * 2)
    raise RuntimeError("Retries exhausted")

def validate_result(result):
    if not isinstance(result,dict) or set(result)!={"sk","en"}:
        raise ValueError("Missing bilingual output")
    for lang,headings in (("sk",HEADINGS_SK),("en",HEADINGS_EN)):
        article=result[lang]
        if not isinstance(article,dict) or not article.get("title") or not 50<=len(article.get("description",""))<=160:
            raise ValueError("Invalid article metadata "+lang)
        sections=article.get("sections",[])
        if not isinstance(sections,list) or [s.get("heading") for s in sections]!=headings:
            raise ValueError("Article structure mismatch "+lang)
        if not all(len(s.get("paragraphs",[]))>=2 for s in sections):
            raise ValueError("Incomplete article section "+lang)
        count=len(" ".join([article.get("lead","")]+[p for s in sections for p in s["paragraphs"]]).split())
        if count<300:
            raise ValueError("Article too short "+lang)
    return result

def generate(source,abstract,api_key,models):
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
- Proofread BOTH complete language versions before returning JSON. Slovak must use
  natural Slovak syntax, correct declension, agreement, punctuation and diacritics;
  do not translate English idioms literally or leave English workplace jargon
  when an established Slovak expression exists. Check singular/plural agreement
  and every sentence for unfinished or contradictory wording.
- English must be idiomatic, grammatical and consistent in its terminology;
  avoid inflated, awkward or needlessly repetitive academic phrasing.
- Compare SK and EN paragraph by paragraph: preserve the same numbers, evidence
  limitations and cautions in both languages, while writing naturally in each.
- In the final pass, fix typographical errors and malformed inflections, including
  those introduced by rewriting; never send an unproofread translation.
- No external references apart from the verified DOI.
"""
    request={"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.35,"maxOutputTokens":7000}}
    errors=[]
    for model in models:
        try:
            payload=request_with_retries(model,request,api_key)
            response_text=payload["candidates"][0]["content"]["parts"][0]["text"]
            result=validate_result(json.loads(response_text))
            print("Gemini model used:",model)
            return result
        except urllib.error.HTTPError as exc:
            if exc.code in (400,401,403):raise
            errors.append(model+": "+str(exc))
        except (urllib.error.URLError,TimeoutError) as exc:
            errors.append(model+": "+str(exc))
        except (ValueError,TypeError,KeyError,IndexError) as exc:
            # A model can return malformed JSON or omit a required language.
            # Never publish it; try another available free model instead.
            errors.append(model+": invalid article output: "+str(exc))
    raise RuntimeError("All available Gemini models failed: "+"; ".join(errors))

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
        from unittest.mock import patch
        for lang in ("sk","en"):
            result[lang]["sections"][0]["paragraphs"]=["word "*170,"word "*170]
        replies=iter([{"candidates":[{"content":{"parts":[{"text":"{invalid-json"}]}}]},
                      {"candidates":[{"content":{"parts":[{"text":json.dumps(result)}]}}]}])
        with patch(__name__+".request_with_retries",side_effect=lambda *a:next(replies)):
            assert generate(sample,"A verified abstract","test-key",["first","second"])==result
        print("PASS: bilingual manuscript formatting, no publishing")
        return
    key=os.environ.get("GEMINI_API_KEY","")
    output=ROOT/"journal-articles-pending"
    output.mkdir(exist_ok=True)
    if not key:
        raise SystemExit("GEMINI_API_KEY is missing. Add the repository Actions secret; no manuscript published.")
    drafts=ROOT/"journal-drafts"
    try:offered=available_models(key)
    except Exception as exc:raise SystemExit("Gemini model discovery failed: "+str(exc))
    models=[name for name in (MODEL,"gemini-3.1-flash-lite","gemini-3.8-flash") if name in offered]
    if not models:raise SystemExit("No configured Gemini model supports generateContent for this key")
    print("Configured available models:",", ".join(models))
    count=0
    for source_path in sorted(drafts.glob("*.json")):
        source=json.loads(source_path.read_text())
        if source.get("drafted_at")!=TODAY or source.get("published_at") or source.get("test_only"):continue
        destination=output/(source_path.stem+".md")
        structured=output/(source_path.stem+".json")
        if destination.exists() and structured.exists():continue
        try:
            try:
                abstract=load_abstract(source)
            except Exception as exc:
                raise RuntimeError("Crossref source lookup: "+str(exc)) from exc
            try:
                generated=generate(source,abstract,key,models)
            except Exception as exc:
                raise RuntimeError("Gemini model "+MODEL+": "+str(exc)) from exc
            structured.write_text(json.dumps({"schema":"webu-abstract-manuscript-v1","source_doi":source["doi"],"generated_on":TODAY,"abstract_scope":"crossref_abstract_only","languages":generated},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            destination.write_text(markdown(source,generated),encoding="utf-8")
            count+=1
            print("DRAFT generated:",source_path.stem)
        except Exception as exc:
            print("HOLD",source_path.stem,str(exc)[:250],file=sys.stderr)
    print(json.dumps({"date":TODAY,"new_manuscripts":count,"publication":"blocked pending science review"}))
    eligible=sum(1 for p in drafts.glob("*.json") if (lambda x: x.get("drafted_at")==TODAY and not x.get("published_at") and not x.get("test_only"))(json.loads(p.read_text())))
    present=sum(1 for p in output.glob("*.json") if json.loads(p.read_text()).get('generated_on')==TODAY)
    if eligible and not present:
        raise SystemExit("No AI manuscripts created: inspect HOLD stage and model availability; not a successful delivery")
if __name__=="__main__":main()
