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
from zoneinfo import ZoneInfo

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
    data = {'id': key, 'head_sha': sha, 'source_sha256': digest(source), 'test_only': source.get('test_only') is True}
    annotation = source.get('notification_annotation') or source.get('editorial', {}).get('languages', {}).get('sk', {}).get('description') or 'Nový bibliografický návrh na posúdenie tematickej vhodnosti. Plný článok a odborná kontrola ešte nemusia byť pripravené.'
    if source.get('test_only'):
        annotation = 'Skúška jednoduchého schvaľovania. Tento návrh sa nezverejní.'
    return '\n'.join([
        f'{MARKER}{json.dumps(data, sort_keys=True)} -->',
        '**' + safe_text(article_title(source)) + '**', '', safe_text(annotation), '',
        f'**[Prečítať článok SK / EN](https://github.com/{repo}/blob/{sha}/journal-drafts/{key}.md)**', '',
        'Odpovedz na tento e-mail alebo pridaj komentár na GitHub jedným slovom:', '',
        '**SCHVÁLIŤ · UPRAVIŤ · ZAMIETNUŤ**', '',
        'Pri úprave pripíš, čo chceš zmeniť. Zdroj, DOI a výsledok kontroly nájdeš v náhľade.', '',
        ('**TEST — nič sa nezverejní.**' if source.get('test_only') else
         '**Stav:** ' + ('Pripravené na tvoje rozhodnutie.' if source.get('editorial', {}).get('status') == 'ready_for_owner_approval' and review_status(source).startswith('Redakčný záznam') else 'Čaká na odbornú kontrolu; zatiaľ sa nemôže publikovať.')),
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
    zone = ZoneInfo('Europe/Bratislava')
    today = dt.datetime.now(zone).date()
    count = sum(dt.datetime.fromisoformat(pr['created_at'].replace('Z', '+00:00')).astimezone(zone).date() == today and pr['head']['ref'].startswith(PREFIX) for pr in requests)
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
            if (source.get('editorial') or {}).get('status')=='automated_abstract_editorial':
                continue  # Automatic manuscripts are never sent for owner approval.
            if config.get('ready_articles_only'):
                from free_journal import validate_editorial
                try:
                    validate_editorial(source)
                except ValueError:
                    continue  # Bibliography is not a complete article to send for publication approval.
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
                    if os.environ.get('RESEND_TEST_NOTICE') == 'true':
                        if os.environ.get('GITHUB_EVENT_NAME') != 'workflow_dispatch' or os.environ.get('GITHUB_ACTOR') != config['owner'] or not os.environ.get('GITHUB_RUN_ID', '').isdigit():
                            raise ValueError('Resending a test notice requires an explicit owner workflow dispatch')
                        marker = '<!-- webu-test-email-notice resend ' + os.environ['GITHUB_RUN_ID'] + ' -->'
                    comments = paged('issues/' + str(previous['number']) + '/comments')
                    if not any(marker in c.get('body', '') for c in comments):
                        api('issues/' + str(previous['number']) + '/comments', 'POST', {'body': marker + '\n' + body(source, key, previous['head']['sha'])})
                continue
        elif count >= min(5, config['max_new_requests_per_day']):
            break
        sha = branch_snapshot(source, key, branch)
        payload = {'title': ('WEBU Journal – Na schválenie: ' + article_title(source))[:256],
                   'body': body(source, key, sha)}
        if previous:
            pr = api('pulls/' + str(previous['number']), 'PATCH', payload)
        else:
            pr = api('pulls', 'POST', dict(payload, head=branch, base='main', draft=True))
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
    match = re.fullmatch(r'(SCHVALIT|SCHVÁLIŤ|SÚHLASÍM|SUHLASIM|UPRAVIT|UPRAVIŤ|ZAMIETNUT|ZAMIETNUŤ)(?: ([a-f0-9]{40}))?', lines[0].strip() if lines else '', re.I)
    if not match:
        return None
    action = {'SCHVÁLIŤ': 'SCHVALIT', 'SÚHLASÍM': 'SCHVALIT', 'SUHLASIM': 'SCHVALIT', 'UPRAVIŤ': 'UPRAVIT', 'ZAMIETNUŤ': 'ZAMIETNUT'}.get(match[1].upper(), match[1].upper())
    return action, match[2]


def decision_version(event, pr, data, explicit_sha=None):
    if explicit_sha:
        return explicit_sha  # Backward-compatible replies to the original test email.
    sha = data.get('head_sha')
    if not sha or sha != pr['head']['sha']:
        raise ValueError('Notification version is stale; refresh the article before deciding')
    # Bind a one-word decision to the current notified version, without exposing
    # machine identifiers. A branch changed after the comment cannot be approved.
    commit = api('git/commits/' + sha)
    comment_time = dt.datetime.fromisoformat(event['comment']['created_at'].replace('Z', '+00:00'))
    commit_time = dt.datetime.fromisoformat(commit['committer']['date'].replace('Z', '+00:00'))
    if commit_time >= comment_time:
        raise ValueError('Article version changed during or after the decision; decide again on the refreshed article')
    return sha


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
    action, explicit_sha = decision
    number = event['issue']['number']
    pr = api('pulls/' + str(number))
    data = metadata(pr)
    key = data['id']
    sha = decision_version(event, pr, data, explicit_sha)
    validate_pr(pr, key, sha, owner)
    output('head_sha', sha)
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
        marker = '<!-- webu-test-decision ' + str(event['comment']['id']) + ' -->'
        if not any(marker in c.get('body', '') for c in paged('issues/' + str(number) + '/comments')):
            api('issues/' + str(number) + '/comments', 'POST', {'body': marker + '\nTvoje „súhlasím“ bolo prijaté. Test schvaľovania prešiel; testovací článok sa nezverejní.'})
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
        merge_approved_draft(sha)
        record['merge_parent_sha'] = sha
        # The existing free pipeline performs fresh bibliography/integrity/source/image/SEO gates.
        subprocess.run([sys.executable, str(ROOT / '.github/scripts/free_journal.py'),
                        '--action', 'publish', '--draft-id', key], cwd=ROOT, check=True)
        record['published_urls'] = json.loads(local.read_text())['published_urls']
        output('publish', 'true')
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    output('pr_number', number)
    output('action', action)
    print(json.dumps(record, ensure_ascii=False))


def merge_approved_draft(sha):
    """Stage only the validated JSON/Markdown branch, never execute PR code.

    The workflow commits this merge together with the generated pages only after
    all publication checks pass. On failure nothing is pushed to main.
    """
    if not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('Invalid approved merge parent')
    subprocess.run(['git', 'fetch', '--no-tags', 'origin', sha], cwd=ROOT, check=True)
    subprocess.run(['git', '-c', 'user.name=WEBU Journal Bot', '-c',
        'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'merge', '--no-ff', '--no-commit', sha], cwd=ROOT, check=True)


def commit_decision():
    """Bounded optimistic retry when two different approved PRs update main.

    Rebuild and revalidate on the fresh base, rather than silently merging stale
    generated listings. A network/permission error on an unchanged base stops.
    """
    def git(*args, check=True):
        return subprocess.run(['git', *args], cwd=ROOT, check=check,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    if parse_decision(event, settings()['owner']) is None:
        raise ValueError('An explicit owner decision is required before committing')
    git('config', 'user.name', 'WEBU Journal Bot')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    for attempt in range(3):
        base = git('rev-parse', 'HEAD').stdout.strip()
        paths = ['journal-drafts', 'journal-reports', 'sitemap.xml', 'journal-images.json']
        paths += [str(path.relative_to(ROOT)) for path in ROOT.glob('blog*.html')]
        git('add', '--', *paths)
        if git('diff', '--cached', '--quiet', check=False).returncode == 0:
            return
        git('commit', '-m', 'Merge and publish explicitly approved WEBU draft' if (ROOT / '.git/MERGE_HEAD').exists() else 'Record explicit WEBU owner decision')
        committed = git('rev-parse', 'HEAD').stdout.strip()
        if git('push', 'origin', 'HEAD:main', check=False).returncode == 0:
            return
        git('fetch', '--no-tags', 'origin', 'main')
        # A push response can be lost even though GitHub accepted the commit.
        if git('merge-base', '--is-ancestor', committed, 'origin/main', check=False).returncode == 0:
            return
        if git('rev-parse', 'origin/main').stdout.strip() == base or attempt == 2:
            raise ValueError('Push failed or retry budget exhausted; no automatic unreviewed publication')
        git('reset', '--hard', 'origin/main')
        decide(event)  # Re-check the original owner's decision and exact reviewed version.
        for script in ('seo_audit.py', 'journal_image_audit.py', 'journal_review_audit.py'):
            subprocess.run([sys.executable, 'scripts/' + script], cwd=ROOT, check=True)
        subprocess.run([sys.executable, 'scripts/journal_audit.py', '--publish-gate'], cwd=ROOT, check=True)


def finish(number, success=True):
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    if parse_decision(event, settings()['owner']) is None:
        return
    sha = parse_decision(event, settings()['owner'])[1] or os.environ.get('DECISION_HEAD_SHA') or api('pulls/' + str(number))['head']['sha']
    path = ROOT / 'journal-reports/approval-decisions' / f'{number}-{sha}.json'
    if not path.exists():
        message = 'Rozhodnutie nespôsobilo publikovanie. Kontrola zlyhala; pozri príslušný Actions beh. Zelené technické testy samy neznamenajú odborné schválenie.'
    else:
        record = json.loads(path.read_text())
        if record['comment_id'] != event['comment']['id']:
            record = None
            message = 'Táto verzia už má zaznamenané rozhodnutie. Ďalší článok sa nepublikoval.'
        elif record['action'] == 'UPRAVIT':
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
    if path.exists() and record and (record['action'] == 'ZAMIETNUT' or (record['action'] == 'SCHVALIT' and success)):
        api('pulls/' + str(number), 'PATCH', {'state': 'closed'})


def daily_report():
    """One honest owner notification per day, even when zero articles are ready."""
    config = settings()
    if os.environ.get('GITHUB_REPOSITORY_OWNER') != config['owner']:
        raise ValueError('Unexpected owner')
    from journal_daily_status import status
    state = status()
    today = dt.datetime.now(ZoneInfo('Europe/Bratislava')).date().isoformat()
    marker = '<!-- webu-daily-status ' + today + ' -->'
    report = ROOT / 'journal-reports' / ('free-discovery-' + today + '.json')
    discovery = json.loads(report.read_text()) if report.exists() else {}
    ready = len(state.get('ready_bilingual_articles',[]))
    published = len(state.get('published_today',[]))
    generated = state.get('automatically_prepared_abstract_editorials',0)
    ids = discovery.get('draft_ids', [])
    lines = [marker, '@' + config['owner'], '',
        '**Dnes automaticky zverejnené dvojjazyčné články: ' + str(published) + '/5.**', '',
        'Dnešné bibliografické podklady: ' + str(len(ids)) + '. Podklady nie sú hotové články.',
        'AI redakčné rukopisy založené na abstrakte: ' + str(generated) + '.', '',
        'Výsledok prípravy: ' + os.environ.get('DISCOVERY_RESULT', 'not confirmed') + '.', '',
        '## Dnešné podklady (nie hotové články)', '']
    for key in ids:
        path = ROOT / 'journal-drafts' / (key + '.json')
        if path.exists():
            source = json.loads(path.read_text())
            lines += ['- **' + safe_text(source['title']) + '** — ' + source['url']]
    if not ids:lines += ['- Dnes neboli uložené nové podklady.']
    if published < 5:
        lines += ['', '**Denný cieľ zverejnenia nebol splnený.** Chýbajúce alebo nevyhovujúce '
                  'texty a obrázky zostali zablokované. Nasledujúci náhradný beh môže skúsiť znovu.']
    lines += ['', 'Automatické texty sú jasne označené ako komentáre na základe abstraktu; '
              'nepredstavujú nezávislé vedecké posúdenie plného textu.']
    if discovery.get('errors'):lines += ['', 'Chyby vyhľadávania: ' + safe_text('; '.join(discovery['errors']))]
    run = os.environ.get('GITHUB_RUN_ID', '')
    if run:lines += ['', 'Beh: https://github.com/' + os.environ['GITHUB_REPOSITORY'] + '/actions/runs/' + run]
    lines += ['', 'GitHub vytvorenie tohto upozornenia potvrdzuje; doručenie e-mailu do schránky tým nie je overené.']
    body_text = '\n'.join(lines)
    previous = next((x for x in paged('issues?state=all') if marker in (x.get('body') or '')), None)
    if previous:
        issue = previous  # No repeated messages from catch-up schedules.
        heading='WEBU Journal – Denný stav '+today+': '+str(published)+'/5 článkov'
        if issue.get('body') != body_text or issue.get('title') != heading:
            api('issues/' + str(issue['number']), 'PATCH', {'body': body_text, 'title': heading})
    else:
        issue = api('issues', 'POST', {'title': 'WEBU Journal – Denný stav ' + today + ': ' + str(published) + '/5 článkov',
                    'body': body_text, 'assignees': [config['owner']]})
    path = 'journal-reports/daily-delivery/' + today + '.json'
    evidence = {'date': today, 'issue': issue['number'], 'url': issue['html_url'],
                'ready_articles': ready, 'published_articles': published,
                'generated_manuscripts': generated, 'bibliographic_candidates': len(ids),
                'discovery_result': os.environ.get('DISCOVERY_RESULT', 'not confirmed'),
                'github_notice_created': True, 'email_delivery': 'not confirmed'}
    try:
        current = api('contents/' + path)
        old = json.loads(base64.b64decode(current['content']))
        if old != evidence:
            api('contents/' + path, 'PUT', {'message': 'Update WEBU daily delivery result ' + today, 'sha': current['sha'],
                'content': base64.b64encode((json.dumps(evidence, ensure_ascii=False, indent=2)+'\n').encode()).decode(), 'branch': 'main'})
    except urllib.error.HTTPError as error:
        if error.code != 404:raise
        api('contents/' + path, 'PUT', {'message': 'Record WEBU daily owner notice ' + today,
            'content': base64.b64encode((json.dumps(evidence, ensure_ascii=False, indent=2)+'\n').encode()).decode(), 'branch': 'main'})
    print(json.dumps(evidence, ensure_ascii=False))
    return evidence


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['notify', 'notify-test', 'decide', 'finish', 'commit-decision', 'daily-report'], required=True)
    parser.add_argument('--pr-number', type=int)
    parser.add_argument('--failed', action='store_true')
    args = parser.parse_args()
    if args.action == 'daily-report':
        daily_report()
    elif args.action in ('notify', 'notify-test'):
        notify(args.action == 'notify-test')
    elif args.action == 'decide':
        decide(json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text()))
    elif args.action == 'commit-decision':
        commit_decision()
    elif args.pr_number:
        finish(args.pr_number, not args.failed)


if __name__ == '__main__':
    main()
