#!/usr/bin/env python3
"""One-time, source-checked replacement of misleading WEBU Journal photographs.

This runs inside the existing GitHub Actions publication environment, using
Pillow and Pexels' free, attributed photographs. No paid image/AI API is used.
The replacement is atomic at the workflow level: if any download or validation
fails, nothing is committed. Existing publication URLs and scientific texts stay.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".github/scripts"))
import journal_images as images

# Verified Pexels source pages, credited creators and subject-specific alt texts.
# Each photo is used by just one bilingual article pair.
REPLACEMENTS = {
    "blog-journal-rovnovaha-medzi-pracou-a-sukromnym-zivotom-co-ukazuje-studia-z-kene-o-pracov.html": (
        "10.68715/3enhj493",
        ("4473903", "photo-of-mother-working-at-home", "Ketut Subiyanto",
         "workplace", "Matka pracuje na notebooku doma vedľa dieťaťa",
         "Mother working on a laptop at home beside her child")),
    "blog-journal-employer-branding-a-dostojna-praca-porovnanie-itc-limited-a-icici-bank.html": (
        "10.46281/ijmri-2026-11-01-01",
        ("7433835", "employees-having-a-meeting-at-the-office", "Vlada Karpovich",
         "workplace", "Zamestnanci spolupracujú na pracovnom stretnutí",
         "Employees collaborating at an office meeting")),
    "blog-journal-digitalna-kolposkopia-telemedicina-a-umela-inteligencia-v-modernom-skriningu.html": (
        "10.17816/aog713820",
        ("7088485", "photo-of-an-ob-gyn-looking-in-the-monitor", "MART PRODUCTION",
         "workplace", "Gynekologička sleduje diagnostický obraz na monitore",
         "Gynecologist reviewing a diagnostic image on a monitor")),
    "blog-journal-dopad-vybavovania-reklamacii-na-spravanie-klientov-co-odhaluje-nova-studia-z.html": (
        "10.46281/ijmri-2026-11-01-02",
        ("30719169", "smiling-bank-employee-at-bbva-reception-desk", "David Toledo",
         "business", "Pracovník banky v klientskom centre",
         "Bank employee in a customer-facing branch")),
    "blog-journal-buducnost-b2b-marketingu-ako-ai-meni-pravidla-hry.html": (
        "10.1108/jbim-12-2025-1262",
        ("7988219", "people-having-a-business-meeting-in-the-office", "Mikhail Nilov",
         "business", "Obchodný tím na pracovnej porade",
         "Business team taking part in a strategy meeting")),
    "blog-journal-etika-v-potravinarstve-a-lojalita-zakaznikov-co-hovori-novy-vyskum-o-vztahoc.html": (
        "10.1108/ijoa-03-2026-6639",
        ("8877381", "women-sorting-tomatoes-on-a-production-line", "Mark Stebnicki",
         "business", "Kontrola kvality pri triedení paradajok v potravinárstve",
         "Food industry workers sorting tomatoes for quality control")),
    # 18 Nov 2026: replace a wrongly labelled photograph of political leaders.
    "blog-journal-ai-v-malych-firmach-co-rozhoduje-o-uspechu.html": (
        "10.1007/s44163-026-01460-4",
        ("7526590", "business-people-in-a-business-meeting", "Farhan Alkhaled",
         "workplace", "Pracovný tím spolupracuje na notebookoch v modernej kancelárii",
         "Office team collaborating on laptops in a modern workplace")),
    # Replace an irrelevant picture of goats with a real finance desk.
    "blog-journal-financna-flexibilita-malych-firiem-v-strednej-europe.html": (
        "10.1108/CEMJ-01-2026-0005",
        ("33175669", "office-desk-with-calculator-and-financial-report", "Bia Limova",
         "pricing", "Finančný výkaz a kalkulačka pri práci s rozpočtom firmy",
         "Financial report and calculator on a business desk")),
    # Replace an irrelevant grocery bus interior with actual business analytics.
    "blog-journal-ai-v-marketingu-malych-firiem-co-naozaj-funguje.html": (
        "10.1057/s41270-026-00539-2",
        ("7651734", "business-people-working-together-in-front-of-their-laptops", "Kindel Media",
         "analytics", "Podnikateľský tím vyhodnocuje marketingové dáta a grafy",
         "Business team examining marketing data and charts")),
    # Replace a diplomatic news photograph with a customer service scene.
    "blog-journal-recenzie-zakaznikov-a-opakovany-nakup.html": (
        "10.1177/00222429251352842",
        ("7709306", "a-woman-working-as-a-call-center-agent", "MART PRODUCTION",
         "trust", "Pracovníčka zákazníckeho servisu vybavuje zákaznícke požiadavky",
         "Customer service professional assisting clients on a laptop")),
    # Remove unsuitable image of a criminal investigation from AI productivity research.
    "blog-journal-ai-asistent-produktivita-programatorov-tri-experimenty.html": (
        "10.1287/mnsc.2025.00535",
        ("7988114", "a-person-using-laptop", "Mikhail Nilov",
         "ai", "Vývojár pracuje s programovým kódom na notebooku",
         "Software developer writing code on a laptop")),
}

def main():
    data = images.load(ROOT)
    used = set(data["assignments"].values())
    count = 0
    for article, (doi, record) in REPLACEMENTS.items():
        sk_file = ROOT / article
        en_file = ROOT / article.replace(".html", "-en.html")
        if not sk_file.is_file() or not en_file.is_file():
            raise RuntimeError("Missing bilingual article: " + article)
        # A source-matched replacement must never be silently attached to a
        # different study if an article or the review mapping changes.
        if any("doi.org/" + doi.lower() not in path.read_text().lower() for path in (sk_file, en_file)):
            raise RuntimeError("Photo replacement DOI does not match bilingual article: " + article)
        expected_new = "pexels-" + record[0]
        old_id = data["assignments"].get(article)
        if old_id == expected_new:
            print("Already corrected:", article)
            continue
        if not old_id:
            raise RuntimeError("Missing existing catalogue assignment: " + article)
        if expected_new in used:
            raise RuntimeError("A replacement photograph is already assigned elsewhere: " + expected_new)
        images.CURATED_PEXELS[doi.lower()] = record
        photo = images.acquire_curated_pexels_photo({"doi": doi}, data, ROOT)
        if not photo or photo["id"] != expected_new:
            raise RuntimeError("Verified free Pexels photograph unavailable: " + article)
        for old in data["photos"]:
            if old["id"] == old_id:
                old["excluded_from_reuse"] = True
                old["excluded_reason"] = "2026-11-17 editorial review: photo unrelated to the study topic"
                break
        data["assignments"][article] = photo["id"]
        used.add(photo["id"])
        count += 1
    # Quarantine known political images so no future Journal article can reuse them.
    # An older assignment points to a non-existent article; remove only that orphan.
    for photo in data["photos"]:
        src = (photo.get("source_page") or "").lower()
        if any(term in src for term in ("president_trump", "zelenskyy", "trump_clashes")):
            photo["excluded_from_reuse"] = True
            photo["excluded_reason"] = "Editorial policy: political photograph unrelated to business research"
    for article, photo_id in list(data["assignments"].items()):
        item = next((photo for photo in data["photos"] if photo["id"] == photo_id), None)
        if item and item.get("excluded_from_reuse"):
            if (ROOT / article).is_file():
                raise RuntimeError("Political or excluded photograph still assigned to a published article: " + article)
            del data["assignments"][article]
            print("Removed orphaned banned photo assignment:", article)
    images.save(data, ROOT)
    # Re-render both article heroes and listing cards. prepare_journal updates
    # OG/Twitter/BlogPosting image metadata and keeps the same canonical URLs.
    subprocess.run([sys.executable, str(ROOT / ".github/scripts/prepare_journal.py")],
                   cwd=ROOT, check=True)
    print("Replaced misleading bilingual Journal photos:", count)

if __name__ == "__main__":
    main()
