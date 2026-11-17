#!/usr/bin/env python3
"""One-time, narrowly scoped, hash-aware published-article copyedit.

Grammar and clear overclaims only. Never touches URLs, scientific numbers,
methods, images, templates, or historical datePublished. This is NOT scientific
fact-checking. Preflight enforces the existing editorial register's hashes.
"""
import argparse
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github/scripts"))
from free_journal import editorial_digest
from journal_review_records import digest, REGISTER

# Filename is the established URL, not a new slug; edits preserve it.
PATCHES = {
 "blog-journal-digitalna-transformacia-v-rozvojovych-ekonomikach-co-hovori-nova-studia-o-pr.html": [
   ("konkrénte", "konkrétne"),
 ],
 "blog-journal-digitalny-lidring-a-vykonnost-firiem-v-cestovnom-ruchu-co-hovori-novy-vyskum.html": [
   ("Digitálny lídring", "Digitálne vedenie"),
   ("digitálnym lídringom", "digitálnym vedením"),
   ("digitálneho lídringu", "digitálneho vedenia"),
   ("digitálny lídring", "digitálne vedenie"),
 ],
 "blog-journal-etnovychova-umela-inteligencia-a-mladez-v-ekvadore-pohlad-cez-pristiepeny-ab.html": [
   ("prištiepený abstrakt", "dostupný abstrakt"),
   ("využívat", "využívať"),
   ("Zabezpečíte tak vyššiu dôveryhodnosť vašej značky a predídete neúmyselným stereotypom v digitálnom priestore.",
    "Takýto postup môže prispieť k dôveryhodnejšej komunikácii značky a znížiť riziko stereotypného zobrazovania."),
 ],
 "blog-journal-digitalna-nostalgia-a-nakupny-zamer-ako-minulost-formuje-spravanie-mladych-s.html": [
   ("k nostalgií", "k nostalgii"),
   ("pozitívne vplýva na emocionálnu väzbu", "pozitívne súvisí s emocionálnou väzbou"),
   ("pozitívne ovplyvňuje samotnú emocionálnu väzbu", "pozitívne súvisí so samotnou emocionálnou väzbou"),
   ("čo následne vedie k vyššej nákupnej zámere spotrebiteľov",
    "čo podľa výsledkov súvisí s vyšším nákupným zámerom spotrebiteľov"),
 ],
 "blog-journal-vzdelavaci-manazment-pod-lupou-ako-vedenie-skol-a-kultura-vplyvaju-na-spokoj.html": [
   ("korelačního", "korelačného"),
   ("zamestnanców", "zamestnancov"),
   ("obaja prediktory", "oba prediktory"),
   ("pozitívne a významne predikovalo spokojnosť učiteľov čiastočne",
    "pozitívne a štatisticky významne súviselo so spokojnosťou učiteľov"),
   ("preukázateľne zlepšuje pracovnú pohodu a celkovú kvalitu výstupov",
    "môže podporiť pracovnú pohodu a kvalitu výstupov"),
 ],
 "blog-journal-demokraticky-styl-vedenia-a-vykonnost-sestier-co-hovori-nova-studia-z-indone.html": [
   ("čo preukázateľne zvyšuje pracovnú morálku a kvalitu konečných výstupov bez ohľadu na odvetvie",
    "čo môže podporiť spoluprácu; prínos pre pracovnú morálku však treba overiť v konkrétnom prostredí"),
 ],
 "blog-journal-employer-branding-a-dostojna-praca-porovnanie-itc-limited-a-icici-bank.html": [
   ("preukázateľne zvyšuje dôveryhodnosť značky v očiach moderných uchádzačov o prácu",
    "môže zvýšiť transparentnosť voči uchádzačom; skutočný účinok na dôveru si vyžaduje overenie"),
 ],
}
# Update visible references to the two renamed H1s on blog listings and related cards.
TITLE_PATCHES = [
 ("Etnovýchova, umelá inteligencia a mládež v Ekvádore: Pohľad cez prištiepený abstrakt",
  "Etnovýchova, umelá inteligencia a mládež v Ekvádore: Pohľad cez dostupný abstrakt"),
 ("Digitálny lídring a výkonnosť firiem v cestovnom ruchu: Čo hovorí nový výskum",
  "Digitálne vedenie a výkonnosť firiem v cestovnom ruchu: Čo hovorí nový výskum"),
]
TODAY = str(dt.datetime.now(ZoneInfo("Europe/Bratislava")).date())

def transform(value, pairs):
    if isinstance(value, str):
        for old, new in pairs:
            value = value.replace(old, new)
        return value
    if isinstance(value, dict):
        return {k: transform(v, pairs) for k, v in value.items()}
    if isinstance(value, list):
        return [transform(v, pairs) for v in value]
    return value

