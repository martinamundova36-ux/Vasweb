alter table public.residents add column archived_at timestamptz;

create function private.archive_residence_student(p_tenant uuid, p_resident uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.residents%rowtype;
begin
  if not private.has_role(p_tenant, array['org_admin']::public.member_role[]) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select * into target from public.residents
    where tenant_id = p_tenant and id = p_resident for update;
  if not found then
    raise exception 'Student record unavailable' using errcode = 'P0002';
  end if;

  perform 1 from public.profiles where id = target.user_id for update;
  perform 1 from public.organization_memberships where user_id = target.user_id for update;

  if target.user_id is null or target.user_id = auth.uid()
    or exists (select 1 from public.platform_admins where user_id = target.user_id)
    or exists (select 1 from public.organization_memberships
      where user_id = target.user_id and role <> 'student')
    or not exists (select 1 from public.organization_memberships
      where tenant_id = p_tenant and user_id = target.user_id and role = 'student') then
    raise exception 'Protected account' using errcode = '42501';
  end if;

  if target.archived_at is null then
    update public.residents
      set active = false, archived_at = statement_timestamp()
      where tenant_id = p_tenant and id = p_resident
      returning archived_at into target.archived_at;

    update public.organization_memberships set active = false
      where tenant_id = p_tenant and user_id = target.user_id and role = 'student';

    insert into public.audit_logs(tenant_id, actor_id, action, entity, entity_id)
      values (p_tenant, auth.uid(), 'archive', 'residents', p_resident::text);
  end if;
  return target.archived_at;
end;
$$;

revoke all on function private.archive_residence_student(uuid, uuid) from public, anon;
grant execute on function private.archive_residence_student(uuid, uuid) to authenticated;

create function public.archive_residence_student(p_tenant uuid, p_resident uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.archive_residence_student(p_tenant, p_resident)
$$;

revoke all on function public.archive_residence_student(uuid, uuid) from public, anon;
grant execute on function public.archive_residence_student(uuid, uuid) to authenticated;

alter table public.residents
  add constraint residence_archive_requires_inactive check (archived_at is null or not active);

create or replace function private.residence_tenancy_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_capacity integer;
  occupancy integer;
begin
  select capacity into room_capacity from public.rooms
    where id = new.room_id and tenant_id = new.tenant_id for update;
  if room_capacity is null then
    raise exception 'Room not found' using errcode = '22023';
  end if;
  if new.ends_on < new.starts_on then
    raise exception 'Invalid dates' using errcode = '22023';
  end if;
  if exists (select 1 from public.residents where tenant_id = new.tenant_id
      and id = new.resident_id and archived_at is not null) then
    raise exception 'Archived student' using errcode = '23514';
  end if;

  select count(*) into occupancy from public.tenancies t
    join public.residents r on r.tenant_id = t.tenant_id and r.id = t.resident_id
    where t.tenant_id = new.tenant_id and t.room_id = new.room_id
      and t.id <> new.id and t.starts_on <= new.ends_on and t.ends_on >= new.starts_on
      and r.archived_at is null;
  if occupancy >= room_capacity then
    raise exception 'Room capacity exceeded' using errcode = '23514';
  end if;
  if exists (select 1 from public.tenancies t where t.tenant_id = new.tenant_id
      and t.resident_id = new.resident_id and t.id <> new.id
      and t.starts_on <= new.ends_on and t.ends_on >= new.starts_on) then
    raise exception 'Overlapping resident accommodation' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.residence_room_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  peak integer;
begin
  with stays as (
    select t.starts_on, t.ends_on from public.tenancies t
      join public.residents r on r.tenant_id = t.tenant_id and r.id = t.resident_id
      where t.tenant_id = new.tenant_id and t.room_id = new.id and r.archived_at is null
  ), events as (
    select starts_on as event_date, 1 as delta from stays
    union all
    select ends_on + 1, -1 from stays
  ), occupancy as (
    select sum(sum(delta)) over (order by event_date) as used from events group by event_date
  )
  select coalesce(max(used), 0) into peak from occupancy;
  if new.capacity < peak then
    raise exception 'Room capacity below confirmed occupancy' using errcode = '23514';
  end if;
  return new;
end;
$$;
