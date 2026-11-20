-- Deployed as Supabase migration 20261120223225.
-- Create operational reception record for each new resident, preserving staff edits.
create or replace function private.residence_create_staff_record()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.resident_staff_details(tenant_id,resident_id,nationality)
  values (
    new.tenant_id,new.id,
    (select nullif(e.nationality,'')
     from public.registration_requests rr
     join public.registration_enquiries e on e.registration_id=rr.id
     where rr.tenant_id=new.tenant_id
       and lower(rr.email)=lower(new.email)
       and nullif(e.nationality,'') is not null
     order by rr.created_at desc
     limit 1)
  )
  on conflict (tenant_id,resident_id) do nothing;
  return new;
end;
$$;
revoke all on function private.residence_create_staff_record() from public,anon,authenticated;
drop trigger if exists residence_create_staff_record on public.residents;
create trigger residence_create_staff_record
after insert on public.residents
for each row execute function private.residence_create_staff_record();
