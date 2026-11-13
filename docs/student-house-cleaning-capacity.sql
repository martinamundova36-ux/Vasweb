-- Add bookable capacity to the existing cleaning workflow. No synthetic availability.
create table public.cleaning_slots (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.organizations(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 resource text not null default 'Upratovanie' check(length(trim(resource)) between 1 and 100),
 capacity integer not null default 1 check(capacity between 1 and 20),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours')
);
alter table public.cleaning_slots enable row level security;
grant select,insert,update on public.cleaning_slots to authenticated;
create policy cleaning_slots_staff on public.cleaning_slots for all to authenticated
 using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]))
 with check(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
create policy cleaning_slots_session on public.cleaning_slots as restrictive for all to authenticated
 using(private.has_role(tenant_id)) with check(private.has_role(tenant_id));
alter table public.cleaning_bookings add column slot_id uuid;
alter table public.cleaning_bookings add foreign key(tenant_id,slot_id) references public.cleaning_slots(tenant_id,id);
create index cleaning_slot_occupancy on public.cleaning_bookings(tenant_id,slot_id,status);

create function private.residence_cleaning_slot_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Serialize capacity edits and bookings within this organization. No visibility of other residents is granted.
 perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text||':cleaning',0));
 if tg_op='UPDATE' and (new.tenant_id<>old.tenant_id or new.id<>old.id or new.created_at<>old.created_at) then
  raise exception 'Immutable slot ownership' using errcode='22023';
 end if;
 if exists(select 1 from public.cleaning_slots s where s.tenant_id=new.tenant_id and s.id<>new.id
  and s.resource=new.resource and s.enabled and new.enabled and s.starts_at<new.ends_at and s.ends_at>new.starts_at) then
  raise exception 'Overlapping cleaning resource' using errcode='23505';
 end if;
 if tg_op='UPDATE' and exists(select 1 from public.cleaning_bookings b where b.tenant_id=new.tenant_id and b.slot_id=new.id
  and b.status in ('requested','proposed','approved','completed')) then
  if new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.resource<>old.resource then
   raise exception 'Move bookings before moving the slot' using errcode='22023';
  end if;
  if new.capacity<(select count(*) from public.cleaning_bookings b where b.tenant_id=new.tenant_id and b.slot_id=new.id and b.status in ('requested','proposed','approved','completed')) then
   raise exception 'Capacity below reservations' using errcode='22023';
  end if;
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.residence_cleaning_slot_guard() from public,anon,authenticated;
create trigger cleaning_slot_guard before insert or update on public.cleaning_slots for each row execute function private.residence_cleaning_slot_guard();
create trigger audit_cleaning_slot after insert or update on public.cleaning_slots for each row execute function private.audit_write();

create function private.residence_cleaning_booking_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.cleaning_slots; changed boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text||':cleaning',0));
 changed:=tg_op='INSERT';
 if tg_op='UPDATE' then changed:=new.slot_id is distinct from old.slot_id or (new.status in ('requested','proposed','approved') and old.status in ('rejected','cancelled'));end if;
 if new.slot_id is null then
  if (tg_op='INSERT' or new.status in ('proposed','approved')) then raise exception 'Select an available cleaning slot' using errcode='22023';end if;
  return new;
 end if;
 select * into s from public.cleaning_slots where id=new.slot_id and tenant_id=new.tenant_id;
 if not found then raise exception 'Invalid cleaning slot' using errcode='22023';end if;
 if changed and (not s.enabled or s.starts_at<=now()) then raise exception 'Slot unavailable' using errcode='22023';end if;
 if new.status in ('requested','proposed','approved','completed') and
  (select count(*) from public.cleaning_bookings b where b.tenant_id=new.tenant_id and b.slot_id=new.slot_id and b.id<>new.id and b.status in ('requested','proposed','approved','completed'))>=s.capacity then
  raise exception 'Cleaning slot is full' using errcode='23505';
 end if;
 if changed then new.preferred_date:=(s.starts_at at time zone 'Europe/Bratislava')::date;end if;
 if new.status in ('proposed','approved','completed') then new.scheduled_at:=s.starts_at;end if;
 if new.status='rejected' and length(trim(new.staff_note))=0 then raise exception 'Rejection reason required' using errcode='22023';end if;
 return new;
end $$;
revoke all on function private.residence_cleaning_booking_guard() from public,anon,authenticated;
create trigger cleaning_capacity_guard before insert or update on public.cleaning_bookings for each row execute function private.residence_cleaning_booking_guard();

-- This authenticated API returns counts, never names, room numbers or booking identifiers.
create function public.residence_cleaning_availability(p_tenant uuid)
 returns table(id uuid,starts_at timestamptz,ends_at timestamptz,resource text,remaining integer)
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_role(p_tenant) then raise exception 'Forbidden' using errcode='42501';end if;
 return query select s.id,s.starts_at,s.ends_at,s.resource,
 greatest(0,s.capacity-count(b.id)::integer) from public.cleaning_slots s
 left join public.cleaning_bookings b on b.tenant_id=s.tenant_id and b.slot_id=s.id and b.status in ('requested','proposed','approved','completed')
 where s.tenant_id=p_tenant and s.enabled and s.starts_at>now() and s.starts_at<now()+interval '93 days'
 group by s.id order by s.starts_at limit 500;
end $$;
revoke all on function public.residence_cleaning_availability(uuid) from public,anon;
grant execute on function public.residence_cleaning_availability(uuid) to authenticated;
