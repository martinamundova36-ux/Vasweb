-- Synthetic authorization fixtures are always rolled back. No emails or credentials.
begin;
create temporary table staff_test_orgs (label text, id uuid default gen_random_uuid());
insert into staff_test_orgs(label) values ('a'),('b');
create temporary table staff_test_users (label text, id uuid default gen_random_uuid(), session_id uuid default gen_random_uuid(), resident_id uuid default gen_random_uuid());
insert into staff_test_users(label) values ('student-a'),('student-a2'),('student-b'),('reception-a'),('admin-a');
grant select on staff_test_orgs,staff_test_users to authenticated;
insert into auth.users(id,email,invited_at) select id,id::text||'@example.invalid',now() from staff_test_users;
insert into auth.sessions(id,user_id) select session_id,id from staff_test_users;
insert into public.organizations(id,name,slug) select id,'Synthetic staff access test','test-'||id::text from staff_test_orgs;
insert into public.organization_memberships(tenant_id,user_id,role)
 select o.id,u.id,(case when u.label='reception-a' then 'reception' when u.label='admin-a' then 'org_admin' else 'student' end)::member_role
 from staff_test_users u join staff_test_orgs o on o.label=case when u.label='student-b' then 'b' else 'a' end;
insert into public.residents(id,tenant_id,user_id,full_name,email)
 select u.resident_id,o.id,u.id,'Synthetic student',u.id::text||'@example.invalid'
 from staff_test_users u join staff_test_orgs o on o.label=case when u.label='student-b' then 'b' else 'a' end where u.label like 'student-%';
insert into public.registration_requests(tenant_id,first_name,last_name,email,room_number,contract_number,accommodation_from,accommodation_to,status)
 select id,'Synthetic','Registration',id::text||'@example.invalid','TEST','TEST-CONTRACT','2026-11-01','2027-06-30','pending' from staff_test_orgs;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as test_identity_set from staff_test_users where label='student-a';
set local role authenticated;
do $$begin
 if (select count(*) from public.residents where tenant_id in (select id from staff_test_orgs))<>1 then raise exception 'Student can see another resident';end if;
 if exists(select 1 from public.registration_requests where tenant_id in (select id from staff_test_orgs)) then raise exception 'Student can see registration queue';end if;
 update public.residents set verified_room_number='DENIED' where tenant_id in (select id from staff_test_orgs);
 if found then raise exception 'Student can edit staff-managed profile';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as test_identity_set from staff_test_users where label='reception-a';
set local role authenticated;
do $$begin
 if (select count(*) from public.residents where tenant_id in (select id from staff_test_orgs))<>2 then raise exception 'Reception resident scope incorrect';end if;
 if (select count(*) from public.registration_requests where tenant_id in (select id from staff_test_orgs))<>1 then raise exception 'Reception registration scope incorrect';end if;
 update public.registration_requests set status='rejected' where tenant_id in (select id from staff_test_orgs) and status='pending';
 if (select count(*) from public.registration_requests where tenant_id in (select id from staff_test_orgs) and status='rejected')<>1 then raise exception 'Reception rejection failed';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as test_identity_set from staff_test_users where label='admin-a';
set local role authenticated;
do $$begin
 if (select count(*) from public.residents where tenant_id in (select id from staff_test_orgs))<>2 then raise exception 'Administrator resident scope incorrect';end if;
 if exists(select 1 from public.residents where tenant_id=(select id from staff_test_orgs where label='b')) then raise exception 'Administrator crosses tenant boundary';end if;
end$$;
reset role;
select 'PASS: student, reception and administrator record isolation; staff-only registration rejection; student profile write denied; all fixtures rolled back' as result;
rollback;
