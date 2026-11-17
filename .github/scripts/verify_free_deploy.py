#!/usr/bin/env python3
"""Verify actual WEBU public URLs with bounded execution, independent of Pages build mode.

GitHub Pages can use branch builds or Actions deployments; the legacy builds/latest
API is advisory only. Never report success until the live URL checks pass.
"""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
from pages_api import request_json

ROOT = Path(__file__).resolve().parents[2]
CHECK_TIMEOUT_SECONDS = 90
MAX_CHECKS = 2
RETRY_DELAY_SECONDS = 20


def pages_build_info():
    """Optional diagnostic: the legacy API may be unavailable for Actions deployments."""
    url = 'https://api.github.com/repos/' + os.environ['GITHUB_REPOSITORY'] + '/pages/builds/latest'
    try:
        return request_json(url, attempts=1)
    except Exception as exc:
        print('::warning::Pages legacy build status unavailable; checking public URLs instead: '
              + type(exc).__name__ + ': ' + str(exc), flush=True)
        return {}


def verify():
    build = pages_build_info()
    expected = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    for attempt in range(1, MAX_CHECKS + 1):
        print(f'WEBU public URL verification {attempt}/{MAX_CHECKS}; '
              f'latest legacy Pages build state={build.get("status", "unavailable")}', flush=True)
        try:
            check = subprocess.run([sys.executable, 'scripts/check_deployed_urls.py'],
                                   cwd=ROOT, timeout=CHECK_TIMEOUT_SECONDS, check=False)
        except subprocess.TimeoutExpired:
            print(f'::warning::Public URL check exceeded {CHECK_TIMEOUT_SECONDS}s; '
                  'not treating this as a successful deployment.', flush=True)
        else:
            if check.returncode == 0:
                report_path = ROOT / 'deployment-url-report.json'
                report = json.loads(report_path.read_text(encoding='utf-8'))
                if any(item.get('errors') for item in report.get('urls', [])) or not report.get('urls'):
                    raise SystemExit('URL checker returned success without a valid clean report')
                report['pages_build_status'] = build.get('status', 'not available for this build mode')
                report['pages_commit'] = build.get('commit')
                report['expected_content_commit'] = expected
                report['verification'] = 'actual_public_urls_and_assets'
                result_path = ROOT / 'journal-reports/latest-free-deployment.json'
                result_path.parent.mkdir(parents=True, exist_ok=True)
                result_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n',
                                       encoding='utf-8')
                summary = os.environ.get('GITHUB_STEP_SUMMARY')
                if summary:
                    with open(summary, 'a', encoding='utf-8') as stream:
                        stream.write('\nWEBU live URL and asset verification: '
                                     + str(len(report['urls'])) + ' checked successfully. '
                                     'Google index: not inspected.\n')
                print('Verified actual live WEBU pages and assets.', flush=True)
                return
            print(f'::warning::Public URL check failed with exit code {check.returncode}.',
                  flush=True)
        if attempt < MAX_CHECKS:
            time.sleep(RETRY_DELAY_SECONDS)
    raise SystemExit('WEBU deployment not verified after bounded public URL checks; '
                     'inspect the failed URLs in the job log. This does not claim that deployment failed.')


if __name__ == '__main__':
    verify()
