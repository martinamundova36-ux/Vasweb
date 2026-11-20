create table public.room_register_cells (
 tenant_id uuid not null,
 row_key text not null check (char_length(row_key) between 1 and 130),
 column_index smallint not null check (column_index between 0 and 100),
 cell_text text check (char_length(cell_text) <= 2000),
 note text not null default '' check (char_length(note) <= 4000),
 color text check (color ~ '^#[0-9a-fA-F]{6}$'),
 primary key (tenant_id,row_key,column_index)
);
alter table public.room_register_cells enable row level security;
revoke all on public.room_register_cells from anon, authenticated;
grant select, insert, update, delete on public.room_register_cells to authenticated;
create policy register_staff_cells on public.room_register_cells for all to authenticated
 using (private.has_role(tenant_id, array['org_admin'::public.member_role,'reception'::public.member_role]))
 with check (private.has_role(tenant_id, array['org_admin'::public.member_role,'reception'::public.member_role]));