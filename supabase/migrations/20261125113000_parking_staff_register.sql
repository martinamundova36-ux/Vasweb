alter table public.parking_requests enable row level security;
grant select on public.parking_requests to authenticated;
create policy parking_staff_read on public.parking_requests for select to authenticated
using (private.has_role(tenant_id, array['org_admin','reception']::public.member_role[]));
create table public.parking_register_test_rows (
 id bigint generated always as identity primary key,
 tenant_id uuid not null,
 source_row integer not null,
 year integer not null,
 entry text not null,
 months jsonb not null check (jsonb_typeof(months)='array' and jsonb_array_length(months)=12),
 unique (tenant_id, source_row)
);
alter table public.parking_register_test_rows enable row level security;
grant select on public.parking_register_test_rows to authenticated;
create policy parking_test_staff_read on public.parking_register_test_rows for select to authenticated
using (private.has_role(tenant_id, array['org_admin','reception']::public.member_role[]));
