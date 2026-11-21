# WEBU Residence – controlled removal of test people before production

**Scope:** the existing Supabase project `ydqchayscxntqdkzkynv`. This is an operations runbook, **not an automatic delete script**. The user confirmed that the current names and email addresses are test data. Do not assume the same about future signups.

## Before any destructive action

1. Complete end-to-end test with **synthetic** students, including two separate student sessions, staff, mobile photo, email receipts, confirmation, document approvals and payment schedule.
2. Export encrypted, access-controlled backups of the DB *and* private Storage objects and perform a recovery test. Never put backups in public GitHub, GitHub Actions artifacts, or public storage.
3. Confirm that the intended production/admin/reception account emails are real and accessible. If current staff email addresses are also temporary, transfer/verify real staff access before wiping test accounts.
4. Stop registration invitations, automatic mail dispatch and reminder jobs for the brief cutover window. Inspect `residence_mail_outbox` for queued messages.
5. Obtain two-person signoff: scope is **test residents and their records only**, never the whole Supabase project or organization. Record count of authorized deletes and a non-PII operation log.
6. Snapshot important settings: 64-room business register, active rooms, deposit rules, templates, payment bank configuration, organization settings and public-domain mappings. The table may have more physical room rows than the 64 business rooms; do not truncate it.

## Enumerate test data (no email addresses in report)

Use a read-only SQL report scoped to the verified Student House tenant:
- `organization_memberships` where `role='student'` and `active`
- `residents`, `tenancies`, `rent_charges`, `installment_plans`, `installment_items`
- `payments`, `payment_allocations`, `payment_reversals`
- `resident_enquiries`, `registration_enquiries`, `registration_requests`, `resident_enquiry_reviews`
- `resident_staff_details`, `residence_portal_files`, `documents`, `document_access`
- `notifications`, `service_requests`, `service_request_messages`, `cleaning_bookings`
- `room_register_cells` (test-written cells only), `residence_mail_outbox` (test-only queues), `audit_logs` (test-data references).
- `auth.users` for **only the verified student test user IDs**, not staff and not unknown accounts.
- Private Storage buckets `residence-portal-files` and `residence-private`: inventory test-owned objects, but **preserve official template documents**.

Because most foreign keys are NO ACTION, deleting `auth.users` or `residents` first will fail. Plan child-to-parent deletion with FK verification, plus Auth Admin API deletion of those verified test user IDs. Do not directly delete Storage metadata with SQL: delete objects through the Supabase Storage API so the underlying files are removed. Test cleanup must be **idempotent**, with failure reporting and resumable stages. Use a transaction for database deletion and check exact counts. Do not use CASCADE/TRUNCATE on organization or staff tables.

## Preserve

- Organization, domain verification, business settings, biller and bank configuration.
- 64-room operational structure and room attributes; clear only synthetic occupancy/notes.
- Staff/admin accounts after verifying their legitimate real email addresses and access.
- Official PDF templates, not trial uploads; restore signed template URLs if needed.
- SMTP setup, sender identity, GDPR notice, logging/monitoring setup.

## After wiping test data

- Validate **zero** test students, registrations, questionnaires, test photos, test signed files, test rent charges, test mail queue and test room notes.
- Validate **at least one** working real admin and one working real reception login.
- Validate rooms still match the approved managerial register and the five approved templates are active.
- Recheck RLS, account creation, URL routing, HTTPS and email bounce/spam monitoring.
- Record the exact timestamp and counts removed (never real student identifiers in GitHub).
- Turn on admissions and send real invitation emails **only after** production domain, correct sender and opt-in/legitimate contact list are approved.

## Mail launch gate

Recipients are supplied by Student House reception, not inferred from test data or mailbox conversations. Deduplicate and validate real recipients, use approved sender and legitimate outreach basis, avoid sending account credentials, throttle traffic to email provider limits, and store per-recipient delivery status securely in the administrative system.

**Status:** cleanup preparation only. **No deletion or invitation send is authorized by this document.**
