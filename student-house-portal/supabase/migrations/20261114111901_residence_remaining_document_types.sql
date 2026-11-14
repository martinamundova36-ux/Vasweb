-- Extend the existing private document workflow; no documents or signatures are fabricated.
alter table public.residence_portal_files drop constraint residence_portal_files_kind_check;
alter table public.residence_portal_files add constraint residence_portal_files_kind_check check(kind in (
 'profile_photo','rules_template','gdpr_template','contract_draft','signed_contract','signed_rules','signed_gdpr','resident_document','fault_photo',
 'schedule_draft','signed_schedule','certificate_draft','signed_certificate'));
alter table public.residence_portal_files drop constraint valid_residence_file_owner;
alter table public.residence_portal_files add constraint valid_residence_file_owner check(
 (kind in ('rules_template','gdpr_template') and user_id is null and resident_id is null and review_status='not_applicable') or
 (kind in ('profile_photo','resident_document','contract_draft','fault_photo','schedule_draft','certificate_draft') and user_id is not null and resident_id is not null and review_status='not_applicable') or
 (kind in ('signed_contract','signed_rules','signed_gdpr','signed_schedule','signed_certificate') and user_id is not null and resident_id is not null and review_status in ('pending','approved','rejected')));
create policy residence_additional_documents_own_read on public.residence_portal_files for select to authenticated
using (private.has_role(tenant_id) and user_id=(select auth.uid()) and
 ((active and kind in ('schedule_draft','certificate_draft')) or kind in ('signed_schedule','signed_certificate')));
-- Server-only transaction: a document review, its audit and existing mail trigger commit together.
create or replace function public.residence_review_portal_file(
 p_actor uuid,p_tenant uuid,p_file uuid,p_status text,p_note text,p_expected_status text
) returns uuid language plpgsql security definer set search_path='' as $$
declare f public.residence_portal_files%rowtype;
begin
 if not private.residence_staff_actor(p_tenant,p_actor) then
  raise exception 'staff_only' using errcode='42501';
 end if;
 if p_status is null or p_status not in ('approved','rejected') or length(coalesce(p_note,''))>1000 then
  raise exception 'invalid_review' using errcode='22023';
 end if;
 if p_status='rejected' and length(trim(coalesce(p_note,'')))<3 then
  raise exception 'correction_reason_required' using errcode='22023';
 end if;
 select * into f from public.residence_portal_files where id=p_file and tenant_id=p_tenant for update;
 if not found or not f.active or f.kind not in ('signed_contract','signed_rules','signed_gdpr','signed_schedule','signed_certificate') then
  raise exception 'review_file_unavailable' using errcode='42501';
 end if;
 if f.review_status not in ('pending','rejected') or f.review_status is distinct from p_expected_status then
  raise exception 'review_conflict' using errcode='40001';
 end if;
 update public.residence_portal_files set review_status=p_status,staff_note=trim(coalesce(p_note,'')),
  reviewed_by=p_actor,reviewed_at=now() where id=f.id;
 insert into public.audit_logs(tenant_id,actor_id,action,entity,entity_id)
 values(p_tenant,p_actor,'PORTAL_FILE_REVIEWED_'||upper(p_status),'residence_portal_files',f.id::text);
 return f.id;
end $$;
revoke all on function public.residence_review_portal_file(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.residence_review_portal_file(uuid,uuid,uuid,text,text,text) to service_role;
