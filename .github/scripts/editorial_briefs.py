#!/usr/bin/env python3
"""Prepare bilingual source-specific editorial briefs, never scientific findings.

A brief is not a ready-for-approval article. No findings, samples or causal
claims are inferred from a DOI, a title or bibliographic metadata.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
MARKER = '<!-- WEBU-EDITORIAL-BRIEF-V1 -->'
CATEGORIES = [
    ('ai', ('artificial intelligence', ' ai ', 'chatgpt', 'machine learning'),
     'AI v podnikaní', 'AI in business',
     'Ktorá konkrétna pracovná úloha by sa mala porovnať pred nasadením AI a po ňom?',
     'Which work task should be measured before and after adopting AI?'),
    ('leadership', ('leadership', 'leader', 'organizational', 'employee', 'work behavior', 'human capital'),
     'Vedenie ľudí a pracovné prostredie', 'Leadership and work',
     'Ako by sa dal prakticky odlíšiť vplyv vedenia od ďalších podmienok tímu?',
     'How could leadership effects be distinguished from other team conditions?'),
    ('marketing', ('marketing', 'brand', 'loyalty', 'engagement', 'consumer', 'customer'),
     'Marketing a dôvera zákazníkov', 'Marketing and customer trust',
     'Aký ukazovateľ dôvery alebo spokojnosti je možné merať bez zavádzajúcich záverov?',
     'What trustworthy measure of trust or satisfaction could be tracked?'),
    ('digital', ('digital', 'ecommerce', 'e-commerce', 'website', 'innovation'),
     'Digitálne podnikanie', 'Digital business',
     'Ktoré zmeny na webe alebo v procese sa dajú otestovať na malej vzorke?',
     'Which website or process changes could be piloted at small scale?'),
]
DEFAULT = ('Podnikanie a výskum', 'Business and research',
           'Ktoré praktické rozhodnutie by mohol tento zdroj informovať?',
           'Which practical decision could this source help inform?')

def category(source):
    haystack = ' ' + str(source.get('title', '')).casefold() + ' '
    for _, tokens, sk, en, question_sk, question_en in CATEGORIES:
        if any(token in haystack for token in tokens):
            return sk, en, question_sk, question_en
    return DEFAULT

def brief(source):
    sk, en, qsk, qen = category(source)
    title = source.get('title', '').strip()
    url = source.get('url', '').strip()
    authors = ', '.join(source.get('authors', []))
    date = source.get('source_date', 'neuvedený')
    venue = source.get('venue', 'neuvedené')
    if not title or not url.startswith('https://doi.org/'):
        raise ValueError('Missing authoritative source identity')
    return '\n'.join([
        MARKER, '',
        '# WEBU Journal — redakčný podklad / editorial brief', '',
        '**Stav / Status:** NIE JE HOTOVÝ ČLÁNOK / NOT A FINISHED ARTICLE.', '',
        '## SK — ' + sk, '',
        '**Pracovný námet:** ' + title, '',
        '**Identifikácia zdroja:** ' + authors + ' (' + date + '). ' + venue + '. ' + url, '',
        '### Osnova pre autora', '',
        '1. Čitateľský problém a jeho význam pre malé podnikanie.',
        '2. Čo skúmal primárny zdroj: doplniť až po kontrole celého textu.',
        '3. Výskumný dizajn, vzorka, merania a štatistika: zatiaľ NEOVERENÉ.',
        '4. Čo možno a nemožno z výsledkov vyvodzovať: vyplní odborný redaktor.',
        '5. Praktické odporúčania WEBU označené ako vlastná redakčná interpretácia.',
        '6. Limity, alternatívne vysvetlenia a zdroje podľa APA 7.', '',
        '**Otázka pre čitateľa:** ' + qsk, '',
        '## EN — ' + en, '',
        '**Working topic:** ' + title, '',
        '**Source identity:** ' + authors + ' (' + date + '). ' + venue + '. ' + url, '',
        '### Author outline', '',
        '1. Reader problem and relevance to small businesses.',
        '2. What the primary study investigated: add only after checking full text.',
        '3. Design, sample, measurements and statistics: NOT YET VERIFIED.',
        '4. Supported and unsupported interpretations: editorial verification needed.',
        '5. WEBU practical suggestions clearly distinguished from research results.',
        '6. Limitations, alternatives and APA 7 references.', '',
        '**Reader question:** ' + qen, '',
        '## Pred publikovaním / Before publication', '',
        '- Skontrolovať plný text, metodiku, skutočné výsledky a opravy/retrakcie.',
        '- Verify full text, methods, real findings and corrections/retractions.',
        '- Napísať plnohodnotný originálny článok SK a EN a overiť tvrdenia oproti zdroju.',
        '- Write full original SK and EN articles; compare every research claim to the source.',
        '- Zachovať existujúcu odbornú kontrolu a schvaľovanie vlastníčkou.',
        '- Keep the existing scientific review and owner-approval gates.', ''
    ])

def run(root=ROOT, day=None):
    day = day or dt.datetime.now(ZoneInfo('Europe/Bratislava')).date().isoformat()
    folder = root / 'journal-drafts'
    changed = 0
    for path in sorted(folder.glob('*.json')):
        source = json.loads(path.read_text(encoding='utf-8'))
        if source.get('test_only') or source.get('published_at'):
            continue
        if source.get('drafted_at') != day:
            continue
        md = path.with_suffix('.md')
        old = md.read_text(encoding='utf-8') if md.exists() else ''
        if MARKER in old:
            continue
        md.write_text(old.rstrip() + '\n\n' + brief(source), encoding='utf-8')
        changed += 1
    print(json.dumps({'date': day, 'new_briefs': changed, 'publication': 'none'}))
    return changed

def self_test():
    source = {
        'title': 'Leadership and innovative work behavior',
        'authors': ['Example Author'], 'source_date': '2026-11-05',
        'venue': 'Test Journal', 'url': 'https://doi.org/10.1234/example',
        'drafted_at': '2026-11-05'
    }
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as temp:
        root = Path(temp)
        (root / 'journal-drafts').mkdir()
        path = root / 'journal-drafts/sample.json'
        path.write_text(json.dumps(source))
        assert run(root, '2026-11-05') == 1
        rendered = path.with_suffix('.md').read_text()
        assert '## SK' in rendered and '## EN' in rendered
        assert 'NEOVERENÉ' in rendered and 'NOT YET VERIFIED' in rendered
        assert source['url'] in rendered
        assert run(root, '2026-11-05') == 0
        assert path.with_suffix('.md').read_text() == rendered
    print('PASS: bilingual metadata-only briefs; idempotent; no findings or publication')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        run()
