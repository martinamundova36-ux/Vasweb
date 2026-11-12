import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select current_setting('test.uid')::uuid$$;
 create function private.valid_session() returns boolean language sql stable as $$select current_setting('test.live')::boolean$$;
 create table public.profiles(id uuid primary key,active boolean);alter table public.profiles enable row level security;
 grant usage on schema auth,private to authenticated;grant select on profiles to authenticated;
 insert into profiles values ('10000000-0000-0000-0000-000000000001',true),('10000000-0000-0000-0000-000000000002',true);
 create policy profile_read on profiles for select using(id=auth.uid() and active);
 create policy live_profile_session on profiles for select using(private.valid_session());`);
 await db.exec(fs.readFileSync('student-house-portal/supabase/migrations/20261112193238_restrict_profile_reads.sql','utf8'));
 await db.exec(`set role authenticated;set test.uid='10000000-0000-0000-0000-000000000001';set test.live='true'`);
 assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from profiles where id='10000000-0000-0000-0000-000000000002'")).rows[0].n,0);
 await db.exec("set test.live='false'");assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,0);
 console.log('PASS PostgreSQL: own profile only, foreign profile denied, expired session denied');
}finally{await db.close()}
