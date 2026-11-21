# WEBU Residence – launch readiness (21 November 2026)

This is the **existing** Student House Bratislava application. Do not create a second Supabase project, reset student records or change the approved Student House WordPress home page.

## Verified production-state snapshot (read-only audit)

- Source repository: `martinamundova36-ux/Vasweb`; portal at `student-house-portal/`.
- Supabase project: `ydqchayscxntqdkzkynv` – active, organization on Free plan.
- Public schema: 37 tables with RLS enabled. RLS policies must still be tested per role.
- Auth: 13 accounts; 10 active resident records at audit time.
- Storage: two **private** buckets (`residence-portal-files`, `residence-private`). The first had nine stored files, approximately 6.96 MB.
- Documents: only **one active PDF template** of the main required document templates was found; this is a blocker for the complete student onboarding workflow.
- Finance: only **one installment plan for ten active resident records** exists in `installment_plans` (other rent-charge rows exist separately). Verify whether every approved resident has the promised full-stay payment schedule before launch.
- Seven resident questionnaires currently exist; receipt/approval and propagation into profiles and documents must be tested end to end.
- Residence mail outbox: 46 messages marked `accepted` by SMTP, **not verified inbox delivery**.
- Security Advisor: three callable SECURITY DEFINER RPCs need role-isolation tests. Their current bodies contain authorization checks, so do not blindly revoke access; verify both authorized and unauthorized callers. Leaked-password protection is disabled.
- Database size at audit time: about 20 MB.

These counts are time-sensitive; rerun the audit before launch.

## Isolated static hosting build – prepared, not published

This branch adds `scripts/build-residence-pages.mjs` and `tests/residence-deployment.test.mjs`.
They produce a **browser-only** release and exclude the Supabase Edge Function source, SQL migrations, report files and Markdown documents.

Suggested Cloudflare Pages settings **after** ownership/connectivity is confirmed:
- Git repository: `martinamundova36-ux/Vasweb`
- Production branch: `main` **only after the release pull request is approved**.
- Build command: `node scripts/build-residence-pages.mjs`
- Build output directory: `.residence-pages-dist`
- Framework preset: None.
- Deployment will serve the portal at `/student-house-portal/` and redirect the root there.
- Do not copy or enter Supabase `service_role` keys, SMTP passwords, database credentials or private resident files into the public build.

This only prepares an artifact. It does not connect Cloudflare, switch DNS, or publish the portal.

## Must be completed before real students sign in

1. **Domain and hosting:** verify ownership and SSL for `portal.student-house.sk` or choose another approved HTTPS portal domain. Set up a *separate* Cloudflare Pages project for this isolated build. Do not overwrite the main WEBU or WordPress sites.
2. **Auth and redirects:** update hard-coded `https://www.webu.sk/student-house-portal/` password recovery links and the base URL in the residence-mail function for the approved new origin. Set Supabase Auth Site URL and approved redirect URLs; change the `PORTAL_ORIGIN` secret for `manage`. Verify `organization_domains` and its `verified_at` only after domain ownership verification. **Do not flip a URL or whitelist blindly.**
3. **Email:** confirm custom SMTP for Supabase Auth, which otherwise has very low email-send limits. Keep the separate residence-mail transport, but verify delivery to real test inboxes, including registration, invitation, password reset, questionnaire notification and payment reminder.
4. **Documents:** supply and activate all five approved document templates (contract, house rules, GDPR, accommodation confirmation and deposit-return application); verify data prefill, uploads, approval/rejection status, privacy and signed downloads.
5. **Registration and reception:** test registration on the first day of a month, durations 5/10/12 months, computed end date, actual arrival date, staff-only room number/room code/contract number/deposit/admin fee and the approval confirmation state.
6. **Student:** with a **synthetic test account** test login, full questionnaire, phone photo uploads (including common mobile formats), approval, profile activation, private downloads, payment schedule, QR, and internal cleaning.
7. **Permissions:** verify that student A cannot read or alter student B's profile, ID number, photo, contract, payments or documents, using separate authenticated test sessions. Reception must see only the authorized tenant. Test staff-only RPCs with student session.
8. **Backup:** Free Supabase has no downloadable managed backups. Establish an independent, encrypted, access-controlled, tested database-and-file backup/restore procedure. Avoid putting any personal-data backup into this public GitHub repository or a public CI artifact.
9. **Operations:** configure alerting, rate limiting and anti-abuse protections, audit logs, a restoration procedure, password security, legal notices/GDPR data retention, and a responsible staff contact.
10. **Go/no-go:** verify the application on Android and desktop, each language SK/EN/RU/UA, with a complete registration-to-document-to-payment walkthrough, and confirm every automated CI check is green **before** linking real students. Keep rollback available.

## Supabase links

- Project: https://supabase.com/dashboard/project/ydqchayscxntqdkzkynv
- Security Advisor: https://supabase.com/dashboard/project/ydqchayscxntqdkzkynv/database/security-advisor
- Auth SMTP: https://supabase.com/dashboard/project/ydqchayscxntqdkzkynv/auth/smtp
- Auth URL configuration: https://supabase.com/dashboard/project/ydqchayscxntqdkzkynv/auth/url-configuration

**Status: PREPARED FOR REVIEW, NOT PRODUCTION-APPROVED.** No migration or deploy is authorized solely by merging this readiness checklist.
