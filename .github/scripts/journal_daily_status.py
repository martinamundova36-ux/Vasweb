#!/usr/bin/env python3
"""Truthful operational status; does not write articles or assess scientific truth."""
import argparse
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo
from free_journal import validate_editorial, manual_published_today

ROOT = Path(__file__).resolve().parents[2]
ZONE = ZoneInfo('Europe/Bratislava')
SCHEDULE = '7,27,47 6-11 * * *'

def daily_due(now):
    local = now.astimezone(ZONE)
    if local.hour < 6 or (local.hour == 6 and local.minute < 7):return False
    today = str(local.date())
    # Count actual published sources even if the notification job did not create its marker.
    published = sum(
        json.loads(p.read_text(encoding='utf-8')).get('published_at') == today
        for p in (ROOT / 'journal-drafts').glob('*.json')
    )
    published += len(manual_published_today(today))
    if published >= 5:
        return False
    record = ROOT / 'journal-reports/daily-delivery' / (today + '.json')
    if not record.exists():return True
    latest = json.loads(record.read_text())
    return latest.get('published_articles', 0) < 5



def next_run(now):
    """Next actual primary or backup check, not just tomorrow's first check."""
    local = now.astimezone(ZONE)
    for offset in (0, 1):
        day = (local + dt.timedelta(days=offset)).date()
        for hour in range(6, 12):
            for minute in (7, 27, 47):
                candidate = dt.datetime(day.year, day.month, day.day, hour, minute, tzinfo=ZONE)
                if candidate > local:
                    return candidate
    raise RuntimeError('No future Journal schedule found')


def status():
    now = dt.datetime.now(dt.timezone.utc)
    ready, pending, published = [], [], []
    for path in sorted((ROOT / 'journal-drafts').glob('*.json')):
        source = json.loads(path.read_text())
        if source.get('test_only'):
            continue
        if source.get('published_at'):
            published.append(path.stem)
            continue
        try:
            validate_editorial(source)
        except ValueError as error:
            pending.append({'id': path.stem, 'reason': str(error)})
        else:
            ready.append(path.stem)
    scheduled = next_run(now)
    today=str(now.astimezone(ZONE).date())
    auto_manuscripts=sum(json.loads(p.read_text()).get('generated_on')==today for p in (ROOT/'journal-articles-pending').glob('*.json'))
    automatic_today=[p.stem for p in (ROOT/'journal-drafts').glob('*.json') if json.loads(p.read_text()).get('published_at')==today]
    manual_today=manual_published_today(today)
    published_today=sorted(set(automatic_today+manual_today))
    result = {'checked_at': now.isoformat(), 'timezone': ZONE.key,
        'schedule': SCHEDULE, 'primary_target': '08:00 Europe/Bratislava', 'preparation_start': '06:07 Europe/Bratislava', 'backup_checks': 'Every :07/:27/:47 from 06:07 through 11:47; stop after 5 published articles', 'next_scheduled_local': scheduled.isoformat(),
        'next_scheduled_utc': scheduled.astimezone(dt.timezone.utc).isoformat(),
        'scheduler_timing': 'Configured target; GitHub can queue/delay scheduled jobs. Future execution is not yet observed.',
        'daily_maximum': 5, 'generator_capability': 'abstract_scoped_bilingual_editorials',
        'automatically_written_full_articles': 0,
        'automatically_prepared_abstract_editorials': auto_manuscripts,
        'published_today': published_today, 'published_automatically_today': automatic_today,
        'published_manually_today': manual_today,
        'ready_bilingual_articles': ready, 'pending_editorial_work': pending,
        'published_research_draft_ids': published, 'paid_ai_enabled': False,
        'scientific_review_limit': 'Automated abstracts are labelled clearly; no independent full-text claim verification or scientific peer review',
        'api_key_needed_for_current_crossref_pipeline': False,
        'scope': 'Record/technical checks only; no claim of automatic scientific peer review or plagiarism clearance'}
    (ROOT / 'journal-reports/daily-status.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    return result


def self_test():
    for date, expected in [('2026-01-15T07:00:00+00:00', '2026-01-15T08:07:00+01:00'),
                           ('2026-07-15T05:00:00+00:00', '2026-07-15T07:07:00+02:00'),
                           ('2026-03-28T08:00:00+00:00', '2026-03-28T09:07:00+01:00'),
                           ('2026-10-24T08:00:00+00:00', '2026-10-24T10:07:00+02:00')]:
        assert next_run(dt.datetime.fromisoformat(date)).isoformat() == expected
    workflow = (ROOT / '.github/workflows/publish-research-journal.yml').read_text()
    assert "cron: '" + SCHEDULE + "'\n      timezone: 'Europe/Bratislava'" in workflow
    assert workflow.count('  schedule:') == 1
    config = json.loads((ROOT / 'journal-config.json').read_text())
    assert config['target_studies_per_day'] <= 5 and not config['paid_ai_enabled']
    print('PASS: preparation from 06:07, target 08:00 Bratislava, winter/summer and both DST transitions; one discovery schedule, five-candidate maximum. This is configuration validation, not evidence of a future scheduler event.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--due', action='store_true')
    args = parser.parse_args()
    if args.self_test:self_test()
    elif args.due:print('true' if daily_due(dt.datetime.now(dt.timezone.utc)) else 'false')
    else:status()