def revise_ld_json(raw):
    def substitute(match):
        try:
            obj = json.loads(match.group(2))
        except ValueError:
            return match.group(0)
        if obj.get("@type") != "BlogPosting":
            return match.group(0)
        obj["dateModified"] = TODAY
        return match.group(1) + json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c") + match.group(3)
    return re.sub(r'(<script[^>]*type=["\x27]application/ld\+json["\x27][^>]*>)(.*?)(</script>)',
                  substitute, raw, flags=re.S | re.I)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--apply", action="store_true")
    args = p.parse_args()
    if args.self_test:
        assert transform({"title": "old", "sections": ["old"]}, [("old", "new")]) == {
            "title": "new", "sections": ["new"]}
        assert len(PATCHES) >= 5 and all(x.endswith(".html") for x in PATCHES)
        print("PASS: deterministic, scoped legacy-copyedit mapping")
        return
    if not args.apply:
        raise SystemExit("Use --apply to make the strictly scoped editorial correction.")

    reg_path = ROOT / REGISTER
    register = json.loads(reg_path.read_text(encoding="utf-8"))
    records = {row["id"]: row for row in register["articles"]}
    # Preflight: never overwrite an article whose editorial hash changed earlier.
    for row in register["articles"]:
        for lang, entry in row["languages"].items():
            path = ROOT / entry["path"]
            if digest(path.read_text(encoding="utf-8")) != entry["content_sha256"]:
                raise ValueError("Preflight refused changed article: " + entry["path"])

    # Map published source drafts by their pinned canonical URLs.
    source_map = {}
    for path in (ROOT / "journal-drafts").glob("*.json"):
        source = json.loads(path.read_text(encoding="utf-8"))
        urls = source.get("published_urls") or []
        if source.get("published_at") and len(urls) == 2:
            source_map[urls[0].split("/")[-1]] = (path, source)

    edited = set()
    updated_sources = []
    for filename, replacements in PATCHES.items():
        path = ROOT / filename
        if not path.is_file() or filename[:-5] not in records:
            raise ValueError("Cannot identify a published editorial record: " + filename)
        raw = path.read_text(encoding="utf-8")
        original = raw
        for before, after in replacements:
            if before not in raw and after not in raw:
                raise ValueError("Expected source wording not found: " + filename + " / " + before[:45])
            raw = raw.replace(before, after)
        if raw != original:
            raw = revise_ld_json(raw)
            path.write_text(raw, encoding="utf-8")
            edited.add(filename)
        if filename in source_map:
            source_path, source = source_map[filename]
            lang_data = source["editorial"]["languages"]["sk"]
            updated_lang = transform(lang_data, replacements)
            if updated_lang != lang_data:
                source["editorial"]["languages"]["sk"] = updated_lang
                new_hash = editorial_digest(source["editorial"]["languages"])
                source["editorial"]["content_sha256"] = new_hash
                source["approved_content_sha256"] = new_hash
                source.setdefault("copyedit_history", []).append({
                    "date": TODAY, "scope": "linguistic correction and softened editorial overclaim",
                    "scientific_full_text_newly_reviewed": False})
                source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n",
                                       encoding="utf-8")
                updated_sources.append(source_path.name)
        else:
            # Pre-existing manually published guides may not have an automated draft.
            pass

    for path in ROOT.glob("blog*.html"):
        raw = path.read_text(encoding="utf-8")
        revised = transform(raw, TITLE_PATCHES)
        if revised != raw:
            path.write_text(revised, encoding="utf-8")
            edited.add(path.name)

    # Refresh hashes only for pages changed by this explicit, audited correction.
    # Keep the original publication date and evidence classification intact.
    changed_records = []
    for row in register["articles"]:
        changed = False
        for lang, entry in row["languages"].items():
            filename = entry["path"]
            if filename not in edited:
                continue
            raw = (ROOT / filename).read_text(encoding="utf-8")
            new_digest = digest(raw)
            if new_digest != entry["content_sha256"]:
                entry["content_sha256"] = new_digest
                entry["modified_at"] = TODAY
                changed = True
            if lang == "sk" and filename in PATCHES:
                title_match = re.search(r"<h1\b[^>]*>(.*?)</h1>", raw, re.S | re.I)
                if not title_match:
                    raise ValueError("Missing H1 after copyedit: " + filename)
                entry["title"] = html.unescape(re.sub(r"<[^>]+>", "", title_match.group(1)))
                changed = True
        if changed:
            row.setdefault("notes", []).append(
                "2026-11-17: targeted spelling/style/causal-language copyedit only; "
                "NO new independent full-text scientific review.")
            changed_records.append(row["id"])
    reg_path.write_text(json.dumps(register, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {"date": TODAY, "scope": "language and unverified causal claims only",
              "edited_files": sorted(edited), "updated_source_drafts": sorted(updated_sources),
              "updated_editorial_records": changed_records,
              "new_scientific_review_claim": False, "original_urls_and_publication_dates_preserved": True}
    outfile = ROOT / "journal-reports" / ("targeted-copyedit-" + TODAY + ".json")
    outfile.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()
