#!/usr/bin/env python3
"""Wait for the requested branch-based Pages build, then check published URLs."""
from pathlib import Path
import json,os,time,urllib.request,subprocess,sys
root=Path(__file__).resolve().parents[2]
headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'WEBU-deployment-check'}
url='https://api.github.com/repos/'+os.environ['GITHUB_REPOSITORY']+'/pages/builds/latest'
for attempt in range(24):
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=20) as r:build=json.load(r)
 if build['status']=='built':break
 if build['status']=='errored':raise SystemExit('GitHub Pages build failed')
 time.sleep(10)
else:raise SystemExit('Pages build not confirmed within four minutes')
subprocess.run([sys.executable,'scripts/check_deployed_urls.py'],cwd=root,check=True)
report=json.loads((root/'deployment-url-report.json').read_text());report['pages_build_status']=build['status'];report['pages_commit']=build.get('commit')
# This output intentionally records technical availability, never Google index status.
with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:
 f.write('\nPages: built. Public URL checks: '+str(len(report['urls']))+' passed. Google index: not inspected.\n')
with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:
 for row in report['urls']:f.write('\n- '+row['url']+' — '+str(row.get('status','ERROR'))+' — '+('; '.join(row['errors']) or 'technically available')+'\n')
(root/'journal-reports'/'latest-free-deployment.json').write_text(json.dumps(report,indent=2))
