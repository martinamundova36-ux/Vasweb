"""Daily catch-up, truthful notifications, no email claims or duplicated issues."""
import base64,datetime as dt,json,os,sys,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.github/scripts'))
import journal_daily_status as daily
import journal_approval as approval

class DeliveryTests(unittest.TestCase):
 def test_due_skips_completed_day_and_retries_failures(self):
  with tempfile.TemporaryDirectory() as tmp, patch.object(daily,'ROOT',Path(tmp)):
   self.assertFalse(daily.daily_due(dt.datetime.fromisoformat('2026-11-05T06:59:00+00:00')))
   self.assertTrue(daily.daily_due(dt.datetime.fromisoformat('2026-11-05T07:00:00+00:00')))
   folder=Path(tmp)/'journal-reports/daily-delivery';folder.mkdir(parents=True)
   marker=folder/'2026-11-05.json';marker.write_text(json.dumps({'discovery_result':'failure'}))
   self.assertTrue(daily.daily_due(dt.datetime.fromisoformat('2026-11-05T08:17:00+00:00')))
   marker.write_text(json.dumps({'discovery_result':'success'}))
   self.assertFalse(daily.daily_due(dt.datetime.fromisoformat('2026-11-05T08:17:00+00:00')))
   self.assertTrue(daily.daily_due(dt.datetime.fromisoformat('2026-11-06T07:00:00+00:00')))
 def test_zero_ready_is_reported_once_without_fake_approval(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'journal-reports').mkdir()
   owner='martinamundova36-ux';issues=[];record={};writes=[]
   def api(path,method='GET',payload=None):
    writes.append((path,method,payload))
    if path=='issues' and method=='POST':
     issue=dict(payload,number=12,html_url='https://github.com/'+owner+'/Vasweb/issues/12');issues.append(issue);return issue
    if path.startswith('contents/'):
     if method=='GET':
      if not record:raise urllib.error.HTTPError(path,404,'missing',{},None)
      return {'sha':'a'*40,'content':record['content']}
     record.update(payload);return {}
    raise AssertionError((path,method))
   state={'ready_bilingual_articles':[]}
   env={'GITHUB_REPOSITORY_OWNER':owner,'GITHUB_REPOSITORY':owner+'/Vasweb','DISCOVERY_RESULT':'success','GITHUB_RUN_ID':'123'}
   with patch.object(approval,'ROOT',root),patch.object(approval,'settings',return_value={'owner':owner}),patch.object(approval,'api',side_effect=api),patch.object(approval,'paged',side_effect=lambda path:issues),patch.object(daily,'status',return_value=state),patch.dict(os.environ,env):
    first=approval.daily_report();second=approval.daily_report()
   self.assertEqual(len(issues),1)
   self.assertIn('0/5',issues[0]['title']);self.assertIn('Podklady nie sú hotové články',issues[0]['body'])
   self.assertEqual(issues[0]['assignees'],[owner]);self.assertEqual(first,second)
   self.assertEqual(first['email_delivery'],'not confirmed')
   self.assertFalse(any('pulls' in p for p,m,data in writes))

if __name__=='__main__':unittest.main()
