-- Atomic verified reception approval deployed to WEBU Residence.
-- Only the authenticated manage Edge function calls this service-only transaction.
-- Room assignment, verified identity, monthly charges and request status commit together.
create or replace function public.residence_approve_registration_verified(
 p_actor uuid,p_tenant uuid,p_registration uuid,p_user uuid,
 p_monthly_rent numeric,p_due_day integer,p_schedule jsonb,p_assignment jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare req public.registration_requests%rowtype;room public.rooms%rowtype;
 person public.residents%rowtype; item jsonb; period text; month_start date;
 amount numeric; due date; new_tenancy uuid; expected integer; seen text[]:='{}';
begin
 if not private.residence_staff_actor(p_tenant,p_actor) then raise exception 'Forbidden' using errcode='42501';end if;
 select * into req from public.registration_requests where id=p_registration and tenant_id=p_tenant for update;
 if not found or req.status<>'pending' then raise exception 'registration_not_pending' using errcode='23514';end if;
 if not exists(select 1 from auth.users where id=p_user and lower(email)=lower(req.email)) then raise exception 'identity_mismatch' using errcode='23514';end if;
 -- Reception supplies the verified contract, room and period in this same transaction.
 if p_assignment is null or jsonb_typeof(p_assignment)<>'object'
   then raise exception 'verified_assignment_required' using errcode='22023';end if;
 req.contract_number:=btrim(coalesce(p_assignment->>'contract_number',''));
 req.room_number:=btrim(coalesce(p_assignment->>'room_number',''));
 if length(req.contract_number)<5 or length(req.contract_number)>100 or length(req.room_number)<1 or length(req.room_number)>30
   then raise exception 'verified_assignment_required' using errcode='22023';end if;
 if coalesce(p_assignment->>'accommodation_from','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_assignment->>'accommodation_to','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   then raise exception 'verified_dates_required' using errcode='22023';end if;
 req.accommodation_from:=(p_assignment->>'accommodation_from')::date;
 req.accommodation_to:=(p_assignment->>'accommodation_to')::date;
 if req.accommodation_from is null or req.accommodation_to is null
    or req.accommodation_to<=req.accommodation_from
    or req.accommodation_to>req.accommodation_from+interval '10 years'
   then raise exception 'invalid_dates' using errcode='22023';end if;
 update public.registration_requests set contract_number=req.contract_number, room_number=req.room_number,
   accommodation_from=req.accommodation_from, accommodation_to=req.accommodation_to
 where id=req.id and tenant_id=p_tenant and status='pending';
 if p_monthly_rent is null or p_monthly_rent<=0 or p_monthly_rent>100000 or round(p_monthly_rent,2)<>p_monthly_rent or p_due_day is null or p_due_day not between 1 and 28 then raise exception 'invalid_rent' using errcode='22023';end if;
 if req.accommodation_to<req.accommodation_from or req.accommodation_to>req.accommodation_from+interval '10 years' then raise exception 'invalid_dates' using errcode='22023';end if;
 select * into room from public.rooms where tenant_id=p_tenant and name=req.room_number for update;
 if not found then raise exception 'verified_room_required' using errcode='23514';end if;
 -- Serialize approvals for the same account and tenant, including distinct pending requests.
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_user::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||req.contract_number,1));
 if exists(select 1 from public.organization_memberships where tenant_id=p_tenant and user_id=p_user) then
  if not exists(select 1 from public.organization_memberships where tenant_id=p_tenant and user_id=p_user and role='student' and active) then raise exception 'membership_conflict' using errcode='23514';end if;
 else
  perform private.provision_member(p_actor,p_tenant,p_user,'student',req.first_name||' '||req.last_name,req.email);
 end if;
 select * into person from public.residents where tenant_id=p_tenant and user_id=p_user for update;
 if not found or not person.active then raise exception 'resident_required' using errcode='23514';end if;
 if person.verified_contract_number<>'' and person.verified_contract_number<>req.contract_number then raise exception 'existing_contract_conflict' using errcode='23514';end if;
 if exists(select 1 from public.residents where tenant_id=p_tenant and id<>person.id and verified_contract_number=req.contract_number) then raise exception 'duplicate_contract' using errcode='23514';end if;
 update public.residents set full_name=req.first_name||' '||req.last_name,email=req.email,
 verified_room_number=room.name,verified_contract_number=req.contract_number,
 accommodation_from=req.accommodation_from,accommodation_to=req.accommodation_to where id=person.id;
 insert into public.tenancies(tenant_id,resident_id,room_id,starts_on,ends_on,rent,due_day)
 values(p_tenant,person.id,room.id,req.accommodation_from,req.accommodation_to,p_monthly_rent,p_due_day) returning id into new_tenancy;
 -- Existing tenancy trigger locks the room and validates overlap and capacity.
 expected:=((extract(year from req.accommodation_to)::int-extract(year from req.accommodation_from)::int)*12+extract(month from req.accommodation_to)::int-extract(month from req.accommodation_from)::int)+1;
 if p_schedule is null or jsonb_typeof(p_schedule)<>'array' or jsonb_array_length(p_schedule)<>expected then raise exception 'incomplete_schedule' using errcode='22023';end if;
 for item in select * from jsonb_array_elements(p_schedule) loop
  period:=item->>'period';amount:=(item->>'amount')::numeric;due:=(item->>'due_on')::date;
  if period is null or period!~'^[0-9]{4}-(0[1-9]|1[0-2])$' or period=any(seen) or amount is null or amount<=0 or round(amount,2)<>amount or due is null then raise exception 'invalid_schedule' using errcode='22023';end if;
  month_start:=(period||'-01')::date;
  if month_start<date_trunc('month',req.accommodation_from)::date or month_start>date_trunc('month',req.accommodation_to)::date then raise exception 'invalid_period' using errcode='22023';end if;
  seen:=array_append(seen,period);
  perform public.residence_record_charge(p_actor,p_tenant,person.id,period,amount,due);
 end loop;
 update public.registration_requests set status='invited',reviewed_by=p_actor,reviewed_at=now() where id=req.id;
 insert into public.audit_logs(tenant_id,actor_id,action,entity,entity_id)
 values(p_tenant,p_actor,'REGISTRATION_CONTRACT_APPROVED','registration_requests',req.id::text);
 return new_tenancy;
end $$;
revoke all on function public.residence_approve_registration_verified(uuid,uuid,uuid,uuid,numeric,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.residence_approve_registration_verified(uuid,uuid,uuid,uuid,numeric,integer,jsonb,jsonb) to service_role;

