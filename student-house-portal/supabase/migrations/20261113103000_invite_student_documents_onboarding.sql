-- Complete onboarding requires the student's own questionnaire submission.
alter table public.resident_enquiries
  add column if not exists student_submitted_at timestamptz;

-- Personal unsigned contracts are uploaded only by reception; signed contracts
-- are uploaded only by the approved resident, then reviewed by reception.
alter table public.residence_portal_files
  drop constraint residence_portal_files_kind_check;
alter table public.residence_portal_files
  add constraint residence_portal_files_kind_check
  check (kind in (
    'profile_photo','rules_template','gdpr_template','contract_draft',
    'signed_contract','signed_rules','signed_gdpr','resident_document'
  ));
alter table public.residence_portal_files
  drop constraint valid_residence_file_owner;
alter table public.residence_portal_files
  add constraint valid_residence_file_owner
  check (
    (kind in ('rules_template','gdpr_template') and user_id is null and resident_id is null and review_status='not_applicable')
    or
    (kind in ('profile_photo','resident_document','contract_draft')
      and user_id is not null and resident_id is not null and review_status='not_applicable')
    or
    (kind in ('signed_contract','signed_rules','signed_gdpr')
      and user_id is not null and resident_id is not null and review_status in ('pending','approved','rejected'))
  );
drop policy if exists residence_files_read on public.residence_portal_files;
create policy residence_files_read on public.residence_portal_files
for select to authenticated
using (
  private.has_role(tenant_id) and
  (
    private.has_role(tenant_id,array['org_admin'::public.member_role,'reception'::public.member_role])
    or (active and kind in ('rules_template','gdpr_template'))
    or (user_id=(select auth.uid()) and kind in ('profile_photo','signed_contract','signed_rules','signed_gdpr'))
    or (user_id=(select auth.uid()) and active and kind in ('resident_document','contract_draft'))
  )
);
