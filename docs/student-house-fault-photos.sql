alter table public.residence_portal_files add column service_request_id uuid;
alter table public.residence_portal_files add foreign key(tenant_id,service_request_id) references public.service_requests(tenant_id,id);
alter table public.residence_portal_files drop constraint residence_portal_files_kind_check;
alter table public.residence_portal_files add constraint residence_portal_files_kind_check check(kind in ('profile_photo','rules_template','gdpr_template','contract_draft','signed_contract','signed_rules','signed_gdpr','resident_document','fault_photo'));
alter table public.residence_portal_files drop constraint valid_residence_file_owner;
alter table public.residence_portal_files add constraint valid_residence_file_owner check(
 (kind in ('rules_template','gdpr_template') and user_id is null and resident_id is null and review_status='not_applicable') or
 (kind in ('profile_photo','resident_document','contract_draft','fault_photo') and user_id is not null and resident_id is not null and review_status='not_applicable') or
 (kind in ('signed_contract','signed_rules','signed_gdpr') and user_id is not null and resident_id is not null and review_status in ('pending','approved','rejected')));
alter table public.residence_portal_files add constraint fault_photo_request_required check((kind='fault_photo' and service_request_id is not null and content_type in ('image/jpeg','image/png')) or (kind<>'fault_photo' and service_request_id is null));
create index fault_photos_by_request on public.residence_portal_files(tenant_id,service_request_id) where kind='fault_photo';
create policy fault_photos_own_read on public.residence_portal_files for select to authenticated
 using(kind='fault_photo' and active and user_id=auth.uid() and private.own_resident(tenant_id,resident_id));
create function private.residence_fault_photo_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='fault_photo' and not exists(select 1 from public.service_requests q join public.residents r on r.tenant_id=q.tenant_id and r.id=q.resident_id where q.tenant_id=new.tenant_id and q.id=new.service_request_id and q.resident_id=new.resident_id and r.user_id=new.user_id) then raise exception 'Photo and request owners differ' using errcode='22023';end if;
 return new;
end $$;
revoke all on function private.residence_fault_photo_owner() from public,anon,authenticated;
create trigger fault_photo_owner before insert or update on public.residence_portal_files for each row execute function private.residence_fault_photo_owner();
