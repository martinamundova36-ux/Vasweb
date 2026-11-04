#!/usr/bin/env python3
"""WEBU Journal static editorial checks. Does not certify scientific validity."""
import json
import os
import subprocess
import re
import sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
DOI = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.I)
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.meta = {}
        self.lang = ""
        self.text = []
        self.schemas = []
        self.in_schema = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.lang = a.get("lang", "")
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "meta" and a.get("name") == "description": self.meta["description"] = a.get("content", "")
        if tag == "script" and a.get("type") == "application/ld+json": self.in_schema = True
    def handle_endtag(self, tag):
        if tag == "script": self.in_schema = False
    def handle_data(self, data):
        if self.in_schema: self.schemas.append(data)
        else: self.text.append(data)

def check(path):
    raw = path.read_text(encoding="utf-8")
    p = Page()
    p.feed(raw)
    errors, warnings = [], []
    def err(msg): errors.append(f"{path.name}: {msg}")
    def warn(msg): warnings.append(f"{path.name}: {msg}")
    expected = "en" if path.stem.endswith("-en") else "sk"
    if p.lang != expected: err(f"HTML lang should be {expected}")
    if not p.meta.get("description", "").strip(): err("missing meta description")
    if not any('schema.org' in s and 'BlogPosting' in s for s in p.schemas): err("missing BlogPosting JSON-LD")
    for schema in p.schemas:
        try:
            j = json.loads(schema)
            if j.get("@type") == "BlogPosting" and not j.get("datePublished"): err("missing datePublished")
        except json.JSONDecodeError: err("invalid JSON-LD")
    if not re.search(r'<link[^>]+rel="canonical"', raw): err("missing canonical")
    if not re.search(r'<link[^>]+hreflang="(sk|en)"', raw): err("missing hreflang")
    pair = path.with_name(path.stem[:-3] + ".html") if expected == "en" else path.with_name(path.stem + "-en.html")
    if not pair.exists(): warn("SK/EN counterpart missing; check translation manually")
    for href in p.links:
        if href.startswith("https://doi.org/"):
            if not DOI.search(href): err("malformed DOI link")
            if href != href.strip(): err("DOI link has whitespace")
        elif href.startswith(("http://", "https://")):
            pass  # External reachability is checked separately, not assumed.
        elif href.startswith(("#", "mailto:", "tel:", "javascript:")): continue
        else:
            local = href.split("#")[0].split("?")[0].lstrip("/")
            if local and not (ROOT / local).exists(): warn(f"local link not found: {local}")
    body = " ".join(p.text)
    if DOI.search(body) and not any("doi.org/" in x for x in p.links): err("DOI mentioned without DOI hyperlink")
    if "doi.org/" not in raw: warn("no DOI reference; manually review whether scientific sourcing is required")
    if not re.search(r'(výskumn|metodik|research|study|štúdi|source|zdroj)', body, re.I):
        warn("no visible research/source context; manual review recommended")
    if re.search(r'(only bibliographic metadata was reviewed|dostupný bol bibliografický záznam)', body, re.I):
        warn("possibly outdated bibliographic-only disclaimer")
    return errors, warnings

def main():
    files = sorted(ROOT.glob("blog*.html"))
    all_errors, all_warnings = [], []
    # Legacy articles receive a non-blocking backlog report. Newly edited
    # blog pages must pass the structural checks before merging.
    gate = "--publish-gate" in sys.argv
    base = os.environ.get("JOURNAL_BASE_SHA", "").strip()
    changed = set()
    if gate:
        result = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, text=True, capture_output=True)
        if result.returncode:
            print("ERROR: cannot determine pending articles:", result.stderr)
            return 2
        changed = {line[3:] for line in result.stdout.splitlines() if len(line) >= 4 and line[3:].startswith("blog") and line[3:].endswith(".html")}
        if not changed:
            print("No new or changed blog HTML files; publication gate passed.")
            return 0
    elif base and re.fullmatch(r"[0-9a-fA-F]{40}", base):
        result = subprocess.run(
            ["git", "diff", "--name-only", base, "HEAD", "--", "blog*.html"],
            cwd=ROOT, text=True, capture_output=True, check=False)
        if result.returncode:
            print("ERROR: cannot determine changed articles:", result.stderr)
            return 2
        changed = set(result.stdout.splitlines())
    for path in files:
        errors, warnings = check(path)
        if path.name in changed:
            all_errors.extend(errors)
        else:
            all_warnings.extend(x.replace("ERROR:", "LEGACY:") for x in errors)
        all_warnings.extend(warnings)
    print(f"Checked {len(files)} blog HTML files; enforced changed files: {len(changed)}")
    for item in all_errors: print("ERROR:", item)
    for item in all_warnings: print("WARNING:", item)
    print(f"Blocking errors: {len(all_errors)}; warnings/backlog: {len(all_warnings)}")
    return 1 if all_errors else 0

if __name__ == "__main__": sys.exit(main())
