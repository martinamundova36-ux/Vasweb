#!/usr/bin/env python3
"""Bot notifications and owner decisions for the existing free journal pipeline.

Only data from approval branches is read. Never check out or execute PR code.
GitHub accepting a notification is NOT proof that its email was delivered.
"""
import argparse
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'journal/approval/'
MARKER = '<!-- webu-journal-approval '
ID = re.compile(r'(?:\d{4}-\d{2}-\d{2}-[a-f0-9]{12}|test-notification-\d{4}-\d{2}-\d{2})\Z')


def digest(source):
    return hashlib.sha256(json.dumps(source, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()


def settings():
    return json.loads((ROOT / 'journal-config.json').read_text())['approval_notifications']


def api(path, method='GET', payload=None):
    repo = os.environ['GITHUB_REPOSITORY']
    request = urllib.request.Request('https://api.github.com/repos/' + repo + '/' + path,
        data=json.dumps(payload).encode() if payload is not None else None, method=method,
        headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json',
                 'User-Agent': 'WEBU-Journal-Approval/1.0', 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        return json.loads(body) if body else None


def paged(path):
    values = []
    for page in range(1, 101):
        part = api(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')
        values.extend(part)
        if len(part) < 100:
            return values
    raise ValueError('Pagination limit reached; do not risk duplicate notifications')


def safe_text(value):
    # Source metadata must not notify unrelated people through an injected @mention.
    return str(value).replace('@', '@\u200b').replace('<', '&lt;').replace('>', '&gt;')


def article_title(source):
    return source.get('notification_title') or source.get('editorial', {}).get('languages', {}).get('sk', {}).get('title') or source['title']


def review_status(source):
    if source.get('test_only'):
        return 'TEST: nikdy nepublikovať; skúška upozornenia, nie nový vedecký článok.'
    from free_journal import validate_editorial
    try:
        validate_editorial(source)
    except ValueError as error:
        return 'ČAKÁ NA ODBORNÚ KONTROLU — ' + str(error)
    return 'Redakčný záznam splnil technické podmienky. Nie je to nezávislé vedecké peer review; rozhoduje Martina.'


def preview(source, key):
    lines = ['# ' + safe_text(article_title(source)), '', '**Návrh nie je publikovaný na webe.**', '',
             'DOI: ' + source['url'], '', '## Výsledok kontroly', '', review_status(source), '']
    editorial = source.get('editorial') or {}
    for lang in ('sk', 'en'):
        article = editorial.get('languages', {}).get(lang)
        lines += ['## ' + lang.upper(), '']
        if not article:
            lines += ['Plný redakčný text zatiaľ nie je pripravený. Bibliografický záznam nie je článok pripravený na publikovanie.', '']
            continue
        lines += ['### ' + safe_text(article['title']), '', safe_text(article['lead']), '']
        for section in article.get('sections', []):
            lines += ['### ' + safe_text(section['heading']), '']
            for paragraph in section.get('paragraphs', []):
                lines += [safe_text(paragraph), '']
            lines += ['- ' + safe_text(item) for item in section.get('items', [])] + ['']
    for reference in editorial.get('references', []):
        lines += [safe_text(reference['apa7']), reference['url'], '']
    lines += ['## Bibliografický zdroj', '', safe_text(source['title']),
              safe_text('; '.join(source['authors'])), safe_text(source['venue']),
              safe_text(source['source_date']), source['url'], '',
              'AI pomáha pri redakčnej príprave; technická kontrola nenahrádza odborné posúdenie.', '']
    return '\n'.join(lines)


def body(source, key, sha):
    repo = os.environ['GITHUB_REPOSITORY']
    owner = settings()['owner']
    data = {'id': key, 'source_sha256': digest(source), 'test_only': source.get('test_only') is True}
    annotation = source.get('notification_annotation') or source.get('editorial', {}).get('languages', {}).get('sk', {}).get('description') or 'Nový bibliografický návrh na posúdenie tematickej vhodnosti. Plný článok a odborná kontrola ešte nemusia byť pripravené.'
    return '\n'.join([
        f'{MARKER}{json.dumps(data, sort_keys=True)} -->',
        f'@{owner} — rozhodnutie je priradené tebe.', '',
        '## Článok', safe_text(article_title(source)), '', safe_text(annotation), '',
        '## Vedecký zdroj', safe_text(source['title']), safe_text('; '.join(source['authors'])),
        safe_text(source['venue']) + ' · ' + safe_text(source['source_date']), source['url'], '',
        '## Výsledok vedeckej kontroly', review_status(source), '',
        f'## [Náhľad SK/EN](https://github.com/{repo}/blob/{sha}/journal-drafts/{key}.md)', '',
        '## Rozhodnutie', 'Do komentára tohto Pull Requestu vlož presne jeden príkaz:', '',
        f'- **SCHVÁLIŤ:** `SCHVALIT {sha}`',
        f'- **UPRAVIŤ:** `UPRAVIT {sha}` a na ďalší riadok pripomienky.',
        f'- **ZAMIETNUŤ:** `ZAMIETNUT {sha}`', '',
        'Schválenie platí iba pre túto presnú verziu. Vytvorenie PR, zelené testy ani bežné tlačidlo Merge nepovažujeme za obsahové schválenie.',
        'Publikovať možno len úplný odborne skontrolovaný SK/EN článok po úspešných kontrolách. Testovací návrh sa nikdy nepublikuje.',
        'E-mail môžeš použiť na otvorenie tohto PR; príkaz vlož priamo na GitHub, aby bolo spoľahlivo overené tvoje konto.',
        '', '**Doručenie e-mailu: zatiaľ nepotvrdené.** GitHub priradenie nie je potvrdením doručenia do schránky.',
    ])


def metadata(pr):
    match = re.search(re.escape(MARKER) + r'(\{[^\n]+\}) -->', pr.get('body') or '')
    if not match:
        raise ValueError('Not a WEBU approval request')
    data = json.loads(match.group(1))
    if not ID.fullmatch(data.get('id', '')):
        raise ValueError('Invalid draft identifier')
    return data


def branch_snapshot(source, key, branch):
    main = api('git/ref/heads/main')['object']['sha']
    try:
        parent = api('git/ref/heads/' + urllib.parse.quote(branch, safe='/'))['object']['sha']
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        parent = main
    tree = api('git/commits/' + parent)['tree']['sha']
    entries = [{'path': f'journal-drafts/{key}.{suffix}', 'mode': '100644', 'type': 'blob', 'content': content}
               for suffix, content in [('json', json.dumps(source, ensure_ascii=False, indent=2) + '\n'),
                                       ('md', preview(source, key))]]
    tree_sha = api('git/trees', 'POST', {'base_tree': tree, 'tree': entries})['sha']
    commit = api('git/commits', 'POST', {'message': 'Prepare WEBU article for owner decision: ' + key,
                                      'tree': tree_sha, 'parents': [parent]})['sha']
    if parent == main:
        # Existing branches are re-read before mutation; never force a branch.
        try:
            api('git/refs', 'POST', {'ref': 'refs/heads/' + branch, 'sha': commit})
        except urllib.error.HTTPError as error:
            if error.code != 422:
                raise
            current = api('git/ref/heads/' + urllib.parse.quote(branch, safe='/'))['object']['sha']
            if current != parent:
                raise ValueError('Approval branch changed; retry after inspection')
            api('git/refs/heads/' + urllib.parse.quote(branch, safe='/'), 'PATCH', {'sha': commit})
    else:
        api('git/refs/heads/' + urllib.parse.quote(branch, safe='/'), 'PATCH', {'sha': commit})
    return commit


def notify(test=False):
    config = settings()
    if os.environ.get('GITHUB_REPOSITORY_OWNER') != config['owner']:
        raise ValueError('Unexpected repository owner')
    requests = paged('pulls?state=all&sort=created&direction=desc')
    by_branch = {pr['head']['ref']: pr for pr in requests if pr['head']['ref'].startswith(PREFIX)}
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    count = sum(pr['created_at'].startswith(today) and pr['head']['ref'].startswith(PREFIX) for pr in requests)
    sources = []
    if test:
        # Verified existing bibliography reused explicitly as a notification fixture.
        source = json.loads((ROOT / 'journal-drafts/2026-11-04-93b063fd01b6.json').read_text())
        source.pop('published_at', None)
        source.pop('published_urls', None)
        source['test_only'] = True
        source['notification_title'] = 'TEST – AI vo firme: merajte prínosy aj obavy ľudí'
        source['notification_annotation'] = 'Skúška e-mailového schvaľovania. Tento návrh nie je nový článok a nemôže sa publikovať. Po prijatí upozornenia potvrď jeho doručenie.'
        sources = [(config['test_id'], source)]
    else:
        for path in sorted((ROOT / 'journal-drafts').glob('*.json')):
            source = json.loads(path.read_text())
            if source.get('published_at') or source.get('test_only') or not ID.fullmatch(path.stem):
                continue
            if path.stem in config.get('legacy_draft_ids', []) and PREFIX + path.stem not in by_branch:
                continue
            sources.append((path.stem, source))
    results = []
    for key, source in sources:
        branch = PREFIX + key
        previous = by_branch.get(branch)
        if previous:
            data = metadata(previous)
            if data['source_sha256'] == digest(source) or previous['state'] == 'closed':
                if previous['state'] == 'open' and config['owner'] not in [a['login'] for a in previous.get('assignees', [])]:
                    api('issues/' + str(previous['number']) + '/assignees', 'POST', {'assignees': [config['owner']]})
                if test and previous['state'] == 'open' and previous['user']['login'] == config['owner']:
                    # Free fallback for a test PR opened through the owner's connector:
                    # a single bot comment is another person's activity, not self-activity.
                    marker = '<!-- webu-test-email-notice -->'
                    comments = paged('issues/' + str(previous['number']) + '/comments')
                    if not any(marker in c.get('body', '') for c in comments):
                        api('issues/' + str(previous['number']) + '/comments', 'POST', {'body': marker + '\n@' + config['owner'] + '\n\n' + body(source, key, previous['head']['sha'])})
                continue
        elif count >= min(5, config['max_new_requests_per_day']):
            break
        sha = branch_snapshot(source, key, branch)
        payload = {'title': ('WEBU Journal – Na schválenie: ' + article_title(source))[:256],
                   'body': body(source, key, sha)}
        if previous:
            pr = api('pulls/' + str(previous['number']), 'PATCH', payload)
        else:
            pr = api('pulls', 'POST', dict(payload, head=branch, base='main', draft=False))
            count += 1
        if config['owner'] not in [a['login'] for a in pr.get('assignees', [])]:
            api('issues/' + str(pr['number']) + '/assignees', 'POST', {'assignees': [config['owner']]})
        results.append({'pr': pr['number'], 'url': pr['html_url'], 'head_sha': sha,
                        'test_only': test, 'email_delivery': 'not confirmed'})
    print(json.dumps({'approval_requests': results, 'email_delivery': 'not confirmed'}, ensure_ascii=False))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as stream:
            stream.write('## WEBU – žiadosti o rozhodnutie\n')
            stream.write('\n'.join(f"- [PR #{r['pr']}]({r['url']})" for r in results) or 'Žiadny nový alebo zmenený návrh; bez opakovaného upozornenia.')
            stream.write('\n\nDoručenie e-mailu nie je potvrdené API odpoveďou.\n')
    return results


def parse_decision(event, owner):
    comment = event.get('comment') or {}
    if comment.get('user', {}).get('login') != owner or 'pull_request' not in event.get('issue', {}):
        raise ValueError('Only the named owner may decide on a pull request')
    lines = comment.get('body', '').strip().splitlines()
    match = re.fullmatch(r'(SCHVALIT|SCHVÁLIŤ|UPRAVIT|UPRAVIŤ|ZAMIETNUT|ZAMIETNUŤ) ([a-f0-9]{40})', lines[0] if lines else '', re.I)
    if not match:
        return None
    action = {'SCHVÁLIŤ': 'SCHVALIT', 'UPRAVIŤ': 'UPRAVIT', 'ZAMIETNUŤ': 'ZAMIETNUT'}.get(match[1].upper(), match[1].upper())
    return action, match[2]


def output(name, value):
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
            stream.write(name + '=' + str(value) + '\n')


def validate_pr(pr, key, sha, owner):
    repo = os.environ['GITHUB_REPOSITORY']
    if pr['state'] != 'open' or pr['head']['sha'] != sha or pr['base']['ref'] != 'main':
        raise ValueError('Closed request or stale decision; use current head SHA')
    if pr['head']['repo']['full_name'] != repo or pr['base']['repo']['full_name'] != repo or pr['head']['ref'] != PREFIX + key:
        raise ValueError('Unexpected approval branch or repository')
    if pr['user']['login'] != 'github-actions[bot]' and not (key.startswith('test-notification-') and pr['user']['login'] == owner):
        raise ValueError('Unexpected approval request author')


def decide(event):
    owner = settings()['owner']
    decision = parse_decision(event, owner)
    if decision is None:
        print('No decision command; nothing published')
        return
    action, sha = decision
    number = event['issue']['number']
    pr = api('pulls/' + str(number))
    data = metadata(pr)
    key = data['id']
    validate_pr(pr, key, sha, owner)
    files = paged('pulls/' + str(number) + '/files')
    allowed = {f'journal-drafts/{key}.json', f'journal-drafts/{key}.md'}
    if not files or any(f['filename'] not in allowed or f['status'] == 'removed' for f in files):
        raise ValueError('Approval request may contain only its own draft JSON and preview')
    raw = api('contents/journal-drafts/' + key + '.json?ref=' + sha)
    source = json.loads(base64.b64decode(raw['content']))
    if digest(source) != data['source_sha256']:
        raise ValueError('Draft hash does not match notification')
    records = ROOT / 'journal-reports/approval-decisions'
    records.mkdir(parents=True, exist_ok=True)
    record_path = records / f'{number}-{sha}.json'
    if record_path.exists():
        raise ValueError('This version already has a recorded decision; revise the article before deciding again')
    if data['test_only'] or source.get('test_only'):
        api('issues/' + str(number) + '/comments', 'POST', {'body': 'TEST: príkaz bol rozpoznaný od vlastníčky. Publikovanie je natrvalo zablokované pre tento testovací návrh.'})
        output('test_only', 'true')
        return
    local = ROOT / 'journal-drafts' / (key + '.json')
    if not local.exists() or digest(json.loads(local.read_text())) != digest(source):
        raise ValueError('Main draft changed since notification; refresh the PR before approval')
    record = {'pr': number, 'head_sha': sha, 'source_sha256': data['source_sha256'],
              'action': action, 'actor': owner, 'comment_id': event['comment']['id'],
              'comment_url': event['comment']['html_url'], 'recorded_at': dt.datetime.now(dt.timezone.utc).isoformat()}
    if action == 'SCHVALIT':
        from free_journal import validate_editorial
        editorial = validate_editorial(source)
        record['bilingual_content_sha256'] = editorial['content_sha256']
        # The existing free pipeline performs fresh bibliography/integrity/source/image/SEO gates.
        subprocess.run([sys.executable, str(ROOT / '.github/scripts/free_journal.py'),
                        '--action', 'publish', '--draft-id', key], cwd=ROOT, check=True)
        record['published_urls'] = json.loads(local.read_text())['published_urls']
        output('publish', 'true')
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    output('pr_number', number)
    output('action', action)
    print(json.dumps(record, ensure_ascii=False))


def finish(number, success=True):
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    if parse_decision(event, settings()['owner']) is None:
        return
    sha = parse_decision(event, settings()['owner'])[1]
    path = ROOT / 'journal-reports/approval-decisions' / f'{number}-{sha}.json'
    if not path.exists():
        message = 'Rozhodnutie nespôsobilo publikovanie. Kontrola zlyhala; pozri príslušný Actions beh. Zelené technické testy samy neznamenajú odborné schválenie.'
    else:
        record = json.loads(path.read_text())
        if record['action'] == 'UPRAVIT':
            message = 'UPRAVIŤ: návrh zostáva nepublikovaný. Zapracujte pripomienky do pôvodného návrhu; nová verzia potrebuje nové výslovné schválenie.'
        elif record['action'] == 'ZAMIETNUT':
            message = 'ZAMIETNUTÉ: návrh nebol publikovaný.'
        elif success:
            message = 'SCHVÁLENÉ vlastníčkou a nasadené po úspešných kontrolách:\n' + '\n'.join(record['published_urls'])
        else:
            message = 'Obsah bol schválený, ale produkčné nasadenie alebo overenie URL zlyhalo. Stav sa nepovažuje za úspešné publikovanie; skontrolujte Actions a použite existujúci režim deploy.'
    marker = f'<!-- webu-decision-result {sha} {success} -->'
    if any(marker in c.get('body', '') for c in paged('issues/' + str(number) + '/comments')):
        return
    api('issues/' + str(number) + '/comments', 'POST', {'body': marker + '\n' + message})
    if path.exists() and (record['action'] == 'ZAMIETNUT' or (record['action'] == 'SCHVALIT' and success)):
        api('pulls/' + str(number), 'PATCH', {'state': 'closed'})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['notify', 'notify-test', 'decide', 'finish'], required=True)
    parser.add_argument('--pr-number', type=int)
    parser.add_argument('--failed', action='store_true')
    args = parser.parse_args()
    if args.action in ('notify', 'notify-test'):
        notify(args.action == 'notify-test')
    elif args.action == 'decide':
        decide(json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text()))
    elif args.pr_number:
        finish(args.pr_number, not args.failed)


if __name__ == '__main__':
    main()
