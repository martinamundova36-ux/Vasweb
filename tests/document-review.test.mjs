import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function private.has_role(uuid) returns boolean language sql as $$select true$$;
 create table public.organization_memberships(tenant_id uuid,user_id uuid,role text,active boolean);
 create table public.residence_portal_files(id uuid primary key,tenant_id uuid,kind text,active boolean,review_status text,staff_note text,reviewed_by uuid,reviewed_at timestamptz,user_id uuid,resident_id uuid, constraint residence_portal_files_kind_check check(true),constraint valid_residence_file_owner check(true));
 create table public.audit_logs(tenant_id uuid,actor_id uuid,action text,entity text,entity_id text);
 create table public.test_mail(file_id uuid,status text);
 create function private.residence_staff_actor(t uuid,u uuid) returns boolean language sql as $$select exists(select 1 from public.organization_memberships where tenant_id=t and user_id=u and active and role in ('reception','org_admin'))$$;
 create function private.test_mail_event() returns trigger language plpgsql as $$begin insert into public.test_mail values(new.id,new.review_status);return new;end$$;
 create trigger test_mail after update on public.residence_portal_files for each row execute function private.test_mail_event();`);
 await db.exec(`create or replace function private.has_role(t uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.organization_memberships where tenant_id=t and user_id=auth.uid() and active)$$;alter table residence_portal_files enable row level security;grant select on residence_portal_files to authenticated;grant usage on schema auth,private to authenticated;`);
 await db.exec(readFileSync('student-house-portal/supabase/migrations/20261114111538_residence_document_review_integrity.sql','utf8'));
 await db.exec(readFileSync('student-house-portal/supabase/migrations/20261114111901_residence_remaining_document_types.sql','utf8'));
 const tenant='30000000-0000-0000-0000-000000000001',other='30000000-0000-0000-0000-000000000002',staff='10000000-0000-0000-0000-000000000001',student='10000000-0000-0000-0000-000000000002',file='40000000-0000-0000-0000-000000000001';
 await db.query("insert into organization_memberships values($1,$2,'reception',true),($1,$3,'student',true)",[tenant,staff,student]);
 await db.query("insert into residence_portal_files values($1,$2,'signed_contract',true,'pending',null,null,null,$3,$4)",[file,tenant,student,student]);
 const review=(actor=staff,t=tenant,status='rejected',note='Missing signature',expected='pending')=>db.query('select residence_review_portal_file($1,$2,$3,$4,$5,$6)',[actor,t,file,status,note,expected]);
 await assert.rejects(review(student),/staff_only/);await assert.rejects(review(staff,other),/staff_only/);
 await assert.rejects(review(staff,tenant,'rejected',' '),/correction_reason_required/);
 await db.exec("create function private.fail_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable';end$$;create trigger fail_audit before insert on audit_logs for each row execute function private.fail_audit();");
 await assert.rejects(review(),/audit unavailable/);
 assert.equal((await db.query('select review_status from residence_portal_files')).rows[0].review_status,'pending');
 assert.equal((await db.query('select count(*)::int n from test_mail')).rows[0].n,0);
 await db.exec('drop trigger fail_audit on audit_logs');
 await review();assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from test_mail')).rows[0].n,1);
 await assert.rejects(review(staff,tenant,'approved','Reviewed','pending'),/review_conflict/);
 await review(staff,tenant,'approved','Reviewed','rejected');
 await assert.rejects(review(staff,tenant,'rejected','Changed','approved'),/review_conflict/);
 await db.exec("update residence_portal_files set active=false,review_status='pending'");
 await assert.rejects(review(),/review_file_unavailable/);
 for(const kind of ['signed_schedule','signed_certificate']){
  await db.query("update residence_portal_files set kind=$1,active=true,review_status='pending'",[kind]);
  await review();assert.equal((await db.query('select review_status from residence_portal_files')).rows[0].review_status,'rejected');
 }
 await db.query("insert into residence_portal_files values(gen_random_uuid(),$1,'signed_schedule',true,'pending',null,null,null,$2,$2),(gen_random_uuid(),$3,'signed_schedule',true,'pending',null,null,null,$4,$4)",[tenant,staff,other,student]);
 await db.query("select set_config('test.uid',$1,false)",[student]);
 await db.exec('set role authenticated');await assert.rejects(review(),/permission denied/);
 const visible=(await db.query('select id from residence_portal_files')).rows;
 assert.deepEqual(visible.map(r=>r.id),[file]);
 console.log('PASS: document review reason, tenant and role authorization, stale/inactive review denial; audit and email rollback atomically.');
}finally{await db.close()}
