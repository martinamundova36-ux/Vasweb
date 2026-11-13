-- Synthetic authorization fixtures are always rolled back. No emails or credentials.
begin;
create temporary table staff_test_orgs (label text, id uuid default gen_random_uuid());
insert into staff_test_orgs(label) values ('a'),('b');
create temporary table staff_test_users (label text, id uuid default gen_random_uuid(), session_id uuid default gen_random_uuid(), resident_id uuid default gen_random_uuid());
insert into staff_test_users(label) values ('student-a'),('student-a2'),('student-b'),('reception-a'),('admin-a');
grant select on staff_test_orgs,staff_test_users to authenticated,service_role;
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

select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='reception-a';
set local role authenticated;
do $$begin
 update public.registration_requests set contract_number='VERIFIED-CONTRACT-01',room_number='308'
  where tenant_id=(select id from staff_test_orgs where label='a') and status='pending';
 if not found then raise exception 'Reception cannot save assignment';end if;
 if not exists(select 1 from public.registration_requests where tenant_id=(select id from staff_test_orgs where label='a') and contract_number='VERIFIED-CONTRACT-01' and room_number='308') then raise exception 'Assignment not persisted';end if;
 update public.registration_requests set contract_number='DENIED-CROSS-TENANT'
  where tenant_id=(select id from staff_test_orgs where label='b');
 if found then raise exception 'Cross-tenant update allowed';end if;
 begin
  update public.registration_requests set status='invited' where tenant_id=(select id from staff_test_orgs where label='a');
  raise exception 'Client can approve without server workflow';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Verify server-side transitions are not blocked by client-edit restrictions.
set local role service_role;
update public.registration_requests set status='invited' where tenant_id=(select id from staff_test_orgs where label='a');
reset role;
set local role authenticated;
do $$begin
 update public.registration_requests set contract_number='DENIED-AFTER-APPROVAL' where tenant_id=(select id from staff_test_orgs where label='a');
 if found then raise exception 'Approved assignment mutable through client';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='student-b';
set local role authenticated;
do $$begin
 update public.registration_requests set contract_number='DENIED-STUDENT',room_number='999' where tenant_id=(select id from staff_test_orgs where label='b');
 if found then raise exception 'Student can change assignment';end if;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.audit_logs where tenant_id=(select id from staff_test_orgs where label='a') and entity='registration_requests' and action='UPDATE') then raise exception 'Assignment audit missing';end if;
end$$;
select 'PASS: reception saves and rereads contract and room; student and cross-tenant writes denied; direct approval denied; server transition allowed; approved records protected; audit recorded; fixtures rolled back' as result;
rollback;
