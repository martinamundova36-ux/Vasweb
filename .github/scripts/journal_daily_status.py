#!/usr/bin/env python3
"""Truthful operational status; does not write articles or assess scientific truth."""
import argparse
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo
from free_journal import validate_editorial

ROOT = Path(__file__).resolve().parents[2]
ZONE = ZoneInfo('Europe/Bratislava')


def next_run(now):
    local = now.astimezone(ZONE)
    candidate = local.replace(hour=8, minute=0, second=0, microsecond=0)
    if candidate <= local:
        candidate += dt.timedelta(days=1)
    return candidate


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
    result = {'checked_at': now.isoformat(), 'timezone': ZONE.key,
        'schedule': '0 8 * * *', 'next_scheduled_local': scheduled.isoformat(),
        'next_scheduled_utc': scheduled.astimezone(dt.timezone.utc).isoformat(),
        'scheduler_timing': 'Configured target; GitHub can queue/delay scheduled jobs. Future execution is not yet observed.',
        'daily_maximum': 5, 'generator_capability': 'bibliographic_candidates_only',
        'automatically_written_full_articles': 0,
        'ready_bilingual_articles': ready, 'pending_editorial_work': pending,
        'published_research_draft_ids': published, 'paid_ai_enabled': False,
        'missing_for_five_full_articles': ['A writer/source-analysis process producing distinct complete SK/EN articles',
            'Documented editorial full-text comparison and scientific quality decisions for each article'],
        'api_key_needed_for_current_crossref_pipeline': False,
        'scope': 'Record/technical checks only; no claim of automatic scientific peer review or plagiarism clearance'}
    (ROOT / 'journal-reports/daily-status.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    return result


def self_test():
    for date, expected in [('2026-01-15T07:00:00+00:00', '2026-01-16T08:00:00+01:00'),
                           ('2026-07-15T05:00:00+00:00', '2026-07-15T08:00:00+02:00'),
                           ('2026-03-28T08:00:00+00:00', '2026-03-29T08:00:00+02:00'),
                           ('2026-10-24T08:00:00+00:00', '2026-10-25T08:00:00+01:00')]:
        assert next_run(dt.datetime.fromisoformat(date)).isoformat() == expected
    workflow = (ROOT / '.github/workflows/publish-research-journal.yml').read_text()
    assert "cron: '0 8 * * *'\n      timezone: 'Europe/Bratislava'" in workflow
    assert workflow.count('  schedule:') == 1
    config = json.loads((ROOT / 'journal-config.json').read_text())
    assert config['target_studies_per_day'] <= 5 and not config['paid_ai_enabled']
    print('PASS: 08:00 Bratislava, winter/summer and both DST transitions; one discovery schedule, five-candidate maximum. This is configuration validation, not evidence of a future scheduler event.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    self_test() if parser.parse_args().self_test else status()
