create function public.update_residence_register_contact(p_tenant uuid, p_resident uuid, p_field text, p_value text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
 if not private.has_role(p_tenant, array['org_admin','reception']::public.member_role[]) then
  raise exception 'Staff access required' using errcode='42501';
 end if;
 if p_field = 'permanent_address' and length(btrim(p_value)) between 1 and 500 then
  update public.resident_enquiries set permanent_address=btrim(p_value)
   where tenant_id=p_tenant and resident_id=p_resident;
 elsif p_field = 'telephone' and length(btrim(p_value)) between 1 and 60 then
  update public.resident_enquiries set telephone=btrim(p_value)
   where tenant_id=p_tenant and resident_id=p_resident;
 else
  raise exception 'Invalid contact field' using errcode='22023';
 end if;
 return found;
end;
$$;
revoke all on function public.update_residence_register_contact(uuid,uuid,text,text) from public, anon;
grant execute on function public.update_residence_register_contact(uuid,uuid,text,text) to authenticated;
