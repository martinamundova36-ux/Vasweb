-- Server-only final stage: the profile cannot activate until the Auth user
-- actually has a stored password and the verified questionnaire/photo are saved.
create or replace function public.residence_activate_profile_password(p_tenant uuid,p_user uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare changed integer:=0;
begin
 if not exists (
  select 1 from auth.users u where u.id=p_user
   and u.encrypted_password is not null and length(u.encrypted_password)>0
 ) then return false; end if;
 update public.residents r
  set profile_password_activated_at=now()
  where r.tenant_id=p_tenant and r.user_id=p_user and r.active=true
   and exists (
    select 1 from public.resident_enquiries q
    where q.tenant_id=r.tenant_id and q.resident_id=r.id
      and q.user_id=p_user and q.student_submitted_at is not null
   )
   and exists (
    select 1 from public.residence_portal_files f
     where f.tenant_id=r.tenant_id and f.resident_id=r.id
       and f.user_id=p_user and f.kind='profile_photo' and f.active=true
   );
 get diagnostics changed=row_count;
 return changed=1;
end;$$;
revoke all on function public.residence_activate_profile_password(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.residence_activate_profile_password(uuid,uuid)
 to service_role;
