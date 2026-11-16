"""Stable, readable public URLs for new WEBU Journal publications."""
import re
import unicodedata

def slugify(title):
    value = unicodedata.normalize("NFKD", str(title)).encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:76].rstrip("-") or "clanok"

def article_names(source):
    editorial = source.get("editorial") or {}
    sk = (editorial.get("languages") or {}).get("sk") or {}
    title = sk.get("title") or source["title"]
    stem = "blog-journal-" + slugify(title)
    return stem + ".html", stem + "-en.html"
