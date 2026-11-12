-- Additive migration: preserve all existing tables and rows.
-- These two definitions reproduce the externally-added tables in fresh environments only.
create table if not exists public.service_requests(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organizations(id),resident_id uuid not null,category text not null check(category in ('maintenance','documents','parcel','other')),subject text not null check(length(trim(subject)) between 3 and 160),description text not null default '' check(length(description)<=4000),status text not null default 'new' check(status in ('new','in_progress','resolved','cancelled')),staff_note text not null default '' check(length(staff_note)<=4000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(tenant_id,resident_id) references public.residents(tenant_id,id));
create table if not exists public.cleaning_bookings(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organizations(id),resident_id uuid not null,preferred_date date not null,preferred_window text not null check(preferred_window in ('morning','afternoon','anytime')),notes text not null default '' check(length(notes)<=1500),status text not null default 'requested' check(status in ('requested','approved','rejected','completed','cancelled')),scheduled_at timestamptz,price_eur numeric(14,2) check(price_eur>=0),staff_note text not null default '' check(length(staff_note)<=1500),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(tenant_id,resident_id) references public.residents(tenant_id,id));
alter table public.service_requests enable row level security;
alter table public.cleaning_bookings enable row level security;
grant select,insert,update on public.service_requests,public.cleaning_bookings to authenticated;
do $$begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='service_requests' and policyname='requests_select') then
create policy requests_select on public.service_requests for select to authenticated using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]) or private.own_resident(tenant_id,resident_id));
create policy requests_insert on public.service_requests for insert to authenticated with check((private.own_resident(tenant_id,resident_id) and status='new' and staff_note='') or private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
create policy requests_update_staff on public.service_requests for update to authenticated using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[])) with check(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='cleaning_bookings' and policyname='cleaning_select') then
create policy cleaning_select on public.cleaning_bookings for select to authenticated using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]) or private.own_resident(tenant_id,resident_id));
create policy cleaning_insert on public.cleaning_bookings for insert to authenticated with check((private.own_resident(tenant_id,resident_id) and status='requested' and scheduled_at is null and price_eur is null and staff_note='') or private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
create policy cleaning_update_staff on public.cleaning_bookings for update to authenticated using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[])) with check(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));end if;end$$;
create unique index if not exists requests_tenant_identity on public.service_requests(tenant_id,id);
create index if not exists requests_queue on public.service_requests(tenant_id,status,created_at);
create index if not exists cleaning_queue on public.cleaning_bookings(tenant_id,status,preferred_date);
create function private.validate_daily_operation() returns trigger language plpgsql set search_path='' as $$begin
if tg_op='UPDATE' and (new.tenant_id<>old.tenant_id or new.resident_id<>old.resident_id or new.id<>old.id or new.created_at<>old.created_at) then raise exception 'Immutable ownership' using errcode='22023';end if;
new.updated_at:=now();
if tg_table_name='cleaning_bookings' then
if tg_op='INSERT' and new.preferred_date<current_date then raise exception 'Past date' using errcode='22023';end if;
if new.status in ('approved','completed') and (new.scheduled_at is null or new.price_eur is null) then raise exception 'Schedule and confirmed price required' using errcode='22023';end if;
if new.price_eur is not null and new.price_eur<>round(new.price_eur,2) then raise exception 'Invalid monetary precision' using errcode='22023';end if;
end if;return new;end$$;
revoke all on function private.validate_daily_operation() from public,anon,authenticated;
create trigger validate_daily before insert or update on public.service_requests for each row execute function private.validate_daily_operation();
create trigger validate_daily before insert or update on public.cleaning_bookings for each row execute function private.validate_daily_operation();
create trigger audit_daily after insert or update on public.service_requests for each row execute function private.audit_write();
create trigger audit_daily after insert or update on public.cleaning_bookings for each row execute function private.audit_write();
create table public.service_request_messages(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.organizations(id),request_id uuid not null,author_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 4000),created_at timestamptz not null default now(),foreign key(tenant_id,request_id) references public.service_requests(tenant_id,id),foreign key(tenant_id,author_id) references public.organization_memberships(tenant_id,user_id));
alter table public.service_request_messages enable row level security;
grant select,insert on public.service_request_messages to authenticated;
create policy messages_read on public.service_request_messages for select to authenticated using(private.has_role(tenant_id) and exists(select 1 from public.service_requests r where r.id=request_id and r.tenant_id=service_request_messages.tenant_id));
create policy messages_insert on public.service_request_messages for insert to authenticated with check(author_id=auth.uid() and private.has_role(tenant_id) and exists(select 1 from public.service_requests r where r.id=request_id and r.tenant_id=service_request_messages.tenant_id));
create index on public.service_request_messages(tenant_id,request_id,created_at);
create trigger audit_message after insert on public.service_request_messages for each row execute function private.audit_write();
alter table public.profiles add column if not exists phone text not null default '' check(length(phone)<=50);
alter table public.profiles add column if not exists preferred_language text not null default 'sk' check(preferred_language in ('sk','en','ru','uk'));
alter table public.notifications add column if not exists read_at timestamptz;
create function private.update_my_profile(p_name text,p_phone text,p_language text) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.active) or not exists(select 1 from auth.sessions s where s.user_id=auth.uid() and s.id=(auth.jwt()->>'session_id')::uuid) then raise exception 'Forbidden' using errcode='42501';end if;
if length(trim(p_name)) not between 1 and 200 or length(p_phone)>50 or p_language not in ('sk','en','ru','uk') then raise exception 'Invalid profile' using errcode='22023';end if;
update public.profiles set display_name=trim(p_name),phone=p_phone,preferred_language=p_language where id=auth.uid();
insert into public.audit_logs(actor_id,action,entity,entity_id) values(auth.uid(),'UPDATE_OWN_PROFILE','profiles',auth.uid()::text);end$$;
create function public.update_my_profile(p_name text,p_phone text,p_language text) returns void language sql security invoker set search_path='' as $$select private.update_my_profile(p_name,p_phone,p_language)$$;
create function private.mark_notification(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
update public.notifications n set read_at=now() where n.id=p_id and n.user_id=auth.uid() and private.has_role(n.tenant_id);if not found then raise exception 'Forbidden' using errcode='42501';end if;end$$;
create function public.mark_notification(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.mark_notification(p_id)$$;
revoke all on function private.update_my_profile(text,text,text),private.mark_notification(uuid),public.update_my_profile(text,text,text),public.mark_notification(uuid) from public,anon;
grant execute on function private.update_my_profile(text,text,text),private.mark_notification(uuid),public.update_my_profile(text,text,text),public.mark_notification(uuid) to authenticated;
-- Never allow a change of currency to reinterpret an already posted ledger.
create function private.protect_currency() returns trigger language plpgsql security definer set search_path='' as $$begin
if new.currency<>old.currency and (exists(select 1 from public.rent_charges where tenant_id=old.tenant_id) or exists(select 1 from public.payments where tenant_id=old.tenant_id)) then raise exception 'Currency locked after first ledger entry' using errcode='22023';end if;return new;end$$;
revoke all on function private.protect_currency() from public,anon,authenticated;
create trigger protect_currency before update on public.organization_settings for each row execute function private.protect_currency();
create function private.operation_notification() returns trigger language plpgsql security definer set search_path='' as $$declare u uuid;begin
select user_id into u from public.residents where tenant_id=new.tenant_id and id=new.resident_id;
if tg_op='UPDATE' and (new.status<>old.status or new.staff_note<>old.staff_note) then
insert into public.notifications(tenant_id,user_id,title,body) values(new.tenant_id,u,tg_table_name||'_updated',new.id::text);end if;return new;end$$;
revoke all on function private.operation_notification() from public,anon,authenticated;
create trigger notify_operation after update on public.service_requests for each row execute function private.operation_notification();
create trigger notify_operation after update on public.cleaning_bookings for each row execute function private.operation_notification();
