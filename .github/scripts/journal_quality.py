#!/usr/bin/env python3
"""Conservative, deterministic quality gate for NEW WEBU abstract-based editorials.

A passing result is NOT peer review, full-text verification, or evidence of
journal-submission readiness. This gate protects readers from thin, repetitive,
obviously unproofread drafts before they reach the public website.
"""
import re
from collections import Counter

MIN_WORDS = 700
MIN_PRACTICAL_WORDS = 120
HEADINGS = {
    "sk": ["Úvod", "Čo skúmala štúdia", "Hlavné zistenia a význam",
           "Metodika a limity", "Praktický návrh WEBU", "Záver"],
    "en": ["Introduction", "What the study examined", "Findings and interpretation",
           "Methodology and limitations", "WEBU practical proposal", "Conclusion"],
}
PRACTICAL = {
    "sk": re.compile(r"\b(napríklad|príklad|modelov\w*|krok\w*|pilot\w*|otest\w*|meran\w*|metrik\w*|indikátor\w*|kontroln\w*|over\w*)\b", re.I),
    "en": re.compile(r"\b(example|scenario|step\w*|pilot|test\w*|measur\w*|metric\w*|indicator\w*|checklist|verify|experiment)\b", re.I),
}
ABSTRACT = {
    "sk": re.compile(r"\babstrakt\w*\b", re.I),
    "en": re.compile(r"\babstract\b", re.I),
}
LANGUAGE_RED_FLAGS = {
    "sk": re.compile(
        r"prištiepen\w*|konkrénte|korelačního|zamestnanców|"
        r"\blídring\w*\b|\bk nostalgií\b|\binštruktážneho\b|"
        r"\bpreukázateľne (?:zlepš\w*|zvýš\w*|dokaz\w*)\b|"
        r"\b(?:štúdia|výskum) (?:dokazuje|zaručuje)\b",
        re.I,
    ),
    "en": re.compile(
        r"\b(?:the study proves|the research guarantees|scientifically proven to)\b",
        re.I,
    ),
}

def words(value):
    return re.findall(r"[^\W_]+(?:[’'-][^\W_]+)*", value or "", flags=re.UNICODE)

def paragraphs(article):
    return [p.strip() for sec in article.get("sections", [])
            for p in sec.get("paragraphs", []) if isinstance(p, str)]

def evidence_numbers(article):
    # Compare numbers in study findings/methodology across languages.
    # An equal number in both versions does NOT verify it against the source.
    chunks = [s for s in article.get("sections", [])
              if s.get("heading") in (HEADINGS["sk"][2], HEADINGS["sk"][3],
                                      HEADINGS["en"][2], HEADINGS["en"][3])]
    values = re.findall(r"(?<!\w)\d+(?:[.,]\d+)?%?(?!\w)",
                        " ".join(p for sec in chunks for p in sec.get("paragraphs", [])))
    return Counter(v.replace(",", ".") for v in values)

def quality_issues(articles):
    """Return actionable reasons to HOLD a new SK/EN manuscript."""
    issues = []
    if not isinstance(articles, dict) or set(articles) != {"sk", "en"}:
        return ["Both Slovak and English manuscripts are mandatory"]
    for lang in ("sk", "en"):
        article = articles.get(lang)
        if not isinstance(article, dict):
            issues.append(lang + ": article must be an object")
            continue
        sections = article.get("sections", [])
        if not isinstance(sections, list) or [s.get("heading") for s in sections
                                            if isinstance(s, dict)] != HEADINGS[lang]:
            issues.append(lang + ": required research/limitations/practical sections missing")
            continue
        all_paras = paragraphs(article)
        body = " ".join([article.get("lead", "")] + all_paras)
        count = len(words(body))
        if count < MIN_WORDS:
            issues.append(f"{lang}: {count} words; new editorials require at least {MIN_WORDS} substantive words")
        if len(words(article.get("lead", ""))) < 35:
            issues.append(lang + ": weak abstract/lead")
        for index, minimum in ((1, 80), (2, 100), (3, 95), (4, MIN_PRACTICAL_WORDS)):
            section = sections[index]
            section_text = " ".join(section.get("paragraphs", []))
            if len(words(section_text)) < minimum:
                issues.append(f"{lang}: '{section.get('heading')}' is not substantive enough")
        if not PRACTICAL[lang].search(" ".join(sections[4].get("paragraphs", []))):
            issues.append(lang + ": practical section lacks a concrete step, example or measurement")
        if not ABSTRACT[lang].search(" ".join(sections[3].get("paragraphs", []))):
            issues.append(lang + ": methodology must disclose abstract-only evidence")
        red_flags = sorted(set(m.group(0) for m in LANGUAGE_RED_FLAGS[lang].finditer(body)))
        if red_flags:
            issues.append(lang + ": proofread or overclaim: " + ", ".join(red_flags[:5]))
        normalized = [re.sub(r"\s+", " ", p).strip().casefold() for p in all_paras]
        dupes = [p for p, n in Counter(normalized).items() if n > 1 and len(words(p)) >= 12]
        if dupes:
            issues.append(lang + ": duplicated substantive paragraphs")
        if not (50 <= len(article.get("description", "")) <= 160):
            issues.append(lang + ": SEO description outside 50-160 characters")
        if not article.get("title", "").strip():
            issues.append(lang + ": empty article title")
    if isinstance(articles.get("sk"), dict) and isinstance(articles.get("en"), dict):
        sk_numbers = evidence_numbers(articles["sk"])
        en_numbers = evidence_numbers(articles["en"])
        if sk_numbers != en_numbers:
            issues.append("SK/EN: numerical findings or methodology are not equivalent")
    return issues

if __name__ == "__main__":
    import json
    import sys
    payload = json.load(sys.stdin)
    errors = quality_issues(payload)
    print(json.dumps({"passed": not errors, "issues": errors}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))
