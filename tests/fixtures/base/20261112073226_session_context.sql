create function private.session_context() returns jsonb language plpgsql stable security definer set search_path='' as $$declare password_required boolean;begin
if auth.uid() is null or not exists(select 1 from auth.sessions s where s.user_id=auth.uid() and s.id=(auth.jwt()->>'session_id')::uuid and (s.not_after is null or s.not_after>now())) or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.active) then raise exception 'Session invalid' using errcode='42501';end if;
select coalesce(encrypted_password,'')='' into password_required from auth.users where id=auth.uid();return jsonb_build_object('valid',true,'needs_password',password_required);end$$;
create function public.session_context() returns jsonb language sql security invoker set search_path='' as $$select private.session_context()$$;
revoke all on function private.session_context(),public.session_context() from public,anon;
grant execute on function private.session_context(),public.session_context() to authenticated;
