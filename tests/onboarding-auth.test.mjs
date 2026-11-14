import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Regression: the first approved questionnaire invite is a magiclink, not an
// "invite" event. Supabase may resolve the redirect after the initial getUser.
const html=readFileSync('student-house-portal/index.html','utf8');
const start=html.indexOf('const authLinkType=');
const end=html.lastIndexOf('})();</script>');
assert.ok(start>0&&end>start, 'Authentication callback must be present');
const callbackSource=html.slice(start,end);
assert.match(callbackSource,/event==='SIGNED_IN'/);
assert.match(callbackSource,/event==='INITIAL_SESSION'/);
assert.match(callbackSource,/setTimeout\(/,'Auth callbacks must defer work');
assert.match(html,/queueSignedIn\(data\.user,true\)/,'Manual sign-in must remain active');
const staff=readFileSync('student-house-portal/staff.js','utf8');
assert.match(staff,/if\(!submission\.data\?\.student_submitted_at\|\|!portrait\.data\?\.length\)/,'Reception must not approve unsubmitted questionnaires or missing photos');
assert.match(staff,/Date\.parse\(latestReview\.data\.requested_at\)>=Date\.parse\(submission\.data\.student_submitted_at\)/,'Repeat approval should not resend invitation');

function scenario(type, event, manual=false){
 const calls=[];let handler;
 const location={hash:type?'#access_token=synthetic&type='+type:'',pathname:'/student-house-portal/questionnaire/',search:manual?'?signin=1':''};
 const fakeDb={auth:{
  onAuthStateChange:cb=>{handler=cb;return {data:{subscription:{unsubscribe(){}}}};},
  getUser:async()=>({data:{user:null}}),
 }};
 const ctx={URLSearchParams,location,window:{location,supabase:{createClient:()=>fakeDb}},
  portalStorageKey:'test-isolated-session',U:'https://example.invalid',K:'synthetic',
  db:null,resetMode:false,user:null,member:null,
  signedIn:async user=>{calls.push(['signedIn',user.id]);},
  showPasswordRecovery:()=>{calls.push(['recovery']);ctx.resetMode=true;},
  history:{replaceState(){}},
  setTimeout:fn=>fn(),
  $:()=>({classList:{contains:()=>true}})
 };
 vm.runInNewContext(callbackSource,ctx);
 assert.equal(typeof handler,'function');
 handler(event,{user:{id:'synthetic-student'}});
 return {calls,ctx};
}
for(const type of ['magiclink','invite','email']){
 assert.deepEqual(scenario(type,'SIGNED_IN').calls,[['signedIn','synthetic-student']],type+' must open the authorized student portal');
}
assert.deepEqual(scenario('magiclink','INITIAL_SESSION').calls,[['signedIn','synthetic-student']]);
assert.deepEqual(scenario(null,'INITIAL_SESSION').calls,[['signedIn','synthetic-student']]);
assert.deepEqual(scenario('recovery','SIGNED_IN').calls,[['recovery']],'Recovery must not bypass password form');
assert.deepEqual(scenario('magiclink','SIGNED_IN',true).calls,[],'Explicit signin screen must remain visible');
const manual=scenario(null,'INITIAL_SESSION',true);
manual.ctx.queueSignedIn({id:'synthetic-student'},true);
assert.deepEqual(manual.calls,[['signedIn','synthetic-student']],'Manual login must explicitly display portal');
console.log('PASS: magiclink/invite/email, initial session, recovery, manual sign-in and questionnaire approval guard');
