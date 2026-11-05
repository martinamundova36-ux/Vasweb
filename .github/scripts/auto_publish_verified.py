#!/usr/bin/env python3
"""Unattended publication ONLY of fully reviewed, evidence-complete WEBU drafts.

Never promotes Gemini markdown manuscripts or bibliographic candidates to
scientifically reviewed status. Fails closed when source comparison is absent.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
from zoneinfo import ZoneInfo
from free_journal import validate_editorial

ROOT=Path(__file__).resolve().parents[2]
TODAY=dt.datetime.now(ZoneInfo("Europe/Bratislava")).date().isoformat()

def eligible(root=ROOT):
    paths=[]
    for path in sorted((root/"journal-drafts").glob("*.json")):
        src=json.loads(path.read_text(encoding="utf-8"))
        if src.get("test_only") or src.get("published_at") or src.get("drafted_at")!=TODAY:continue
        try:validate_editorial(src)
        except (ValueError,KeyError,TypeError):continue
        paths.append(path.stem)
    return paths

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test:
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            tmp=Path(folder);(tmp/"journal-drafts").mkdir()
            (tmp/"journal-drafts"/(TODAY+"-abc.json")).write_text(json.dumps({"drafted_at":TODAY,"doi":"10.1234/test"}))
            assert not eligible(tmp), "Unreviewed drafts must never be auto-published"
        print("PASS: fail-closed unattended publication; missing scientific review blocks all new posts")
        return
    published=[];held=[]
    for name in eligible():
        cmd=[sys.executable,str(ROOT/".github/scripts/free_journal.py"),"--action","publish","--draft-id",name]
        env=os.environ.copy();env["WEBU_AUTOPUBLISH_VERIFIED"]="true"
        attempt=subprocess.run(cmd,cwd=ROOT,env=env,text=True,capture_output=True)
        if attempt.returncode:
            held.append({"id":name,"reason":attempt.stderr[-300:] or attempt.stdout[-300:]})
        else:published.append(name)
    pending=0
    for path in (ROOT/"journal-drafts").glob("*.json"):
        source=json.loads(path.read_text())
        pending+=bool(source.get("drafted_at")==TODAY and not source.get("published_at") and not source.get("test_only"))
    print(json.dumps({"date":TODAY,"automatically_published":published,
                      "held_due_to_missing_review_or_gates":pending,
                      "publication_errors":held,"mode":"verified_only"},ensure_ascii=False))
    if held:raise SystemExit("A verified article failed its publication checks")

if __name__=="__main__":main()
