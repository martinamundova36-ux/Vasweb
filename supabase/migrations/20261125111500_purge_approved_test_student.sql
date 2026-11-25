-- Issued only by privileged operators after verifying the recovery copy
-- and approving the exact test record. There is no portal write access.
create table private.residence_test_purge_approvals (
  tenant_id uuid not null,
  resident_id uuid not null,
  user_id uuid not null,
  backup_reference text not null check (length(trim(backup_reference)) > 0),
  expires_at timestamptz not null,
  primary key (tenant_id, resident_id)
);
revoke all on private.residence_test_purge_approvals from public, anon, authenticated;

create function private.purge_approved_test_student(p_tenant uuid, p_resident uuid, p_confirmation text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.residents%rowtype;
begin
  if not private.has_role(p_tenant, array['org_admin']::public.member_role[])
    or p_confirmation is null or p_confirmation is distinct from 'DELETE' then
    raise exception 'Administrator confirmation required' using errcode = '42501';
  end if;

  select * into target from public.residents
    where tenant_id = p_tenant and id = p_resident for update;
  if not found then return 'unavailable'; end if;

  perform 1 from public.profiles where id = target.user_id for update;
  perform 1 from public.organization_memberships where user_id = target.user_id for update;
  if target.user_id is null or target.user_id = auth.uid()
    or exists (select 1 from public.platform_admins where user_id = target.user_id)
    or exists (select 1 from public.organization_memberships where user_id = target.user_id and role <> 'student')
    or not exists (select 1 from public.organization_memberships
      where tenant_id = p_tenant and user_id = target.user_id and role = 'student') then
    return 'protected';
  end if;

  perform 1 from private.residence_test_purge_approvals
    where tenant_id = p_tenant and resident_id = p_resident and user_id = target.user_id
      and expires_at > statement_timestamp() for update;
  if not found then return 'approval_required'; end if;

  -- Storage bytes must first be backed up and removed using the Storage API.
  -- Deleting storage.objects rows directly leaves underlying files behind.
  if exists (
    select 1 from storage.objects o
    where (o.bucket_id = 'residence-portal-files' and exists (
      select 1 from public.residence_portal_files f
      where f.tenant_id = p_tenant and f.object_path = o.name
        and (f.resident_id = p_resident or (f.resident_id is null and f.user_id = target.user_id))
        and f.kind not in ('rules_template','gdpr_template','contract_template','certificate_template','deposit_template')
    )) or (o.bucket_id = 'residence-private' and exists (
      select 1 from public.documents d where d.tenant_id = p_tenant and d.resident_id = p_resident and d.object_path = o.name
    ))
  ) then return 'storage_pending'; end if;

  delete from public.residence_mail_outbox
    where tenant_id = p_tenant and (
      (audience = 'student' and lower(recipient) = lower(target.email))
      or reminder_charge_id in (select id from public.rent_charges where tenant_id = p_tenant and resident_id = p_resident)
      or reminder_item_id in (select i.id from public.installment_items i join public.installment_plans p
        on p.id = i.plan_id and p.tenant_id = i.tenant_id where p.tenant_id = p_tenant and p.resident_id = p_resident)
    );
  delete from public.payment_allocations where tenant_id = p_tenant and (
    payment_id in (select id from public.payments where tenant_id = p_tenant and resident_id = p_resident)
    or charge_id in (select id from public.rent_charges where tenant_id = p_tenant and resident_id = p_resident));
  delete from public.payment_reversals where tenant_id = p_tenant
    and payment_id in (select id from public.payments where tenant_id = p_tenant and resident_id = p_resident);
  delete from public.payments where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.installment_items where tenant_id = p_tenant
    and plan_id in (select id from public.installment_plans where tenant_id = p_tenant and resident_id = p_resident);
  delete from public.installment_plans where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.rent_charges where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.document_access where tenant_id = p_tenant and (
    user_id = target.user_id or document_id in
      (select id from public.documents where tenant_id = p_tenant and resident_id = p_resident));
  delete from public.documents where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.residence_portal_files where tenant_id = p_tenant
    and (resident_id = p_resident or (resident_id is null and user_id = target.user_id))
    and kind not in ('rules_template','gdpr_template','contract_template','certificate_template','deposit_template');
  delete from public.service_request_messages where tenant_id = p_tenant and (
    author_id = target.user_id or request_id in
      (select id from public.service_requests where tenant_id = p_tenant and resident_id = p_resident));
  delete from public.service_requests where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.cleaning_bookings where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.notifications where tenant_id = p_tenant and user_id = target.user_id;
  delete from public.resident_enquiry_reviews where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.resident_enquiries where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.resident_staff_details where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.parking_requests where tenant_id = p_tenant and lower(email) = lower(target.email);
  delete from public.registration_requests where tenant_id = p_tenant and lower(email) = lower(target.email);
  delete from public.room_register_cells where tenant_id = p_tenant and split_part(row_key, ':', 4) = p_resident::text;
  delete from public.tenancies where tenant_id = p_tenant and resident_id = p_resident;
  delete from public.residents where tenant_id = p_tenant and id = p_resident;
  delete from public.organization_memberships
    where tenant_id = p_tenant and user_id = target.user_id and role = 'student';

  if not exists (select 1 from public.organization_memberships where user_id = target.user_id) then
    -- Foreign keys intentionally stop the transaction if this login still
    -- owns protected records or has references outside this cleanup.
    delete from public.profiles where id = target.user_id;
    delete from auth.users where id = target.user_id;
  end if;

  delete from private.residence_test_purge_approvals where tenant_id = p_tenant and resident_id = p_resident;
  insert into public.audit_logs(tenant_id, actor_id, action, entity, entity_id)
    values (p_tenant, auth.uid(), 'purge_approved_test_student', 'residents', p_resident::text);
  return 'deleted';
end;
$$;

revoke all on function private.purge_approved_test_student(uuid,uuid,text) from public, anon;
grant execute on function private.purge_approved_test_student(uuid,uuid,text) to authenticated;

create function public.purge_approved_test_student(p_tenant uuid, p_resident uuid, p_confirmation text)
returns text language sql security invoker set search_path = ''
as $$ select private.purge_approved_test_student(p_tenant,p_resident,p_confirmation) $$;

revoke all on function public.purge_approved_test_student(uuid,uuid,text) from public, anon;
grant execute on function public.purge_approved_test_student(uuid,uuid,text) to authenticated;
