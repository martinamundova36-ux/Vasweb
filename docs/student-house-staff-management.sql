create function public.residence_update_staff(p_actor uuid,p_tenant uuid,p_user uuid,p_role public.member_role,p_active boolean)
 returns boolean language plpgsql security definer set search_path='' as $$
declare previous public.organization_memberships;
begin
 if not private.residence_staff_actor(p_tenant,p_actor) or not exists(select 1 from public.organization_memberships where tenant_id=p_tenant and user_id=p_actor and role='org_admin' and active) then raise exception 'Forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':staff',0));
 if p_role not in ('org_admin','reception') or p_active is null then raise exception 'Invalid staff role' using errcode='22023';end if;
 select * into previous from public.organization_memberships where tenant_id=p_tenant and user_id=p_user for update;
 if not found or previous.role not in ('org_admin','reception') then raise exception 'Staff member not found' using errcode='22023';end if;
 if previous.role='org_admin' and previous.active and (p_role<>'org_admin' or not p_active) and
  (select count(*) from public.organization_memberships where tenant_id=p_tenant and role='org_admin' and active)<=1 then raise exception 'Last administrator must remain active' using errcode='22023';end if;
 update public.organization_memberships set role=p_role,active=p_active where tenant_id=p_tenant and user_id=p_user;
 return true;
end $$;
revoke all on function public.residence_update_staff(uuid,uuid,uuid,public.member_role,boolean) from public,anon,authenticated;
grant execute on function public.residence_update_staff(uuid,uuid,uuid,public.member_role,boolean) to service_role;

create function private.residence_announcement_event() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
 for r in select user_id,email from public.residents where tenant_id=new.tenant_id and active and profile_password_activated_at is not null loop
  insert into public.notifications(tenant_id,user_id,title,body) values(new.tenant_id,r.user_id,'announcement',new.title);
  perform private.residence_enqueue_mail(new.tenant_id,'announcement:'||new.id::text||':'||r.user_id::text,'student',r.email,'Student House: oznam / announcement',new.title||E'\nNový oznam recepcie nájdeš v portáli. / Open your portal to read the new reception announcement. / Новое объявление в вашем профиле. / Нове оголошення у вашому профілі.');
 end loop;return new;
end $$;
revoke all on function private.residence_announcement_event() from public,anon,authenticated;
create trigger residence_announcement_mail after insert on public.announcements for each row execute function private.residence_announcement_event();
