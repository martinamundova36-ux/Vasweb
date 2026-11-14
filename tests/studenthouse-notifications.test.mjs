import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('student-house-portal/index.html','utf8');
const manage=readFileSync('student-house-portal/supabase/manage/index.ts','utf8');
const sql=readFileSync('student-house-portal/supabase/migrations/20261114184304_residence_private_in_app_onboarding_notifications.sql','utf8');
const passwordSql=readFileSync('student-house-portal/supabase/migrations/20261114184438_residence_password_login_after_staff_approval.sql','utf8');

for (const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
 if(script.trim())assert.doesNotThrow(()=>new vm.Script(script));
}
for(const mode of ['student','questionnaire','admin']){
 const derived=readFileSync('student-house-portal/'+mode+'/index.html','utf8');
 assert.match(derived,/studentNoticeBell/);
 assert.match(derived,/Created by <a href=/);
}
assert.match(html,/id="studentNoticeBell"/);
assert.match(html,/renderStudentNotifications\(tenant,generation\)/);
assert.match(html,/db\.from\('notifications'\)\.select\('id,title,body,created_at,read_at'\)/);
assert.match(html,/\.eq\('user_id',user\.id\)/);
assert.match(html,/action:'activate_profile'/);
assert.match(html,/Pokračovať v dotazníku/);
assert.match(manage,/action==='activate_approved_login'/);
assert.match(manage,/admin\.updateUserById\(uid,\{email_confirm:true\}\)/);
assert.match(manage,/service\.rpc\('residence_account_has_password'/);
assert.match(sql,/create trigger residence_registration_in_app_alert/);
assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
assert.match(sql,/grant update\(read_at\) on public\.notifications to authenticated/);
assert.doesNotMatch(sql,/grant insert on public\.notifications to authenticated/);
assert.match(passwordSql,/grant execute on function public\.residence_account_has_password\(uuid\) to service_role/);
console.log('PASS private in-app notification display, room-scoped inbox, staff approved password login, and generated entry points');
