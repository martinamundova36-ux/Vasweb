"""Stable, readable public URLs for new WEBU Journal publications."""
import re
import unicodedata
from urllib.parse import urlsplit

def recorded_article_names(source):
    """Keep URLs immutable after publication, including headline copyedits."""
    urls = source.get("published_urls")
    if not source.get("published_at") or not isinstance(urls, list) or len(urls) != 2:
        return None
    paths = []
    for url in urls:
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.netloc != "www.webu.sk" or parts.query or parts.fragment:
            return None
        path = parts.path.lstrip("/")
        if "/" in path or not path.startswith("blog-journal-") or not path.endswith(".html"):
            return None
        paths.append(path)
    if paths[1] != paths[0][:-5] + "-en.html":
        return None
    return tuple(paths)

def slugify(title):
    value = unicodedata.normalize("NFKD", str(title)).encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:76].rstrip("-") or "clanok"

def article_names(source):
    pinned = recorded_article_names(source)
    if pinned:
        return pinned
    editorial = source.get("editorial") or {}
    sk = (editorial.get("languages") or {}).get("sk") or {}
    title = sk.get("title") or source["title"]
    stem = "blog-journal-" + slugify(title)
    return stem + ".html", stem + "-en.html"
