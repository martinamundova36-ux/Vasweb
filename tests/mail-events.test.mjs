import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create schema private;
 create table residents(id uuid primary key,tenant_id uuid,email text);
 create table registration_requests(id uuid,tenant_id uuid,email text,status text);
 create table residence_portal_files(id uuid,tenant_id uuid,resident_id uuid,kind text,active boolean,review_status text);
 create table test_outbox(dedupe text unique,audience text,recipient text,subject text);
 create function private.residence_enqueue_mail(uuid,text,text,text,text,text,text default null) returns void language sql as $$insert into public.test_outbox values($2,$3,$4,$5) on conflict do nothing$$;`);
 await db.exec(readFileSync('student-house-portal/supabase/migrations/20261114112141_residence_missing_operational_notifications.sql','utf8'));
 await db.exec(`create trigger mail_registration after insert or update on registration_requests for each row execute function private.residence_mail_event();create trigger mail_file after insert or update on residence_portal_files for each row execute function private.residence_mail_event();`);
 const t='30000000-0000-0000-0000-000000000001',r='40000000-0000-0000-0000-000000000001';
 await db.query('insert into residents values($1,$2,$3)',[r,t,'test@example.invalid']);
 await db.query("insert into registration_requests values(gen_random_uuid(),$1,'test@example.invalid','pending')",[t]);
 await db.exec("truncate test_outbox;update registration_requests set status='rejected'");
 assert.deepEqual((await db.query('select audience,recipient from test_outbox')).rows,[{audience:'student',recipient:'test@example.invalid'}]);
 await db.exec("truncate test_outbox;update registration_requests set status='rejected'");assert.equal((await db.query('select count(*)::int n from test_outbox')).rows[0].n,0);
 for(const kind of ['contract_draft','schedule_draft','certificate_draft','resident_document']){
  await db.exec('truncate test_outbox');
  await db.query("insert into residence_portal_files values(gen_random_uuid(),$1,$2,$3,true,'not_applicable')",[t,r,kind]);
  assert.deepEqual((await db.query('select audience,recipient from test_outbox')).rows,[{audience:'student',recipient:'test@example.invalid'}]);
 }
 await db.exec('truncate test_outbox');await db.query("insert into residence_portal_files values(gen_random_uuid(),$1,$2,'signed_schedule',true,'pending')",[t,r]);
 assert.equal((await db.query('select audience from test_outbox')).rows[0].audience,'admin');
 await db.exec("truncate test_outbox;update residence_portal_files set review_status='approved' where kind='signed_schedule'");
 assert.equal((await db.query('select recipient from test_outbox')).rows[0].recipient,'test@example.invalid');
 console.log('PASS: rejection deduplication, private document notifications to the owner, signed uploads to reception, and document review notifications.');
}finally{await db.close()}
