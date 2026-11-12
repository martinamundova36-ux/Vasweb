create function private.platform_metrics() returns table(tenant_id uuid,active_users bigint,document_count bigint) language plpgsql stable security definer set search_path='' as $$begin
if not private.is_platform() then raise exception 'Forbidden' using errcode='42501';end if;
return query select o.id,(select count(*) from public.organization_memberships m join public.profiles p on p.id=m.user_id where m.tenant_id=o.id and m.active and p.active),(select count(*) from public.documents d where d.tenant_id=o.id) from public.organizations o;end$$;
revoke all on function private.platform_metrics() from public,anon;
grant execute on function private.platform_metrics() to authenticated;
create function public.platform_metrics() returns table(tenant_id uuid,active_users bigint,document_count bigint) language sql security invoker set search_path='' as $$select * from private.platform_metrics()$$;
revoke all on function public.platform_metrics() from public,anon;
grant execute on function public.platform_metrics() to authenticated;
