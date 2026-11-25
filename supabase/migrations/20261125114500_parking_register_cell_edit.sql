create function public.update_parking_register_cell(p_tenant uuid, p_row bigint, p_column integer, p_value jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if not private.has_role(p_tenant, array['org_admin','reception']::public.member_role[]) then
  raise exception 'Staff access required' using errcode='42501';
 end if;
 if p_column is null or p_column not between 0 and 12 
    or jsonb_typeof(coalesce(p_value,'null'::jsonb)) not in ('string','number','null') or length(p_value::text)>2002
    or (p_column=0 and jsonb_typeof(coalesce(p_value,'null'::jsonb))<>'string') then
  raise exception 'Invalid parking cell' using errcode='22023';
 end if;
 if p_column=0 then
  update public.parking_register_test_rows set entry=p_value #>> '{}'
    where tenant_id=p_tenant and id=p_row;
 else
  update public.parking_register_test_rows
    set months=jsonb_set(months,array[(p_column-1)::text],coalesce(p_value,'null'::jsonb),false)
    where tenant_id=p_tenant and id=p_row;
 end if;
 return found;
end;
$$;
revoke all on function public.update_parking_register_cell(uuid,bigint,integer,jsonb) from public, anon;
grant execute on function public.update_parking_register_cell(uuid,bigint,integer,jsonb) to authenticated;
