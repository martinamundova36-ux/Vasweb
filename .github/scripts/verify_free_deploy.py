#!/usr/bin/env python3
"""Confirm actual deployed content, tolerating newer commits that supersede a Pages build."""
from pathlib import Path
import json,os,time,subprocess,sys
from pages_api import request_json

root=Path(__file__).resolve().parents[2]
url='https://api.github.com/repos/'+os.environ['GITHUB_REPOSITORY']+'/pages/builds/latest'
expected=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
last_build={}
for attempt in range(36):
    last_build=request_json(url)
    # A sitemap or daily-status commit can supersede this job's Pages build.
    # Compare the public assets with this checkout instead of requiring an exact build SHA.
    if last_build.get('status')=='built':
        result=subprocess.run([sys.executable,'scripts/check_deployed_urls.py'],cwd=root)
        if result.returncode==0:
            report=json.loads((root/'deployment-url-report.json').read_text())
            report['pages_build_status']=last_build['status']
            report['pages_commit']=last_build.get('commit')
            report['expected_content_commit']=expected
            report['verification']='actual_public_urls_and_assets'
            (root/'journal-reports'/'latest-free-deployment.json').write_text(json.dumps(report,indent=2))
            with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:
                summary.write('\nPages URL and asset checks: '+str(len(report['urls']))+' passed. Google index: not inspected.\n')
            print('Public URLs and assets verified against this checkout; latest Pages build may use a newer commit.',flush=True)
            sys.exit(0)
        print('Pages build completed, but public assets are still propagating; retry '+str(attempt+1)+'/36',flush=True)
    else:
        print('Waiting for Pages latest build status: '+str(last_build.get('status'))+'; attempt '+str(attempt+1)+'/36',flush=True)
    if attempt<35:time.sleep(15)
raise SystemExit('Public URLs were not verified within the bounded Pages/CDN retry window; latest status='+str(last_build.get('status')))
