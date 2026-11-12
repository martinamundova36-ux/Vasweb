create function private.member_directory(p_tenant uuid) returns table(user_id uuid,display_name text,email text,phone text,role public.member_role,active boolean) language plpgsql stable security definer set search_path='' as $$begin
if not private.has_role(p_tenant,array['org_admin','reception']::public.member_role[]) then raise exception 'Forbidden' using errcode='42501';end if;
return query select m.user_id,coalesce(nullif(p.display_name,''),r.full_name,''),u.email::text,p.phone,m.role,m.active and p.active from public.organization_memberships m join public.profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id left join public.residents r on r.tenant_id=m.tenant_id and r.user_id=m.user_id where m.tenant_id=p_tenant;end$$;
create function public.member_directory(p_tenant uuid) returns table(user_id uuid,display_name text,email text,phone text,role public.member_role,active boolean) language sql security invoker set search_path='' as $$select * from private.member_directory(p_tenant)$$;
revoke all on function private.member_directory(uuid),public.member_directory(uuid) from public,anon;
grant execute on function private.member_directory(uuid),public.member_directory(uuid) to authenticated;
-- Unfinished uploads never appear in resident document lists.
alter table public.documents add column if not exists upload_complete boolean not null default false;
update public.documents d set upload_complete=true where exists(select 1 from storage.objects s where s.bucket_id='residence-private' and s.name=d.object_path);
create function private.complete_document(p_id uuid) returns void language plpgsql security definer set search_path='' as $$declare d public.documents;u uuid;begin
select * into strict d from public.documents where id=p_id for update;
if not private.has_role(d.tenant_id,array['org_admin','reception']::public.member_role[]) or d.uploaded_by<>auth.uid() then raise exception 'Forbidden' using errcode='42501';end if;
if not exists(select 1 from storage.objects s where s.bucket_id='residence-private' and s.name=d.object_path) then raise exception 'File missing' using errcode='22023';end if;
if d.upload_complete then return;end if;
update public.documents set upload_complete=true where id=d.id;
insert into public.notifications(tenant_id,user_id,title,body) select d.tenant_id,m.user_id,'new_document',d.id::text from public.organization_memberships m where m.tenant_id=d.tenant_id and m.active and (d.resident_id is null or exists(select 1 from public.residents r where r.id=d.resident_id and r.user_id=m.user_id));end$$;
create function public.complete_document(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.complete_document(p_id)$$;
revoke all on function private.complete_document(uuid),public.complete_document(uuid) from public,anon;
grant execute on function private.complete_document(uuid),public.complete_document(uuid) to authenticated;
-- Restrictive policy composes with the existing access policy; it cannot widen access.
create policy completed_documents_only on public.documents as restrictive for select to authenticated using(upload_complete or private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
-- Only trusted server code may finish invitation provisioning atomically.
create function private.provision_member(p_actor uuid,p_tenant uuid,p_user uuid,p_role public.member_role,p_name text,p_email text) returns void language plpgsql security definer set search_path='' as $$begin
-- This function is never granted to browser roles. The Edge function checks the actor's live session first.
if p_actor is null or not exists(select 1 from public.profiles where id=p_actor and active) then raise exception 'Forbidden' using errcode='42501';end if;
if not (exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.tenant_id where m.tenant_id=p_tenant and m.user_id=p_actor and m.active and o.active and (m.role='org_admin' or (m.role='reception' and p_role='student'))) or (p_role='org_admin' and exists(select 1 from public.platform_admins where user_id=p_actor))) then raise exception 'Forbidden' using errcode='42501';end if;
insert into public.organization_memberships(tenant_id,user_id,role) values(p_tenant,p_user,p_role);
if p_role='student' then insert into public.residents(tenant_id,user_id,full_name,email) values(p_tenant,p_user,p_name,p_email);end if;
insert into public.audit_logs(tenant_id,actor_id,action,entity,entity_id) values(p_tenant,p_actor,'INVITE_MEMBER','organization_memberships',p_user::text);end$$;
create function public.provision_member(p_actor uuid,p_tenant uuid,p_user uuid,p_role public.member_role,p_name text,p_email text) returns void language sql security invoker set search_path='' as $$select private.provision_member(p_actor,p_tenant,p_user,p_role,p_name,p_email)$$;
revoke all on function private.provision_member(uuid,uuid,uuid,public.member_role,text,text),public.provision_member(uuid,uuid,uuid,public.member_role,text,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.provision_member(uuid,uuid,uuid,public.member_role,text,text),public.provision_member(uuid,uuid,uuid,public.member_role,text,text) to service_role;
create function private.message_notification() returns trigger language plpgsql security definer set search_path='' as $$begin
if private.has_role(new.tenant_id,array['org_admin','reception']::public.member_role[]) then insert into public.notifications(tenant_id,user_id,title,body) select r.tenant_id,s.user_id,'message_received',r.id::text from public.service_requests r join public.residents s on s.id=r.resident_id and s.tenant_id=r.tenant_id where r.id=new.request_id;end if;return new;end$$;
revoke all on function private.message_notification() from public,anon,authenticated;
create trigger notify_message after insert on public.service_request_messages for each row execute function private.message_notification();
