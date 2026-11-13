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

create temporary table service_test_ids(label text,id uuid);
grant select,insert on service_test_ids to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='student-a';
set local role authenticated;
with request as (
 insert into public.service_requests(tenant_id,resident_id,category,subject,description,urgent)
 select o.id,u.resident_id,'maintenance','Synthetic maintenance','Synthetic description',true
 from staff_test_orgs o cross join staff_test_users u where o.label='a' and u.label='student-a' returning id
) insert into service_test_ids select 'request',id from request;
insert into public.service_request_messages(tenant_id,request_id,author_id,body)
 select o.id,r.id,u.id,'Synthetic public reply' from staff_test_orgs o cross join service_test_ids r cross join staff_test_users u where o.label='a' and u.label='student-a';
do $$begin
 begin
  insert into public.service_request_messages(tenant_id,request_id,author_id,body,is_internal)
   select o.id,r.id,u.id,'Denied internal',true from staff_test_orgs o cross join service_test_ids r cross join staff_test_users u where o.label='a' and u.label='student-a';
  raise exception 'Student created internal note';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.service_request_messages(tenant_id,request_id,author_id,body,message_kind)
   select o.id,r.id,u.id,'closed','status' from staff_test_orgs o cross join service_test_ids r cross join staff_test_users u where o.label='a' and u.label='student-a';
  raise exception 'Student forged status history';
 exception when insufficient_privilege then null;end;
 update public.service_requests set status='closed' where id=(select id from service_test_ids where label='request');
 if found then raise exception 'Student changed request status';end if;
end$$;
insert into public.cleaning_bookings(tenant_id,resident_id,preferred_date,preferred_window,cleaning_type)
 select o.id,u.resident_id,(now() at time zone 'Europe/Bratislava')::date+1,'morning','deep' from staff_test_orgs o cross join staff_test_users u where o.label='a' and u.label='student-a';
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='reception-a';
set local role authenticated;
insert into public.service_request_messages(tenant_id,request_id,author_id,body,is_internal)
 select o.id,r.id,u.id,'Synthetic private staff note',true from staff_test_orgs o cross join service_test_ids r cross join staff_test_users u where o.label='a' and u.label='reception-a';
update public.service_requests set status='accepted' where id=(select id from service_test_ids where label='request');
update public.service_requests set status='waiting_parts' where id=(select id from service_test_ids where label='request');
update public.service_requests set status='resolved' where id=(select id from service_test_ids where label='request');
update public.service_requests set status='closed' where id=(select id from service_test_ids where label='request');
update public.cleaning_bookings set status='proposed',scheduled_at=now()+interval '2 days',staff_note='Synthetic alternative appointment' where tenant_id=(select id from staff_test_orgs where label='a');
do $$begin
 if (select count(*) from public.service_request_messages where request_id=(select id from service_test_ids where label='request') and message_kind='status')<>4 then raise exception 'Missing status history';end if;
 if not exists(select 1 from public.service_request_messages where request_id=(select id from service_test_ids where label='request') and is_internal) then raise exception 'Reception cannot read private note';end if;
end$$;
reset role;
-- An internal note must never produce an email or student notification.
do $$begin
 if exists(select 1 from public.residence_mail_outbox where tenant_id=(select id from staff_test_orgs where label='a') and body like '%private staff note%') then raise exception 'Private note leaked in mail';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='student-a';
set local role authenticated;
do $$begin
 if exists(select 1 from public.service_request_messages where is_internal) then raise exception 'Student reads internal note';end if;
 if (select count(*) from public.service_request_messages where request_id=(select id from service_test_ids where label='request'))<>5 then raise exception 'Student cannot read public history';end if;
 if not exists(select 1 from public.service_requests where id=(select id from service_test_ids where label='request') and status='closed' and urgent) then raise exception 'Student cannot read own status';end if;
 if not exists(select 1 from public.cleaning_bookings where resident_id=(select resident_id from staff_test_users where label='student-a') and status='proposed' and cleaning_type='deep') then raise exception 'Student cannot read proposed cleaning';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='student-a2';
set local role authenticated;
do $$begin
 if exists(select 1 from public.service_requests where id=(select id from service_test_ids where label='request')) or exists(select 1 from public.service_request_messages where request_id=(select id from service_test_ids where label='request')) then raise exception 'Other student sees request or messages';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated','session_id',session_id)::text,true) is not null as identity_set from staff_test_users where label='student-b';
set local role authenticated;
do $$begin
 if exists(select 1 from public.service_requests where id=(select id from service_test_ids where label='request')) or exists(select 1 from public.service_request_messages where request_id=(select id from service_test_ids where label='request')) then raise exception 'Cross-tenant access';end if;
end$$;
reset role;
select 'PASS: service creation, urgent flag, status history, public replies, internal-note isolation, forged-status denial, other-student isolation, cross-tenant isolation, cleaning proposal; all fixtures rolled back' as result;
rollback;
