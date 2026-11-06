#!/usr/bin/env python3
"""Keep the five newest published SK/EN Journal stories above older articles.

Reuses each article's existing licensed image and moves the previous featured
cards into the ordinary archive. It is safe to run after every publication.
"""
from pathlib import Path
from urllib.parse import urlsplit
import json
import re

ROOT = Path(__file__).resolve().parents[2]
CARD = re.compile(r'<a class="(?:vw-journal-card|webu-new-story)" href="([^"]+)">.*?</a>', re.S)
OLD_SECTION = re.compile(r'<!-- WEBU-LATEST-IN-LIST(?:-2026-11-05|:AUTOMATED) -->.*?(?=<div class="vw-journal-grid">)', re.S)
PICTURE = re.compile(r'<picture\b.*?</picture>', re.S)
TITLE = re.compile(r'<h3>(.*?)</h3>', re.S)
DESCRIPTION = re.compile(r'<p>(.*?)</p>', re.S)
SMALL = re.compile(r'<small>(.*?)</small>', re.S)


def get_tag(pattern, raw, default=''):
    match = pattern.search(raw)
    return match.group(1) if match else default


def to_archive(raw, href, lang):
    picture = PICTURE.search(raw)
    if not picture:
        raise ValueError('Featured Journal card is missing its image: ' + href)
    picture = picture.group(0).replace('class="webu-new-picture"', 'class="webu-journal-picture"')
    label = get_tag(SMALL, raw, 'Article' if lang == 'en' else 'Článok')
    title = get_tag(TITLE, raw)
    if not title:
        raise ValueError('Journal card is missing its title: ' + href)
    description = get_tag(DESCRIPTION, raw)
    read = 'Read article ↗' if lang == 'en' else 'Čítať článok ↗'
    return (f'<a class="vw-journal-card" href="{href}">{picture}<div>'
            f'<small>{label}</small><h3>{title}</h3>'
            + (f'<p>{description}</p>' if description else '')
            + f'<span>{read}</span></div></a>')


def to_feature(raw, href, lang, date):
    picture = PICTURE.search(raw)
    if not picture:
        raise ValueError('New Journal article is missing its licensed image: ' + href)
    picture = picture.group(0).replace('class="webu-journal-picture"', 'class="webu-new-picture"')
    title = get_tag(TITLE, raw)
    if not title:
        raise ValueError('New Journal article is missing its title: ' + href)
    label = 'NEW ARTICLE' if lang == 'en' else 'NOVÝ ČLÁNOK'
    link = 'Read article ↗' if lang == 'en' else 'Čítať článok ↗'
    return (f'<a class="webu-new-story" href="{href}">{picture}'
            f'<div class="webu-new-card-body"><small>{label} · {date}</small>'
            f'<h3>{title}</h3><span>{link}</span></div></a>')


def published():
    dates = {}
    for path in (ROOT / 'journal-drafts').glob('*.json'):
        source = json.loads(path.read_text(encoding='utf-8'))
        if source.get('published_at') and source.get('editorial'):
            stem = 'blog-journal-review-' + path.stem
            dates[stem] = source['published_at']
    return dates


def sync(root=ROOT):
    dates = published()
    for lang, filename in [('sk', 'blog.html'), ('en', 'blog-en.html')]:
        path = root / filename
        raw = path.read_text(encoding='utf-8')
        old = OLD_SECTION.search(raw)
        if not old:
            raise ValueError(filename + ': featured section markers missing')
        grid_start = raw.find('<div class="vw-journal-grid">', old.end())
        grid_end = raw.find('</div></div></section>', grid_start)
        if grid_start < 0 or grid_end < 0:
            raise ValueError(filename + ': article grid boundaries missing')
        current = raw[grid_start:grid_end]
        cards = {}
        # Archive cards already have an image after journal_images.py runs.
        for match in CARD.finditer(current):
            cards.setdefault(match.group(1), match.group(0))
        # Legacy or previously featured stories remain available in the archive.
        for match in CARD.finditer(old.group(0)):
            href = match.group(1)
            cards.setdefault(href, to_archive(match.group(0), href, lang))
        promoted = [
            href for href in cards
            if (stem := urlsplit(href).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')) in dates
        ]
        promoted.sort(key=lambda href: dates[urlsplit(href).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')], reverse=True)
        promoted = promoted[:5]
        if not promoted:
            raise ValueError(filename + ': no published articles found for newest cards')
        feature = ''.join(
            to_feature(cards[href], href, lang, dates[urlsplit(href).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')][8:10]
                       + '.' + dates[urlsplit(href).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')][5:7]
                       + '.' + dates[urlsplit(href).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')][:4])
            for href in promoted
        )
        label = 'Latest articles' if lang == 'en' else 'Najnovšie články'
        count_label = f'{len(promoted)} new topics' if lang == 'en' else f'{len(promoted)} nových tém'
        latest_block = ('<!-- WEBU-LATEST-IN-LIST:AUTOMATED -->'
                        f'<div class="webu-latest-label"><strong>{label}</strong><span>{count_label}</span></div>'
                        f'<div class="webu-new-grid">{feature}</div>')
        archive = ''.join(card for href, card in cards.items() if href not in promoted)
        updated = raw[:old.start()] + latest_block + '<div class="vw-journal-grid">' + archive + raw[grid_end:]
        # The cover follows the most recent publication and its own local photo.
        cover = re.search(r'<a href="[^"]+" class="vw-journal-cover">.*?</a>', updated, re.S)
        if not cover:
            raise ValueError(filename + ': Journal cover missing')
        best = promoted[0]
        pic = PICTURE.search(cards[best]).group(0)
        pic = pic.replace('loading="lazy"', 'loading="eager" fetchpriority="high"')
        title = get_tag(TITLE, cards[best])
        date = dates[urlsplit(best).path.rsplit('/', 1)[-1].removesuffix('.html').removesuffix('-en')]
        date_display = date[8:10] + '.' + date[5:7] + '.' + date[:4]
        top_label = 'FEATURED · ' if lang == 'en' else 'HLAVNÁ TÉMA · '
        read = 'Read article ↗' if lang == 'en' else 'Čítať článok ↗'
        replacement = (f'<a href="{best}" class="vw-journal-cover">{pic}<span>'
                       f'<small>{top_label}{date_display}</small><strong>{title}</strong>'
                       f'<b>{read}</b></span></a>')
        updated = updated[:cover.start()] + replacement + updated[cover.end():]
        # Include all distinct cards, not just the archive.
        updated = re.sub(
            r'(<div class="vw-journal-section-head">.*?</div><span>)\s*\d+\s+(?:články|článkov|articles)',
            lambda m: m.group(1) + str(len(cards)) + (' articles' if lang == 'en' else ' článkov'),
            updated, count=1, flags=re.S)
        path.write_text(updated, encoding='utf-8')
        print(filename, ':', len(promoted), 'new featured stories;', len(cards), 'total articles')


if __name__ == '__main__':
    sync()
