-- Already deployed as migration 20261114184438.
-- Service-only password availability check; never expose Auth hashes to the browser.
create or replace function public.residence_account_has_password(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from auth.users
  where id=p_user and encrypted_password is not null and length(encrypted_password)>0);
$fn$;
revoke all on function public.residence_account_has_password(uuid) from public,anon,authenticated;
grant execute on function public.residence_account_has_password(uuid) to service_role;
