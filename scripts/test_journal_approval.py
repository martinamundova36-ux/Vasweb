#!/usr/bin/env python3
"""Offline regressions for notification deduplication and owner-only decisions."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.github/scripts'))
import journal_approval as approval

OWNER = 'martinamundova36-ux'
REPO = OWNER + '/Vasweb'
KEY = '2026-11-04-123456789abc'
SHA = 'a' * 40


class ApprovalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'journal-drafts').mkdir()
        (self.root / 'journal-config.json').write_text(json.dumps({'approval_notifications': {
            'owner': OWNER, 'legacy_draft_ids': [], 'max_new_requests_per_day': 5}}))
        self.env = patch.dict(os.environ, {'GITHUB_REPOSITORY': REPO, 'GITHUB_REPOSITORY_OWNER': OWNER})
        self.env.start()
        self.root_patch = patch.object(approval, 'ROOT', self.root)
        self.root_patch.start()
        self.source = {'title': 'Artificial intelligence and business', 'url': 'https://doi.org/10.1234/test-fixture',
                       'authors': ['Fixture only'], 'venue': 'Fixture only', 'source_date': '2026-11-04'}
        self.pr = {'number': 7, 'html_url': 'https://github.com/' + REPO + '/pull/7', 'state': 'open',
                   'created_at': '2026-11-04T08:00:00Z', 'user': {'login': 'github-actions[bot]'},
                   'head': {'sha': SHA, 'ref': approval.PREFIX + KEY, 'repo': {'full_name': REPO}},
                   'base': {'ref': 'main', 'repo': {'full_name': REPO}},
                   'assignees': [{'login': OWNER}], 'body': approval.body(self.source, KEY, SHA)}

    def tearDown(self):
        self.root_patch.stop()
        self.env.stop()
        self.temp.cleanup()

    def event(self, action='SCHVALIT', actor=OWNER, sha=SHA):
        return {'issue': {'number': 7, 'pull_request': {}},
                'comment': {'user': {'login': actor}, 'body': action + ' ' + sha,
                            'id': 1, 'html_url': self.pr['html_url'] + '#issuecomment-1'}}

    def test_owner_only_and_exact_version(self):
        event = self.event(actor='some-other-account')
        with self.assertRaisesRegex(ValueError, 'Only the named owner'):
            approval.parse_decision(event, OWNER)
        self.assertEqual(approval.parse_decision(self.event('UPRAVIŤ'), OWNER), ('UPRAVIT', SHA))
        short = self.event()
        short['comment']['body'] = 'Schváliť\n\n> quoted original notification'
        self.assertEqual(approval.parse_decision(short, OWNER), ('SCHVALIT', None))
        self.assertIsNone(approval.parse_decision(self.event('nice article'), OWNER))
        with self.assertRaisesRegex(ValueError, 'stale'):
            approval.validate_pr(self.pr, KEY, 'b' * 40, OWNER)
        changed = copy.deepcopy(self.pr)
        changed['head']['repo']['full_name'] = 'attacker/repo'
        with self.assertRaisesRegex(ValueError, 'Unexpected approval branch'):
            approval.validate_pr(changed, KEY, SHA, OWNER)

    def test_short_reply_is_bound_to_notification_and_time(self):
        event = self.event()
        event['comment']['body'] = 'SCHVÁLIŤ'
        event['comment']['created_at'] = '2026-11-04T12:00:01Z'
        data = approval.metadata(self.pr)
        with patch.object(approval, 'api', return_value={'committer': {'date': '2026-11-04T12:00:00Z'}}):
            self.assertEqual(approval.decision_version(event, self.pr, data), SHA)
        with patch.object(approval, 'api', return_value={'committer': {'date': '2026-11-04T12:00:02Z'}}):
            with self.assertRaisesRegex(ValueError, 'changed during or after'):
                approval.decision_version(event, self.pr, data)
        changed = copy.deepcopy(self.pr)
        changed['head']['sha'] = 'b' * 40
        with self.assertRaisesRegex(ValueError, 'Notification version is stale'):
            approval.decision_version(event, changed, data)

    def test_email_is_short_and_has_no_copyable_machine_command(self):
        import re
        message = approval.body(self.source, KEY, SHA)
        visible = re.sub(r'<!--.*?-->', '', message, flags=re.S)
        visible = re.sub(r'\]\([^)]*\)', ']', visible)
        self.assertNotRegex(visible, r'[a-f0-9]{40}')
        self.assertNotIn('SCHVALIT ' + SHA, visible)
        self.assertIn('SCHVÁLIŤ · UPRAVIŤ · ZAMIETNUŤ', visible)
        self.assertLess(len(visible), 1000)

    def test_unchanged_and_closed_requests_do_not_notify(self):
        (self.root / 'journal-drafts' / (KEY + '.json')).write_text(json.dumps(self.source))
        for state in ('open', 'closed'):
            self.pr['state'] = state
            with patch.object(approval, 'paged', return_value=[self.pr]), patch.object(approval, 'api') as api:
                self.assertEqual(approval.notify(), [])
                api.assert_not_called()

    def test_changed_draft_updates_same_request(self):
        changed = dict(self.source, title='Revised artificial intelligence article')
        (self.root / 'journal-drafts' / (KEY + '.json')).write_text(json.dumps(changed))
        with patch.object(approval, 'paged', return_value=[self.pr]), \
             patch.object(approval, 'branch_snapshot', return_value=SHA), \
             patch.object(approval, 'api', return_value=self.pr) as api:
            result = approval.notify()
            self.assertEqual(result[0]['pr'], 7)
            self.assertEqual(api.call_args[0][:2], ('pulls/7', 'PATCH'))

    def test_new_request_is_assigned_and_daily_cap_applies(self):
        (self.root / 'journal-drafts' / (KEY + '.json')).write_text(json.dumps(self.source))
        created = dict(self.pr, assignees=[])
        with patch.object(approval, 'paged', return_value=[]), \
             patch.object(approval, 'branch_snapshot', return_value=SHA), \
             patch.object(approval, 'api', return_value=created) as api:
            self.assertEqual(len(approval.notify()), 1)
            self.assertEqual(api.call_args_list[0].args[:2], ('pulls', 'POST'))
            self.assertTrue(api.call_args_list[0].args[2]['draft'])
            self.assertEqual(api.call_args_list[1].args, ('issues/7/assignees', 'POST', {'assignees': [OWNER]}))
        requests = [dict(self.pr, created_at=approval.dt.datetime.now(approval.dt.timezone.utc).date().isoformat(),
                         head=dict(self.pr['head'], ref=approval.PREFIX + str(n))) for n in range(5)]
        with patch.object(approval, 'paged', return_value=requests), patch.object(approval, 'api') as api:
            self.assertEqual(approval.notify(), [])
            api.assert_not_called()

    def test_unreviewed_draft_cannot_publish_and_rejection_is_recorded(self):
        import base64
        (self.root / 'journal-drafts' / (KEY + '.json')).write_text(json.dumps(self.source))
        content = {'content': base64.b64encode(json.dumps(self.source).encode()).decode()}
        def api(path, *args):
            return self.pr if path.startswith('pulls/') else content
        with patch.object(approval, 'api', side_effect=api), \
             patch.object(approval, 'paged', return_value=[{'filename': f'journal-drafts/{KEY}.json', 'status': 'added'}]), \
             patch.object(approval.subprocess, 'run') as publish:
            with self.assertRaisesRegex(ValueError, 'reviewed bilingual article'):
                approval.decide(self.event())
            publish.assert_not_called()
            approval.decide(self.event('ZAMIETNUT'))
            record = json.loads((self.root / f'journal-reports/approval-decisions/7-{SHA}.json').read_text())
            self.assertEqual(record['action'], 'ZAMIETNUT')
            self.assertNotIn('published_urls', record)
            with self.assertRaisesRegex(ValueError, 'already has a recorded decision'):
                approval.decide(self.event())

    def test_workflow_change_in_request_blocks_even_owner(self):
        with patch.object(approval, 'api', return_value=self.pr), \
             patch.object(approval, 'paged', return_value=[{'filename': '.github/workflows/evil.yml', 'status': 'added'}]):
            with self.assertRaisesRegex(ValueError, 'only its own draft'):
                approval.decide(self.event())

    def test_test_fixture_is_always_nonpublishing(self):
        import base64
        source = dict(self.source, test_only=True)
        self.pr['body'] = approval.body(source, KEY, SHA)
        content = {'content': base64.b64encode(json.dumps(source).encode()).decode()}
        def api(path, *args):
            return self.pr if path.startswith('pulls/') else content
        with patch.object(approval, 'api', side_effect=api), \
             patch.object(approval, 'paged', return_value=[{'filename': f'journal-drafts/{KEY}.json', 'status': 'added'}]), \
             patch.object(approval.subprocess, 'run') as publish:
            approval.decide(self.event())
            publish.assert_not_called()
            self.assertEqual(list((self.root / 'journal-reports/approval-decisions').glob('*.json')), [])

    def test_approved_reviewed_version_delegates_to_existing_pipeline(self):
        import base64
        import free_journal
        source = json.loads((ROOT / 'journal-drafts/2026-11-04-93b063fd01b6.json').read_text())
        source.pop('published_at', None)
        source.pop('published_urls', None)
        self.pr['body'] = approval.body(source, KEY, SHA)
        local = self.root / 'journal-drafts' / (KEY + '.json')
        local.write_text(json.dumps(source))
        content = {'content': base64.b64encode(json.dumps(source).encode()).decode()}
        def api(path, *args):
            if path.startswith('git/commits/'):
                return {'committer': {'date': '2026-11-04T12:00:00Z'}}
            return self.pr if path.startswith('pulls/') else content
        def published(*args, **kwargs):
            result = dict(source, published_at='2026-11-04',
                          published_urls=['https://example.invalid/sk', 'https://example.invalid/en'])
            local.write_text(json.dumps(result))
        with patch.object(approval, 'api', side_effect=api), \
             patch.object(approval, 'paged', return_value=[{'filename': f'journal-drafts/{KEY}.json', 'status': 'added'}]), \
             patch.object(approval.subprocess, 'run', side_effect=published) as publish:
            event = self.event()
            event['comment']['body'] = 'SCHVÁLIŤ'
            event['comment']['created_at'] = '2026-11-04T12:00:01Z'
            approval.decide(event)
            publish.assert_called_once()
            self.assertIn('--draft-id', publish.call_args.args[0])
            self.assertIn('free_journal.py', publish.call_args.args[0][1])
            record = json.loads((self.root / f'journal-reports/approval-decisions/7-{SHA}.json').read_text())
            self.assertEqual(record['action'], 'SCHVALIT')
            self.assertEqual(record['actor'], OWNER)
            self.assertEqual(len(record['published_urls']), 2)


if __name__ == '__main__':
    unittest.main()
