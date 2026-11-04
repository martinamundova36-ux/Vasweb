#!/usr/bin/env python3
"""Keep the WEBU favicon discoverable on every published HTML page."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
icon=root/"favicon.svg"
if not icon.is_file():raise SystemExit("Missing favicon.svg")
count=0
for p in root.rglob("*.html"):
    if p.name.lower().startswith("google") or ".git" in p.parts:continue
    s=p.read_text(encoding="utf-8")
    if not re.search(r"</head>",s,re.I):continue
    s=re.sub(r'<link\b[^>]*\brel=["\'](?:shortcut icon|icon|apple-touch-icon)["\'][^>]*>',"",s,flags=re.I)
    s=re.sub(r'<link\b[^>]*\bhref=["\'][^"\']*favicon\.(?:svg|ico|png)["\'][^>]*>',"",s,flags=re.I)
    links='<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png"><link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png"><link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png"><link rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png"><link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">'
    s=re.sub(r"</head>",links+"</head>",s,count=1,flags=re.I)
    p.write_text(s,encoding="utf-8")
    count+=1
print("WEBU favicon linked in",count,"HTML pages")
