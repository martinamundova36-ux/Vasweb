create function private.valid_session() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from auth.sessions s join public.profiles p on p.id=s.user_id where s.user_id=auth.uid() and s.id=(auth.jwt()->>'session_id')::uuid and p.active and (s.not_after is null or s.not_after>now()))$$;
revoke all on function private.valid_session() from public,anon;
grant execute on function private.valid_session() to authenticated;
create or replace function private.has_role(t uuid,roles public.member_role[] default array['org_admin','reception','student']::public.member_role[]) returns boolean language sql stable security definer set search_path='' as $$select private.valid_session() and exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.tenant_id where m.tenant_id=t and m.user_id=auth.uid() and m.active and o.active and m.role=any(roles))$$;
create or replace function private.is_platform() returns boolean language sql stable security definer set search_path='' as $$select private.valid_session() and exists(select 1 from public.platform_admins where user_id=auth.uid())$$;
create policy live_profile_session on public.profiles as restrictive for select to authenticated using(private.valid_session());
create function private.platform_settings(p_tenant uuid,p_name text,p_languages text[],p_color text,p_logo text) returns void language plpgsql security definer set search_path='' as $$begin
if not private.is_platform() then raise exception 'Forbidden' using errcode='42501';end if;
if length(trim(p_name)) not between 1 and 200 or not p_languages<@array['sk','en','ru','uk']::text[] or cardinality(p_languages)<1 or p_color!~'^#[0-9A-Fa-f]{6}$' or (p_logo is not null and p_logo!~'^https://') then raise exception 'Invalid settings' using errcode='22023';end if;
update public.organizations set name=trim(p_name) where id=p_tenant;
update public.organization_settings set languages=p_languages,primary_color=p_color,logo_url=p_logo where tenant_id=p_tenant;end$$;
create function public.platform_settings(p_tenant uuid,p_name text,p_languages text[],p_color text,p_logo text) returns void language sql security invoker set search_path='' as $$select private.platform_settings(p_tenant,p_name,p_languages,p_color,p_logo)$$;
revoke all on function private.platform_settings(uuid,text,text[],text,text),public.platform_settings(uuid,text,text[],text,text) from public,anon;
grant execute on function private.platform_settings(uuid,text,text[],text,text),public.platform_settings(uuid,text,text[],text,text) to authenticated;
