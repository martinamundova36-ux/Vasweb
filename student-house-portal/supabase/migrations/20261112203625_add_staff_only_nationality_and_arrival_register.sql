-- Applied in Supabase project ydqchayscxntqdkzkynv as 20261112203625.
-- Staff-only supplementary fields for Excel room register. RLS denies student access.
create table if not exists public.resident_staff_details (
 tenant_id uuid not null,
 resident_id uuid not null,
 nationality text,
 actual_arrival_on date,
 updated_at timestamptz not null default now(),
 updated_by uuid,
 primary key (tenant_id,resident_id),
 constraint resident_staff_details_resident_fk foreign key (tenant_id,resident_id)
   references public.residents(tenant_id,id) on delete cascade,
 constraint resident_staff_details_nationality_check check
   (nationality is null or char_length(nationality)<=100)
);
alter table public.resident_staff_details enable row level security;
revoke all on public.resident_staff_details from public,anon;
grant select,insert,update on public.resident_staff_details to authenticated;
grant all on public.resident_staff_details to service_role;
create policy "staff_read_register_details" on public.resident_staff_details for select to authenticated
 using (private.has_role(tenant_id,array['org_admin'::public.member_role,'reception'::public.member_role]));
create policy "staff_insert_register_details" on public.resident_staff_details for insert to authenticated
 with check (private.has_role(tenant_id,array['org_admin'::public.member_role,'reception'::public.member_role]));
create policy "staff_update_register_details" on public.resident_staff_details for update to authenticated
 using (private.has_role(tenant_id,array['org_admin'::public.member_role,'reception'::public.member_role]))
 with check (private.has_role(tenant_id,array['org_admin'::public.member_role,'reception'::public.member_role]));
create or replace function private.resident_register_touch() returns trigger language plpgsql
 set search_path='' as $$
begin
 new.updated_at=now();
 new.updated_by=auth.uid();
 return new;
end $$;
create trigger resident_register_touch before insert or update on public.resident_staff_details
 for each row execute function private.resident_register_touch();
