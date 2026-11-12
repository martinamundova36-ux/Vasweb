CREATE OR REPLACE FUNCTION private.residence_staff_actor(p_tenant uuid, p_actor uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(
 select 1 from public.organization_memberships m
 join public.organizations o on o.id=m.tenant_id
 join public.profiles p on p.id=m.user_id
 where m.tenant_id=p_tenant and m.user_id=p_actor and m.active and o.active and p.active
   and m.role in ('org_admin'::public.member_role,'reception'::public.member_role)
) $function$;

CREATE OR REPLACE FUNCTION public.residence_record_charge(p_actor uuid, p_tenant uuid, p_resident uuid, p_period text, p_amount numeric, p_due_on date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare id uuid;
begin
 if not private.residence_staff_actor(p_tenant,p_actor) then
   raise exception 'Forbidden' using errcode='42501';end if;
 if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or p_amount<=0 or p_amount>100000 or round(p_amount,2)<>p_amount or p_due_on is null then
   raise exception 'Invalid charge' using errcode='22023';end if;
 if not exists(select 1 from public.residents r where r.id=p_resident and r.tenant_id=p_tenant and r.active) then
   raise exception 'Invalid resident' using errcode='22023';end if;
 insert into public.rent_charges(tenant_id,resident_id,period,kind,amount,due_on)
 values(p_tenant,p_resident,p_period,'rent',p_amount,p_due_on) returning rent_charges.id into id;
 insert into public.audit_logs(tenant_id,actor_id,action,entity,entity_id)
 values(p_tenant,p_actor,'RENT_CHARGE_CREATED','rent_charges',id::text);
 return id;
end $function$;

CREATE OR REPLACE FUNCTION private.residence_tenancy_capacity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_capacity integer;v_occupancy integer;
begin
 select r.capacity into v_capacity
 from public.rooms r where r.id=new.room_id and r.tenant_id=new.tenant_id
 for update;
 if v_capacity is null then raise exception 'Room not found' using errcode='22023';end if;
 if new.ends_on<new.starts_on then raise exception 'Invalid dates' using errcode='22023';end if;
 select count(*) into v_occupancy from public.tenancies t
 where t.tenant_id=new.tenant_id and t.room_id=new.room_id
   and t.id<>new.id and t.starts_on<=new.ends_on and t.ends_on>=new.starts_on;
 if v_occupancy>=v_capacity then raise exception 'Room capacity exceeded' using errcode='23514';end if;
 if exists(
  select 1 from public.tenancies t where t.tenant_id=new.tenant_id and t.resident_id=new.resident_id
  and t.id<>new.id and t.starts_on<=new.ends_on and t.ends_on>=new.starts_on
 ) then raise exception 'Overlapping resident accommodation' using errcode='23514';end if;
 return new;
end $function$;
